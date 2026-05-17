# seed-plants Edge Function

**Phase:** 8 — Plant-DB Foundation
**Created:** 2026-05-17 (first post-M07 Edge Function)

Idempotent seed of `plants` + `plant_companions` from `packages/shared/src/data/plants.json` (bundled via `static_files` in `supabase/config.toml`).

---

## Bundle-Drift Workflow (Pitfall 6 mitigation)

Every change to `packages/shared/src/data/plants.json` requires a **re-deploy** of this Edge Function so its bundled copy stays in sync with the app bundle. The canonical workflow:

1. **Edit** `packages/shared/src/data/plants.json` (add plant, fix companion, etc.).
2. **Smoke test must be green:**
   ```bash
   pnpm --filter @spatenstich/shared exec jest plants
   ```
   If red → fix the JSON and re-run.
3. **Commit + push to git:**
   ```bash
   git add packages/shared/src/data/plants.json
   git commit -m "data(plants): add <slug>"
   git push
   ```
4. **Re-deploy the Edge Function** (the bundle is re-built at deploy time):
   ```bash
   supabase functions deploy seed-plants --debug
   ```
   The `--debug` flag prints the bundle manifest; verify `plants.json` appears in the output. **Docker Desktop must be running** on Windows for `static_files` bundling to work correctly (RESEARCH Pitfall 1).
5. **Trigger the seed**:
   ```bash
   curl -X POST https://vitrqkzxkiqvadqfzrcx.supabase.co/functions/v1/seed-plants \
     -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
     -H "Content-Type: application/json"
   ```
   Expected response:
   ```json
   { "ok": true, "plantsCount": <N>, "companionsCount": <M>, "schemaVersion": "plant-db.v1" }
   ```
6. **Verify counts match:**
   ```bash
   # Via Supabase Studio SQL editor or supabase db query
   SELECT count(*) FROM plants;
   SELECT count(*) FROM plant_companions;
   ```
   Counts MUST equal the response's `plantsCount` and `companionsCount`.

---

## Idempotency

Re-running the function produces identical state:

- `plants` rows: UPSERT on `slug` — existing rows updated, new rows inserted, no rows removed (unless you also remove from JSON; see Slug Rename below).
- `plant_companions` rows: DELETE then INSERT — final state is exactly `bundle.companions` mapped through slug-resolution.

---

## Known Limitation: Slug Rename (Pitfall 4)

Renaming a plant's slug (e.g., `tomate` → `tomate-fleisch`) creates an ORPHAN — the upsert sees a "new" plant. The old slug's row remains in DB; companions still point at the old id.

**Manual cleanup required:** Run via Supabase Studio SQL editor:
```sql
-- Identify orphan slugs:
SELECT slug FROM plants WHERE slug NOT IN (
  -- Paste current slugs from JSON, e.g. ('tomate', 'busch-bohne', ...)
);

-- Manually delete orphans:
DELETE FROM plants WHERE slug IN ('<old-slug>');
-- ON DELETE CASCADE removes the related plant_companions rows.
```

Do not script this automatically — accidental DELETE of an in-use slug would CASCADE to plan_elements references via importedFrom in future phases.

---

## Authentication

The function is `verify_jwt = false` (see `supabase/config.toml [functions.seed-plants]`). It runs with `service_role` privileges via the `SUPABASE_SERVICE_ROLE_KEY` env var, which bypasses RLS by design. The function is only callable with the service-role key, which only Dirk has — there is no public risk.

Optional: set `SEED_PLANTS_TRIGGER_TOKEN` env var on the function and include `{"token":"<value>"}` in the POST body for an additional guard (commented-out path in current `index.ts`).

---

## Project ref

`vitrqkzxkiqvadqfzrcx` (Frankfurt, EU). Display this in all CLI outputs for trace (MEMORY: feedback_show_project_id.md).

---

*Pattern source: git history `cde46bb` `extract-vereinsregeln/index.ts` (deleted in M07 cleanup `0831320`). Function structure preserved; AI-specific logic replaced with idempotent seed logic.*
