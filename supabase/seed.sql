-- Seed: Setzt example_flag als globalen Flag (user_id NULL) auf false.
-- FOUND-04 Akzeptanzprobe: useFlag('example_flag') muss initial false liefern.
insert into public.feature_flags(user_id, flag_key, enabled)
values (null, 'example_flag', false)
on conflict (user_id, flag_key) do nothing;
