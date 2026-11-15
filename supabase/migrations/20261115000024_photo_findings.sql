-- Phase 35 (PHOTO-03..PHOTO-11): findings of a photo check, and plants a garden adds
-- to the catalog.
--
-- photo_findings: what a photo check found. A finding is a proposal; nothing in the plan
-- or the catalog changes until a member accepts it. The photo itself is never stored,
-- here or anywhere else.
-- garden_plants: catalog entries that belong to one garden (accepted from a finding, or
-- edited afterwards). The shared catalog (plants) stays read-only.
--
-- Both tables are synced like the other garden tables: edit time in updated_at, server
-- stamp in server_updated_at, an older edit is refused (P9011), members only.
-- Idempotent.

create table if not exists public.photo_findings (
  id                  uuid primary key default gen_random_uuid(),
  garden_id           uuid not null references public.gardens(id) on delete cascade,
  check_id            uuid not null,
  kind                text not null check (kind in (
                        'resize', 'move', 'rename', 'remove', 'add_element', 'add_plant',
                        'catalog_plant', 'pest', 'disease', 'stage', 'unclear')),
  target_element_id   uuid,
  title               text not null check (char_length(title) between 1 and 200),
  detail              text not null default '' check (char_length(detail) <= 2000),
  proposal            jsonb not null default '{}'::jsonb,
  confidence          double precision not null default 0 check (confidence >= 0 and confidence <= 1),
  closeup_of          text check (closeup_of is null or char_length(closeup_of) <= 300),
  status              text not null default 'open' check (status in ('open', 'accepted', 'dismissed')),
  resolved_at         timestamptz,
  task_requested      boolean not null default false,
  created_by_user_id  uuid references auth.users(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  updated_by_user_id  uuid references auth.users(id),
  deleted_at          timestamptz,
  server_updated_at   timestamptz not null default clock_timestamp()
);

create index if not exists idx_photo_findings_cursor
  on public.photo_findings (garden_id, server_updated_at, id);

create table if not exists public.garden_plants (
  id                    uuid primary key default gen_random_uuid(),
  garden_id             uuid not null references public.gardens(id) on delete cascade,
  slug                  text not null check (slug ~ '^[a-z0-9][a-z0-9-]{0,79}$'),
  name_de               text not null check (char_length(name_de) between 1 and 80),
  name_botanical        text check (name_botanical is null or char_length(name_botanical) <= 120),
  family                text not null default '' check (char_length(family) <= 80),
  category              text not null default 'Gemüse'
                          check (category in ('Gemüse', 'Kraut', 'Beere', 'Obstbaum', 'Blume')),
  min_spacing_cm        integer check (min_spacing_cm is null or min_spacing_cm between 1 and 1000),
  sow_outdoor_doy_start integer check (sow_outdoor_doy_start is null or sow_outdoor_doy_start between 1 and 366),
  sow_outdoor_doy_end   integer check (sow_outdoor_doy_end is null or sow_outdoor_doy_end between 1 and 366),
  plant_doy_start       integer check (plant_doy_start is null or plant_doy_start between 1 and 366),
  plant_doy_end         integer check (plant_doy_end is null or plant_doy_end between 1 and 366),
  harvest_doy_start     integer check (harvest_doy_start is null or harvest_doy_start between 1 and 366),
  harvest_doy_end       integer check (harvest_doy_end is null or harvest_doy_end between 1 and 366),
  notes_de              text check (notes_de is null or char_length(notes_de) <= 2000),
  source                text not null default 'photo' check (source in ('photo', 'manual')),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  updated_by_user_id    uuid references auth.users(id),
  deleted_at            timestamptz,
  server_updated_at     timestamptz not null default clock_timestamp()
);

create index if not exists idx_garden_plants_cursor
  on public.garden_plants (garden_id, server_updated_at, id);
-- One entry per name in a garden; a deleted entry frees its name.
create unique index if not exists uq_garden_plants_slug
  on public.garden_plants (garden_id, slug) where deleted_at is null;

alter table public.photo_findings enable row level security;
alter table public.garden_plants enable row level security;

do $$
declare t text;
begin
  foreach t in array array['photo_findings', 'garden_plants'] loop
    execute format('drop policy if exists %I on public.%I', t || '_member_all', t);
    execute format(
      'create policy %I on public.%I for all to authenticated
         using (public.is_garden_member(garden_id))
         with check (public.is_garden_member(garden_id))', t || '_member_all', t);

    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);

    execute format('drop trigger if exists aa_lww_guard_%s on public.%I', t, t);
    execute format(
      'create trigger aa_lww_guard_%s before update on public.%I
         for each row execute function public.tg_lww_guard()', t, t);

    execute format('drop trigger if exists zy_set_server_updated_at_%s on public.%I', t, t);
    execute format(
      'create trigger zy_set_server_updated_at_%s before insert or update on public.%I
         for each row execute function public.tg_set_server_updated_at()', t, t);

    execute format('drop trigger if exists zz_set_updated_at_%s on public.%I', t, t);
    execute format(
      'create trigger zz_set_updated_at_%s before insert or update on public.%I
         for each row execute function public.tg_set_updated_at()', t, t);
  end loop;
end $$;

-- Open findings reach the partner within seconds.
do $$
declare t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    raise notice 'publication supabase_realtime not found, skipped';
    return;
  end if;
  foreach t in array array['photo_findings', 'garden_plants'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

do $$
begin
  if (select count(*) from pg_policies
      where schemaname = 'public'
        and policyname in ('photo_findings_member_all', 'garden_plants_member_all')) <> 2 then
    raise exception 'migration_024_invariant: member policies missing';
  end if;
  if (select count(*) from pg_trigger
      where not tgisinternal
        and tgrelid in ('public.photo_findings'::regclass, 'public.garden_plants'::regclass)) <> 6 then
    raise exception 'migration_024_invariant: expected 6 triggers on the two tables';
  end if;
  raise notice 'migration_024 ok: photo_findings + garden_plants';
end $$;
