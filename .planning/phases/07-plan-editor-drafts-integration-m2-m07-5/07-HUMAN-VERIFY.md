---
phase: 07-plan-editor-drafts-integration-m2-m07-5
plan: 06
type: human-verify
requirements_covered: [EDIT-09, EDIT-12, DRAFT-02, DRAFT-03]
status: pending
created: 2026-05-13
---

# Phase 7 — Human-Verify Manual Smoke Checklist

> Four behaviors that CI cannot prove. To be run by Dirk on his iPhone (or in the iOS Simulator if good enough). Each section ends with a pass/fail reply line for `/gsd-verify-work` to log.
>
> Project Supabase ref: `vitrqkzxkiqvadqfzrcx` (Frankfurt) — visible in the bottom of the iOS app's debug overlay if enabled.

---

## Section 1 — Performance Smoke — 60fps @ 200 Elementen (EDIT-12)

**What this verifies:** The Skia canvas + composed gestures hold 60 fps median while panning/pinching a 200-element garden on a real iPhone.

**Setup:**
1. Build a dev client on iPhone:
   - Option A (preferred): `pnpm --filter app exec eas build --profile development --platform ios` and install via TestFlight.
   - Option B (faster, dev-only): `pnpm --filter app exec expo run:ios --device` if the user has a Mac + Xcode set up.
2. Seed the garden with 200 mixed elements. Two routes:
   - **Route A (manual seed script — preferred):** Run `pnpm --filter app exec ts-node scripts/seed-200.ts` (script TBD; place in `app/scripts/seed-200.ts` if not yet present — Phase 8 may formalize). Generates: 5 beds (Beet), 180 plants (Pflanze) inside the beds, 15 infrastructure items (3 Weg, 2 Laube, 2 Zaun, 4 Baum, 2 Kompost, 1 Wasserstelle, 1 Sitzplatz).
   - **Route B (manual UI placement — fallback):** Place ~200 items by hand via the Element-Palette. Tedious but works if the seed script is not yet implemented.
3. Open the editor (Home → "Plan öffnen").
4. (Optional) Enable in-app FPS overlay if implemented; alternatively connect Xcode Instruments → Time Profiler trace.

**Steps:**
1. Pan the canvas continuously for 30 seconds (swipe left/right/up/down without lifting finger).
2. Pinch-to-zoom in and out for another 30 seconds.
3. Tap an element to select it, drag to move (gestureActive bypass should prevent autosave during drag).

**Expected:**
- Median frame rate ≥ 58 fps across the 60-second pan/pinch session (target: 60 fps; ≥ 58 is "no visible jank" per Apple HIG).
- No frame longer than 33 ms (= no skipped frames at 60 Hz).
- Skia worklet does not show JS-thread blocking warnings in console.

**Fail signals:**
- FPS drops below 50 during pan/pinch → investigate Pitfall-6 (inner-group transforms instead of single outer Group transform) or Pitfall-12 (Pan onUpdate writes to JS state instead of shared values).
- Console shows "JS thread blocked > 100 ms" → setState slipped into a worklet (Pattern 9 anti-pattern).

**Trace artifact:** Save the Xcode Instruments trace as `.planning/phases/07-plan-editor-drafts-integration-m2-m07-5/instruments-trace-200el.trace` (or `.zip` if the directory is unwieldy). Optional but strongly recommended for retrospective.

**Pass criterion:** Median FPS ≥ 58 over the 60s window, no frames > 33 ms, no JS-thread blocking warnings.

**Document:** Trace file path or screenshot of FPS overlay summary in the reply.

**Reply format:**
- Pass: `approved — median FPS XX, trace at <path>.`
- Fail: `fail — median FPS XX, jank observed at <action>, console errors: <list>.`

---

## Section 2 — Auto-Save Crash Recovery (EDIT-09)

**What this verifies:** The 5-second debounced auto-save persists element mutations BEFORE a force-quit when ≥ 5 seconds have elapsed, and does NOT persist when the force-quit happens within 4 seconds (proving the debounce is real, not just a noop).

**Setup:**
1. Same dev client + seeded garden from Section 1 (or skip seeding; this test works on any non-empty garden).
2. Make sure the device is in airplane mode OR the SyncWorker is observably quiet (so the only writer is the local autosave debounce, not a server roundtrip).

**Steps — round 1 (debounce respects window):**
1. Open the editor.
2. Place a new element from the palette (long-press Beet card → drop on canvas).
3. **Within 4 seconds** of placing, force-quit the app (swipe up + flick away the app card).
4. Re-open the app and navigate to the editor.

