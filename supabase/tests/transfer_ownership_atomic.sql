-- Phase 2.5 D-16 Test — transfer_ownership atomic role swap (Plan 02.5-02)
-- Ausführung: supabase db query -f supabase/tests/transfer_ownership_atomic.sql --linked
-- Erwartet: 3× NOTICE 'transfer_ownership_atomic ok (...)'
--
-- Setup-Phase als superuser; Assertion als authenticated User A.
-- Nach transfer_ownership(ga_id, B):
--   - A (vormals owner) hat jetzt role = 'member'
--   - B (vormals member) hat jetzt role = 'owner'
--   - Genau 1 Owner im Garten (kein doppelter Owner, kein Owner-Verlust)

BEGIN;
  -- Profiles als superuser
  insert into public.profiles(id, display_name)
    values ('b9667f2a-7e86-497b-9cff-3ae320c7ff2c'::uuid, 'user_a')
    on conflict (id) do nothing;
  insert into public.profiles(id, display_name)
    values ('d5fc0937-5e49-4fb5-9740-9940f075fab2'::uuid, 'user_b')
    on conflict (id) do nothing;

  -- Garten via RPC (User A)
  select set_config('request.jwt.claim.sub', 'b9667f2a-7e86-497b-9cff-3ae320c7ff2c', true);
  select set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;

  do $$
  declare ga_id uuid;
  begin
    ga_id := public.ensure_default_garden_for_user();
    perform set_config('test.ga_id', ga_id::text, true);
  end $$;

  reset role;

  -- User B als Member (superuser direct-insert)
  do $$
  declare ga_id uuid;
  begin
    ga_id := current_setting('test.ga_id')::uuid;
    insert into public.garden_members(garden_id, user_id, role)
      values (ga_id, 'd5fc0937-5e49-4fb5-9740-9940f075fab2'::uuid, 'member');
  end $$;

  -- Zurück als Owner A für transfer_ownership-Call
  set local role authenticated;

  do $$
  declare
    ga_id uuid;
    role_a text;
    role_b text;
    owner_count int;
  begin
    ga_id := current_setting('test.ga_id')::uuid;

    -- Transfer Ownership A → B
    perform public.transfer_ownership(ga_id, 'd5fc0937-5e49-4fb5-9740-9940f075fab2'::uuid);

    -- Assert: A ist jetzt member
    select role into role_a from public.garden_members
      where garden_id = ga_id and user_id = 'b9667f2a-7e86-497b-9cff-3ae320c7ff2c'::uuid;
    if role_a <> 'member' then
      raise exception 'transfer_ownership_atomic_failed: A role=%, expected member', role_a;
    end if;
    raise notice 'transfer_ownership_atomic ok (A demoted): role=%', role_a;

    -- Assert: B ist jetzt owner
    select role into role_b from public.garden_members
      where garden_id = ga_id and user_id = 'd5fc0937-5e49-4fb5-9740-9940f075fab2'::uuid;
    if role_b <> 'owner' then
      raise exception 'transfer_ownership_atomic_failed: B role=%, expected owner', role_b;
    end if;
    raise notice 'transfer_ownership_atomic ok (B promoted): role=%', role_b;

    -- Assert: exactly one owner in garden
    select count(*) into owner_count from public.garden_members
      where garden_id = ga_id and role = 'owner';
    if owner_count <> 1 then
      raise exception 'transfer_ownership_atomic_failed: owner_count=%, expected 1', owner_count;
    end if;
    raise notice 'transfer_ownership_atomic ok (exactly 1 owner): count=%', owner_count;
  end $$;
ROLLBACK;
