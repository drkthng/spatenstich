// supabase/functions/ai-job-consumer/index.ts
// PHOTO-04 — Production Claude Vision integration for garden photo analysis.
// Replaces Phase 1 mock with real Claude Vision API call via Anthropic Files API.
//
// Flow: pgmq message → budget check → download photos from Storage →
//       upload to Anthropic Files API → Claude Vision call → parse elements →
//       persist in ai_results → update ai_jobs status → cleanup Files API.
//
// FOUND-06: CLAUDE_API_KEY only via Deno.env, never bundled to client.
// T-2-03-04: CLAUDE_API_KEY NEVER in error messages or log lines.
// T-3-01/T-3-02: All secrets exclusively from Deno.env.
// NFR-03: Hard limit 200/day per garden, soft limit 50/day (budget warning flag).
// deno-lint-ignore-file
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { corsHeaders } from '../_shared/cors.ts';
import { parseElements, buildAnalysisPrompt } from './parseElements.ts';

const ANTHROPIC_BETA = 'files-api-2025-04-14';

// FOUND-06: All secrets only via Deno.env. Never fall back to literal values.
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const CLAUDE_KEY = Deno.env.get('CLAUDE_API_KEY')!;

if (!SUPABASE_URL || !SERVICE_ROLE || !CLAUDE_KEY) {
  throw new Error('Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or CLAUDE_API_KEY');
}

const anthropic = new Anthropic({ apiKey: CLAUDE_KEY });
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

// NFR-03: Budget limits per garden per day
const HARD_LIMIT = 200;
const SOFT_LIMIT = 50;

interface PgmqMessage {
  msg_id: number;
  read_ct: number;
  vt: string;
  enqueued_at: string;
  message: { job_id: string; job_type: string; payload: unknown };
}

interface PhotoAnalysisPayload {
  storage_paths: string[];
  dimensions: { width_m: number; height_m: number; shape: string };
}

