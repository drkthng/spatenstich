// deno-lint-ignore-file
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.103.2';

// FOUND-06: Alle Secrets ausschließlich aus Deno.env. Kein Fallback.
// T-3-01/T-3-02: CLAUDE_API_KEY und SERVICE_ROLE_KEY dürfen NIEMALS im Client-Bundle landen.
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const CLAUDE_KEY = Deno.env.get('CLAUDE_API_KEY'); // Phase 1: optional, Phase 4: required

if (!SUPABASE_URL || !SERVICE_ROLE) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

interface PgmqMessage {
  msg_id: number;
  read_ct: number;
  vt: string;
  enqueued_at: string;
  message: { job_id: string; job_type: string; payload: unknown };
}

Deno.serve(async (_req) => {
  const { data: messages, error: readErr } = await supabase
    .schema('pgmq_public')
    .rpc('read', { queue_name: 'ai_jobs', sleep_seconds: 30, n: 5 });

  if (readErr) {
    return new Response(JSON.stringify({ error: readErr.message }), { status: 500 });
  }
  if (!messages || (messages as PgmqMessage[]).length === 0) {
    return new Response(JSON.stringify({ processed: 0 }), { status: 200 });
  }

  const processedIds: number[] = [];
  for (const msg of messages as PgmqMessage[]) {
    try {
      // 1. Job-Row laden (Audit)
      const { data: job, error: jobErr } = await supabase
        .from('ai_jobs').select('user_id').eq('id', msg.message.job_id).single();
      if (jobErr || !job) throw new Error(`Job lookup failed: ${jobErr?.message}`);

      // 2. Phase 1: Mock-Response. Phase 4 tauscht diesen Block gegen echten Claude-Call.
      // T-3-03: Payload-Validierung via Zod MUSS vor dem Claude-Prompt in Phase 4 erfolgen.
      const rawResponse = CLAUDE_KEY
        ? { _phase1_placeholder: true, note: 'Claude call not yet wired' }
        : { _phase1_placeholder: true, note: 'CLAUDE_API_KEY not set — mock only' };

      // 3. Persist in ai_results (FOUND-08)
      await supabase.from('ai_results').insert({
        user_id: job.user_id,
        job_id: msg.message.job_id,
        raw_response: rawResponse,
        parsed_result: null,
        model_used: 'mock-phase1',
        latency_ms: 0,
      });

      // 4. Job-Status aktualisieren
      await supabase.from('ai_jobs').update({ status: 'done' }).eq('id', msg.message.job_id);

      // 5. Message archivieren (Audit-Trail — T-3-05)
      await supabase.schema('pgmq_public').rpc('archive', {
        queue_name: 'ai_jobs',
        msg_id: msg.msg_id,
      });
      processedIds.push(msg.msg_id);
    } catch (err) {
      console.error(`Job ${msg.message.job_id} failed:`, err);
      await supabase.from('ai_jobs').update({
        status: 'failed', last_error: (err as Error).message,
      }).eq('id', msg.message.job_id);
      // Message bleibt in Queue (visibility timeout = retry, T-3-04)
    }
  }

  return new Response(JSON.stringify({ processed: processedIds.length, ids: processedIds }), {
    status: 200, headers: { 'content-type': 'application/json' },
  });
});
