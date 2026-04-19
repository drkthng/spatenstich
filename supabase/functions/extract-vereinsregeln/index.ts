// supabase/functions/extract-vereinsregeln/index.ts
// RULES-01 — synchronous PDF -> Claude Files API -> structured Vereinsregeln extraction.
// D-07: NO pgmq queue; client awaits the response (55s client timeout in extractVereinsregeln.ts).
// FOUND-06: CLAUDE_API_KEY only via Deno.env, never bundled to client.
// T-2-03-01: path-prefix guard enforces per-user isolation even though SERVICE_ROLE
//            bypasses RLS on the storage download.
// T-2-03-04: no CLAUDE_API_KEY in error messages or log lines.
// T-2-03-09: storagePath must start with userId/ (defense against path traversal).
// Pattern source: supabase/functions/ai-job-consumer/index.ts (Phase 01-03).
// No pgmq schema cast (any-cast) required — this function does not touch pgmq_public.
// deno-lint-ignore-file
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { corsHeaders } from '../_shared/cors.ts';
import { EXTRACTION_PROMPT, parseRules } from './parseRules.ts';

const ANTHROPIC_BETA = 'files-api-2025-04-14';

// FOUND-06: All secrets only via Deno.env. Never fall back to literal values.
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const CLAUDE_KEY = Deno.env.get('CLAUDE_API_KEY')!;

if (!SUPABASE_URL || !SERVICE_ROLE || !CLAUDE_KEY) {
  throw new Error(
    'Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or CLAUDE_API_KEY',
  );
}

const anthropic = new Anthropic({ apiKey: CLAUDE_KEY });
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

Deno.serve(async (req) => {
  // CORS preflight for browser invocation from Expo Web
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const storagePath = typeof body?.storagePath === 'string'
      ? body.storagePath
      : '';
    const userId = typeof body?.userId === 'string' ? body.userId : '';

    if (!storagePath) {
      return json({ error: 'storagePath required' }, 400);
    }
    if (!userId) {
      return json({ error: 'userId required' }, 400);
    }
    // Defense-in-depth: enforce path-prefix matches userId.
    // Even though SERVICE_ROLE bypasses RLS, we keep tenant isolation explicit.
    if (!storagePath.startsWith(`${userId}/`)) {
      return json({ error: 'forbidden' }, 403);
    }

    // 1. Download PDF from Supabase Storage (vereinsregeln bucket from Migration 002)
    const { data: fileData, error: dlErr } = await supabase
      .storage
      .from('vereinsregeln')
      .download(storagePath);
    if (dlErr || !fileData) {
      // Error message comes from Supabase SDK only — never substitute secrets.
      return json({ error: dlErr?.message ?? 'download_failed' }, 400);
    }

    // 2. Upload to Anthropic Files API (beta)
    const buffer = await fileData.arrayBuffer();
    const filename = storagePath.split('/').pop() ?? 'satzung.pdf';
    const lower = filename.toLowerCase();
    const mimeType = lower.endsWith('.pdf')
      ? 'application/pdf'
      : lower.endsWith('.png')
      ? 'image/png'
      : 'image/jpeg';
    const uploaded = await anthropic.beta.files.upload(
      { file: new File([buffer], filename, { type: mimeType }) },
      { headers: { 'anthropic-beta': ANTHROPIC_BETA } },
    );

    // 3. Claude extraction with structured prompt
    let response;
    try {
      response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: EXTRACTION_PROMPT },
              // @ts-ignore — Files API document block shape is not yet in public SDK types
              { type: 'document', source: { type: 'file', file_id: uploaded.id } },
            ],
          },
        ],
      });
    } finally {
      // 4. Always attempt deletion of the uploaded Anthropic file (non-fatal on failure)
      //    SDK 0.90.0 signature: delete(fileID, params?, options?) —
      //    headers belong in options (3rd arg), not params (2nd arg).
      await anthropic.beta.files
        .delete(uploaded.id, undefined, {
          headers: { 'anthropic-beta': ANTHROPIC_BETA },
        })
        .catch((e: unknown) => console.warn('files.delete failed', e));
    }

    // 5. Parse model output -> typed candidates
    const text = response.content
      .filter((c: { type: string }) => c.type === 'text')
      .map((c: { type: string; text?: string }) => c.text ?? '')
      .join('\n');
    const rules = parseRules(text);
    return json({ rules }, 200);
  } catch (err) {
    console.error('extract-vereinsregeln failed', err);
    const message = err instanceof Error ? err.message : 'internal_error';
    return json({ error: message }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  });
}
