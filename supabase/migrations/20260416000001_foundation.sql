-- Phase 1 / Migration 001 — Foundation Tables
-- D-01: NUR feature_flags, ai_jobs, ai_results. Andere Tabellen in späteren Phasen.
-- D-02: RLS auf allen Tabellen aktiv; user_id FK + auth.uid()-Policy.

-- ────────────────────────────────────────────────────────────────
-- 1. feature_flags
-- ────────────────────────────────────────────────────────────────
create table public.feature_flags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade, -- NULL = global flag (A5 assumption)
  flag_key text not null,
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, flag_key)
);
create index feature_flags_key_idx on public.feature_flags(flag_key);

alter table public.feature_flags enable row level security;

create policy "feature_flags_read_own_and_global" on public.feature_flags
  for select using (auth.uid() = user_id or user_id is null);
-- Client darf KEINE Flags schreiben/ändern — nur service_role via Dashboard/CI.
create policy "feature_flags_service_insert" on public.feature_flags
  for insert with check (auth.role() = 'service_role');
create policy "feature_flags_service_update" on public.feature_flags
  for update using (auth.role() = 'service_role');

-- ────────────────────────────────────────────────────────────────
-- 2. ai_jobs (Tracking — pgmq ist die Queue, diese Tabelle ist Audit)
-- ────────────────────────────────────────────────────────────────
create table public.ai_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_type text not null,                          -- 'photo_analysis' | 'seed_extraction' | 'rules_extraction'
  status text not null default 'queued' check (status in ('queued','processing','done','failed')),
  payload jsonb not null default '{}'::jsonb,
  pgmq_msg_id bigint,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ai_jobs_user_status_idx on public.ai_jobs(user_id, status);

alter table public.ai_jobs enable row level security;

create policy "ai_jobs_read_own" on public.ai_jobs
  for select using (auth.uid() = user_id);
create policy "ai_jobs_insert_own" on public.ai_jobs
  for insert with check (auth.uid() = user_id);
create policy "ai_jobs_update_service" on public.ai_jobs
  for update using (auth.role() = 'service_role');

-- ────────────────────────────────────────────────────────────────
-- 3. ai_results (FOUND-08: raw + parsed vollständig persistiert)
-- ────────────────────────────────────────────────────────────────
create table public.ai_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.ai_jobs(id) on delete cascade,
  raw_response jsonb not null,
  parsed_result jsonb,
  model_used text,
  latency_ms integer,
  created_at timestamptz not null default now()
);
create index ai_results_user_idx on public.ai_results(user_id, created_at desc);
create index ai_results_job_idx on public.ai_results(job_id);

alter table public.ai_results enable row level security;

create policy "ai_results_read_own" on public.ai_results
  for select using (auth.uid() = user_id);
create policy "ai_results_insert_service" on public.ai_results
  for insert with check (auth.role() = 'service_role');

-- ────────────────────────────────────────────────────────────────
-- pgmq-Queue für asynchrone KI-Jobs (FOUND-07)
-- pgmq Extension wird via Dashboard aktiviert (Task 1-02-01).
-- Queue erstellen (idempotent):
-- ────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (
    select 1 from pgmq.meta where queue_name = 'ai_jobs'
  ) then
    perform pgmq.create('ai_jobs');
  end if;
end $$;

-- updated_at-Trigger (DRY)
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger feature_flags_updated_at before update on public.feature_flags
  for each row execute function public.tg_set_updated_at();
create trigger ai_jobs_updated_at before update on public.ai_jobs
  for each row execute function public.tg_set_updated_at();