Deno.serve(async (_req) => {
  const { data: messages, error: readErr } = await supabase
    .schema('pgmq_public')
    .rpc('read', { queue_name: 'ai_jobs', sleep_seconds: 30, n: 5 });

  if (readErr) {
    return new Response(JSON.stringify({ error: readErr.message }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
  if (!messages || (messages as PgmqMessage[]).length === 0) {
    return new Response(JSON.stringify({ processed: 0 }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }

  const processedIds: number[] = [];
  for (const msg of messages as PgmqMessage[]) {
    // Track uploaded file IDs for cleanup in finally block
    const uploadedFileIds: string[] = [];

    try {
      // Skip non-photo-analysis jobs (archive and continue)
      if (msg.message.job_type !== 'photo_analysis') {
        await supabase.schema('pgmq_public').rpc('archive', {
          queue_name: 'ai_jobs',
          msg_id: msg.msg_id,
        });
        processedIds.push(msg.msg_id);
        continue;
      }

      // 1. Load job row — CRITICAL: use created_by_user_id (Migration 007 rename, Pitfall 2)
      const { data: job, error: jobErr } = await supabase
        .from('ai_jobs')
        .select('created_by_user_id, garden_id, payload')
        .eq('id', msg.message.job_id)
        .single();
      if (jobErr || !job) throw new Error(`Job lookup failed: ${jobErr?.message}`);

      // 2. Budget check (NFR-03): count today's jobs for this garden
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const { count } = await supabase
        .from('ai_jobs')
        .select('*', { count: 'exact', head: true })
        .eq('garden_id', job.garden_id)
        .gte('created_at', startOfToday.toISOString());

      if ((count ?? 0) >= HARD_LIMIT) {
        await supabase.from('ai_jobs').update({
          status: 'failed',
          last_error: 'daily_limit_exceeded',
        }).eq('id', msg.message.job_id);
        // Archive message and continue
        await supabase.schema('pgmq_public').rpc('archive', {
          queue_name: 'ai_jobs',
          msg_id: msg.msg_id,
        });
        processedIds.push(msg.msg_id);
        continue;
      }

      // 3. Extract payload
      const payload = job.payload as PhotoAnalysisPayload;
      if (!payload?.storage_paths?.length || !payload?.dimensions) {
        throw new Error('Invalid payload: missing storage_paths or dimensions');
      }

      // 4. Download photos from Supabase Storage
      const photoBuffers: { buffer: ArrayBuffer; filename: string }[] = [];
      for (const storagePath of payload.storage_paths) {
        const { data: fileData, error: dlErr } = await supabase
          .storage
          .from('photos')
          .download(storagePath);
        if (dlErr || !fileData) {
          throw new Error(`Photo download failed for ${storagePath}: ${dlErr?.message}`);
        }
        const buffer = await fileData.arrayBuffer();
        const filename = storagePath.split('/').pop() ?? 'photo.jpg';
        photoBuffers.push({ buffer, filename });
      }

      // 5. Upload to Anthropic Files API
      for (const { buffer, filename } of photoBuffers) {
        const uploaded = await anthropic.beta.files.upload(
          { file: new File([buffer], filename, { type: 'image/jpeg' }) },
          { headers: { 'anthropic-beta': ANTHROPIC_BETA } },
        );
        uploadedFileIds.push(uploaded.id);
      }

      // 6. Claude Vision Call — images FIRST, then text (Claude Vision Docs recommendation)
      const startMs = Date.now();
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: [
            // Images first (recommended by Claude Vision docs for best results)
            ...uploadedFileIds.map((fileId) => ({
              type: 'image' as const,
              source: { type: 'file' as const, file_id: fileId },
            })),
            { type: 'text' as const, text: buildAnalysisPrompt(payload.dimensions) },
          ],
        }],
      });
      const latencyMs = Date.now() - startMs;

      // 7. Parse response
      const text = response.content
        .filter((c: { type: string }) => c.type === 'text')
        .map((c: { type: string; text?: string }) => c.text ?? '')
        .join('\n');
      const elements = parseElements(text);

      // 8. Persist in ai_results (FOUND-08) — user_id is NOT NULL (Pitfall 3)
      const budgetWarning = (count ?? 0) >= SOFT_LIMIT;
      await supabase.from('ai_results').insert({
        user_id: job.created_by_user_id,
        job_id: msg.message.job_id,
        raw_response: response,
        parsed_result: { elements, _budget_warning: budgetWarning },
        model_used: 'claude-sonnet-4-6',
        latency_ms: latencyMs,
      });

      // 9. Update job status
      await supabase.from('ai_jobs').update({ status: 'done' }).eq('id', msg.message.job_id);

      // 10. Archive pgmq message (Audit-Trail — T-3-05)
      await supabase.schema('pgmq_public').rpc('archive', {
        queue_name: 'ai_jobs',
        msg_id: msg.msg_id,
      });
      processedIds.push(msg.msg_id);
    } catch (err) {
      // T-2-03-04: Never include CLAUDE_API_KEY in error messages or log lines
      const message = err instanceof Error ? err.message : 'internal_error';
      console.error(`Job ${msg.message.job_id} failed:`, message);
      await supabase.from('ai_jobs').update({
        status: 'failed',
        last_error: message,
      }).eq('id', msg.message.job_id);
      // Message stays in queue on failure (visibility timeout = retry, T-3-04)
    } finally {
      // 11. Files API cleanup (Pitfall 6): delete ALL uploaded files regardless of success/failure
      for (const fileId of uploadedFileIds) {
        await anthropic.beta.files
          .delete(fileId, undefined, {
            headers: { 'anthropic-beta': ANTHROPIC_BETA },
          })
          .catch((e: unknown) => console.warn('files.delete failed', e));
      }
    }
  }

  return new Response(JSON.stringify({ processed: processedIds.length, ids: processedIds }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
});
