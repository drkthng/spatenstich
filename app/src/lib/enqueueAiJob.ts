import { supabase } from './supabase';
import { QUEUES } from '@spatenstich/shared';
import type { Json } from '@spatenstich/shared';

/**
 * FOUND-07: Enqueue an AI job
 * Creates an audit row in `ai_jobs` AND sends a message to the pgmq `ai_jobs` queue.
 * Uses pgmq_public schema (Pitfall 3) — pgmq_public exposes pgmq functions via RPC
 * so that RLS and Supabase Dashboard integration work correctly.
 *
 * The Edge Function consumes the queue with service_role.
 * Client can only INSERT own jobs (RLS: ai_jobs_insert_own).
 */
export async function enqueueAiJob(input: {
  job_type: 'photo_analysis' | 'seed_extraction' | 'rules_extraction';
  data: unknown;
}) {
  const { data: user } = await supabase.auth.getUser();
  if (!user?.user) throw new Error('Not authenticated');

  // 1. Create audit row in ai_jobs (RLS enforces user_id = auth.uid())
  const { data: job, error: jobErr } = await supabase
    .from('ai_jobs')
    .insert({
      user_id: user.user.id,
      job_type: input.job_type,
      // Json type cast required: supabase-js typed payload as Json, not Record<string,unknown>
      payload: input.data as Json,
    })
    .select()
    .single();
  if (jobErr) throw jobErr;

  // 2. Enqueue message in pgmq via pgmq_public schema (FOUND-07, Pitfall 3)
  // pgmq_public is not in the generated Database type — use untyped client via `any` cast.
  // This is intentional: pgmq_public is an internal Supabase extension schema.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pgmqClient = (supabase as any).schema('pgmq_public');
  const { error: qErr } = await pgmqClient.rpc('send', {
    queue_name: QUEUES.AI_JOBS,
    message: { job_id: job.id, job_type: input.job_type, payload: input.data },
    sleep_seconds: 0,
  });
  if (qErr) throw qErr;

  return job;
}