**Expected (round 1):** The element placed in step 2 is NOT present (the 5-second debounce did not yet fire; write was discarded with the app).

**Steps — round 2 (debounce fires after window):**
5. Place another new element (long-press a different palette item → drop).
6. **Wait 6 seconds** without touching the app.
7. Force-quit the app.
8. Re-open and navigate to the editor.

**Expected (round 2):** The element placed in step 5 IS present (the 5-second debounce fired at second 5; write was persisted to expo-sqlite before the quit).

**Steps — round 3 (manual save bypasses debounce):**
9. Place a new element.
10. **Immediately tap the Save button** in the toolbar (testID `editor-save-button` shows "Wird gespeichert …" briefly).
11. Force-quit within 1 second of seeing "Gespeichert" badge.
12. Re-open and navigate to the editor.

**Expected (round 3):** The element placed in step 9 IS present (manual save flushed the debounce synchronously).

**Fail signals:**
- Round 1 shows the element persisted → debounce timer is too short OR auto-save fires synchronously.
- Round 2 shows the element absent → debounce timer is too long OR autosave is dropping writes.
- Round 3 shows the element absent → manual save button does NOT call `flushAllPendingSaves` correctly.

**Pass criterion:** All three rounds match the expected outcome.

**Document:** Per-round observed result (present / not present) in the reply.

**Reply format:**
- Pass: `approved — round 1/2/3 all match expected. Debounce works.`
- Fail: `fail — round N: <observed vs expected>.`

---

## Section 3 — Bed-Draft Drag-to-Canvas Places Element at Finger Position (DRAFT-02)

**What this verifies:** Dragging a bed-draft from the Drafts-Tray onto the canvas creates a real Beet element at the exact finger position (within ±0.5 m tolerance, accounting for finger contact-point centering).

**Setup:**
1. Import a sample bed-draft via the Phase 6.5 flow:
   - Use a JSON payload with at least one entry in `beds[]` — e.g., `supabase/spatenstich-import-v1/examples/full.json`.
   - Trigger import via the existing entry point (`Aus Claude.ai importieren` from Home).
   - On the Sichtungs-Screen, do NOT promote the bed yet — leave it in the `pending` state.
2. Navigate to the editor via the new `Plan öffnen` CTA on Home (added in Plan 05 Task 4).
3. Open the Drafts-Tray by tapping the chip "Letzte Importe (1)" at the bottom-left.

**Steps:**
1. Confirm the DraftsTrayBottomSheet expands and shows the bed-draft card under "Beete (1)".
2. Long-press the bed-draft card (≥ 300 ms hold).
3. While holding, drag your finger to a specific position on the canvas — choose a visually distinctive location (e.g., 2 meters from the left edge, 3 meters from the top edge in garden coordinates; use the 1×1 m grid as a reference).
4. Release the finger.

**Expected:**
- A new Beet element appears on the canvas centered at (approximately) the release-finger position.
- The center coordinate of the element, measured in garden meters (toolbar → tap element → read tooltip or x/y in inspector), is within ±0.5 m of the intended location.
- The DraftsTrayBottomSheet re-loads; the just-dragged draft is no longer in the list (its status flipped to `promoted`).
- The new Beet has `provenance.kind === 'import'` and `importedFrom === <draft.id>` (verifiable via expo-sqlite inspector OR Supabase Studio after the next sync).

**Fail signals:**
- Element appears at the garden origin (0, 0) → `finalCoords` was not passed through to `promoteBedDraft`; the 6-arg form was ignored. Verify by `grep -n "promoteBedDraft(" app/app/(app)/plan/index.tsx` and confirm the 6th argument is `{xM, yM}`.
- Element appears but draft is NOT removed from the tray → `dismissDraft` or status update did not fire.
- Element appears off by >2 m from finger → coord system bug; check `screenToGarden` in `viewMatrix.ts` (Plan 03), specifically the tx/ty signs.

**Pass criterion:** Element centered within ±0.5 m of finger release point, draft promoted, `provenance.kind === 'import'` and `importedFrom === draft.id`.

**Document:** Observed coordinates vs. target (e.g., "target (2.0, 3.0) m, observed (2.1, 3.2) m, delta 0.22 m"), Supabase row check screenshot.

**Reply format:**
- Pass: `approved — bed dropped at (X.X, Y.Y) m, target was (X.X, Y.Y) m, delta < 0.5m. Draft promoted, provenance.kind=import.`
- Fail: `fail — <observed behavior>; expected <target>.`

---

## Section 4 — Stale-Import Filter Visual Sanity (DRAFT-03)

