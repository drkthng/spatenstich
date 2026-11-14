-- Phase 33 (SYNC3-04): changes reach the partner's device within seconds.
-- Adds the synced tables to the Realtime publication. Row level security still decides
-- who receives a change. Idempotent.

do $$
declare t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    raise notice 'publication supabase_realtime not found, skipped';
    return;
  end if;
  foreach t in array array[
    'gardens', 'profiles', 'garden_members', 'invite_codes', 'garden_dimensions',
    'plan_elements', 'imports', 'import_items', 'bed_drafts', 'plant_drafts',
    'observation_drafts'
  ] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
