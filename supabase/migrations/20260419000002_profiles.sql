-- Phase 2 / Migration 002 — Profiles + Vereinsregeln + Storage Bucket
-- D-11: profiles table is Account-only; lokal-mode users persist via StorageAdapter (kein DB-Eintrag).
-- D-02: RLS auf allen Tabellen aktiv; auth.uid()-Policy mit WITH CHECK.
-- Referenz: public.tg_set_updated_at() wurde in Migration 001 (20260416000001_foundation.sql) definiert — nicht neu anlegen.

-- ────────────────────────────────────────────────────────────────
-- 1. profiles (Account-only: id = auth.users.id)
-- ────────────────────────────────────────────────────────────────
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  plz         text,
  klimazone   smallint check (klimazone between 1 and 7),
  archetype   text check (archetype in (
    'selbstversorger','familien_naschgarten','mix_ausgewogen',
    'zier_erholung','biodiversitaet','kraeuter_apotheker'
  )),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_own" on public.profiles
  for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.tg_set_updated_at();

-- ────────────────────────────────────────────────────────────────
-- 2. vereinsregeln (Account-mode: user-defined rules + BKleingG base rules)
-- ────────────────────────────────────────────────────────────────
create table public.vereinsregeln (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  source       text not null check (source in ('pdf_extraction','checklist','manual')),
  titel        text not null,
  beschreibung text,
  wert         numeric,        -- z.B. 120 (cm Hecke), 24 (m² Laube)
  einheit      text,           -- z.B. 'cm', 'm²'
  ist_bkleingg boolean not null default false,  -- BKleingG-Grundregel: nicht-löschbar
  aktiv        boolean not null default true,
  erstellt_am  timestamptz not null default now()
);

create index vereinsregeln_user_idx on public.vereinsregeln(user_id, aktiv);

alter table public.vereinsregeln enable row level security;

create policy "vereinsregeln_own" on public.vereinsregeln
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────────
-- 3. Storage bucket für PDF-/Foto-Uploads (Vereinsregeln-Extraktion)
-- ────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vereinsregeln', 'vereinsregeln', false, 10485760,
  array['application/pdf','image/jpeg','image/png','image/heic','image/webp']
)
on conflict (id) do nothing;

-- Storage-Policy: Pfad-Prefix == user_id (z.B. "<uid>/satzung.pdf")
create policy "vereinsregeln_storage_own" on storage.objects
  for all
  using (
    bucket_id = 'vereinsregeln'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'vereinsregeln'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