**What this verifies:** Drafts older than 30 days render with a "Stale" amber TrafficLightBadge in the Drafts-Tray, and the filter chips correctly partition the visible drafts.

**Setup:**
1. Insert (or have existing) at least 2 drafts with different `imports.imported_at` timestamps:
   - One fresh: imported_at = today (or within the last few days).
   - One stale: imported_at = 31+ days ago.
2. Easiest seeding path (manual via Supabase Studio SQL editor — user-only operation):
   ```sql
   INSERT INTO public.imports (id, garden_id, source, imported_at, version, ...)
     VALUES (gen_random_uuid(), '<active-garden-id>', 'claude-ai-project', now() - interval '31 days', 'spatenstich-import.v1', ...);
   INSERT INTO public.import_items (id, import_id, garden_id, kind, ...) VALUES (...);
   INSERT INTO public.bed_drafts (id, import_item_id, garden_id, label, status, ...)
     VALUES (gen_random_uuid(), '<import-item-id>', '<garden-id>', 'Altes Beet', 'pending', ...);
   ```
   Replace `<active-garden-id>` etc. as appropriate. After inserts, the SyncWorker pull will surface the rows in the next round, OR manually trigger a sync from the dev menu.

**Steps:**
1. Open the editor and expand the Drafts-Tray.
2. Filter is `Alle` by default — confirm both drafts are visible (one with Stale badge, one without).
3. Tap the `Stale` filter chip.
   - **Expected:** Only the stale draft is visible. The fresh draft is hidden.
   - **Visual check:** The stale draft card shows an amber TrafficLightBadge with label "Stale". Tooltip / hint text reads "Älter als 30 Tage — prüfe vor dem Übernehmen." (UTF-8 Umlaute — verify "Älter" and "prüfe" render correctly).
4. Tap the `Aktuell` filter chip.
   - **Expected:** Only the fresh draft is visible. The stale draft is hidden.
5. Tap the `Alle` filter chip.
   - **Expected:** Both drafts visible again.
6. Long-press the stale draft → drag onto canvas (same path as Section 3).
   - **Expected:** Promotion succeeds. The draft is removed from the tray. Confirm DRAFT-03 invariant "nie auto-gelöscht" by checking that the stale draft was REMOVED only because the user promoted it (not auto-cleaned).
7. Verify no auto-delete: Wait 30+ seconds idle. The remaining stale drafts (if any) MUST still be present in the tray. The app must not silently dismiss them.

**Expected (overall):**
- Amber Stale badge appears on >30-day drafts.
- Filter chips Alle / Aktuell / Stale show the correct partition at each tap.
- No drafts are auto-deleted by the app (D-15 invariant).
- German UI text uses literal Umlaute (Älter, prüfe, Übernehmen — NOT ASCII replacements).

**Fail signals:**
- Stale badge missing on the >30-day draft → check `isStale(importedAt)` math in `DraftsTrayBottomSheet.tsx`; ensure `STALE_MS = 30 * 24 * 60 * 60 * 1000` and `Date.now() - new Date(importedAt).getTime() > STALE_MS`.
- Filter chip "Stale" shows fresh drafts too → filter handler is inverted; check the `passes(d)` predicate.
- German text shows "Aelter" or "pruefe" → ASCII replacement bug; check `packages/shared/src/i18n/de.json` for the editor.tray.staleHint key.
- Drafts disappear after some idle time → auto-delete logic was introduced somewhere; this violates D-15 — find and remove.

**Pass criterion:** Amber Stale badge visible on >30-day draft, all 3 filter chips partition correctly, no auto-delete observed during 30s idle, all German strings show literal Umlaute.

**Document:** Screenshot of the tray under each filter chip (3 screenshots) + observation of the no-auto-delete idle window in the reply.

**Reply format:**
- Pass: `approved — stale badge correct, filter chips correct, no auto-delete observed, UTF-8 Umlaute literal.`
- Fail: `fail — <observed>.`

---

## Summary checkbox

After all four sections pass, mark this file's frontmatter `status: passed`. Until then, leave `status: pending`.

- [ ] Section 1 — 60fps @ 200 elements (EDIT-12)
- [ ] Section 2 — Auto-save crash recovery (EDIT-09)
- [ ] Section 3 — Bed-draft drag-to-canvas drop accuracy (DRAFT-02)
- [ ] Section 4 — Stale-import filter + no-auto-delete (DRAFT-03)

---

*Phase: 07-plan-editor-drafts-integration-m2-m07-5*
*Created by: gsd-plan-phase (Plan 06)*
*To be run by: Dirk on iPhone (or simulator) after Plan 06 schema push completes.*
