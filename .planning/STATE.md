---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Post-MVP
status: Awaiting human action
stopped_at: Phase 2.5 code-review-fix complete (8/8 findings resolved, 9 fix commits) — 6 neue Migrationen (007-012) PENDING `supabase db push --linked` gegen vitrqkzxkiqvadqfzrcx; danach Phase-Verification via /gsd-verify-work oder gsd-verifier agent + /gsd-next
last_updated: "2026-04-23T20:15:00.000Z"
last_activity: 2026-04-23 -- Phase 02.5 Plan 04 execution complete (join-by-code + 3rd AuthChoiceCard + Mein-Garten Screen mit D-16 Owner-Rights + Settings-Link + _layout bootstrap useEffect D-12; 3 atomic commits 06b3cca/5e1eb30/60404df; expo-clipboard ~7.0.1 auf SDK 53 gepinnt)
progress:
  total_phases: 8
  completed_phases: 2
  total_plans: 11
  completed_plans: 11
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-14)

**Core value:** Foto rein → Plan und Kalender raus (2-User Shared Garden seit Pivot 2026-04-21)
**Current focus:** Phase 2.5 — Shared Garden Model (NEU nach Pivot)

## Current Position

Phase: 2.5 (shared-garden-model) — CODE COMPLETE 2026-04-23; Wave 1 (Plan 01) complete; Wave 2 (Plan 02) complete; Wave 3a (Plan 03 Repos + authStore + migrateLocalToAccount extension) complete; Wave 3b (Plan 04 UI: join-by-code + 3rd AuthChoiceCard + Mein-Garten mit D-16 + Settings-Link + _layout bootstrap) complete — human-verify-Checkpoint pending für `/gsd-verify-work`. Nächste Phase: 3 Offline & Sync.
Vorheriger Status: Phase 02 (auth-profile-vereinsregeln) — CODE COMPLETE; MVP-Scope-Verify reduziert auf NFR-07/AUTH-05/AUTH-04/Logout-Guard (4 Items statt 10); Vereinsregeln-Verify-Items (Schritte 22–33) auf Phase 9 deferred
Plans: 11/11 completed (Phase 01: 3/3, Phase 02: 4/4, Phase 02.5: 4/4)
Last activity: 2026-04-23 -- Phase 02.5 Plan 04 execution complete (3 autonome Tasks, 3 commits, 109/109 Jest tests green, typecheck clean; human-verify pending)

Progress: [██████████] 100% (11/11 Plans; neue Phasen 3–7 + v1.1 Phasen 8, 9 noch nicht geplant)

## Performance Metrics

**Velocity:**

- Total plans completed: 0
- Average duration: -
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**

- Last 5 plans: none yet
- Trend: -

*Updated after each plan completion*
| Phase 01 P01 | 13 | 6 tasks | 33 files |
| Phase 01 P02 | 14 | 5 tasks | 18 files |
| Phase 01 P03 | 10 | 4 tasks | 14 files |
| Phase 02 P04 | 13 | 3 tasks | 17 files |
| Phase 02.5 P01 | 9 | 5 tasks | 10 files |
| Phase 02.5 P02 | 45 | 5 tasks | 13 files |
| Phase 02.5 P03 | 90 | 4 tasks | 11 files |
| Phase 02.5 P04 | 60 | 3 tasks | 8 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- **[Pivot 2026-04-21]**: 2-User Shared Garden Model (Dirk + Frau) — `gardens` + `garden_members` Tables, RLS auf Member-Check umgestellt, Invite-Code-Flow für zweiten Account. Neue Phase 2.5 eingeschoben.
- **[Pivot 2026-04-21]**: Phase 02 Vereinsregeln-Schicht per Feature-Flag eingefroren — Code bleibt vollständig, keine Menüpunkte/UI sichtbar im MVP; reaktiviert in Phase 9 (v1.1).
- **[Pivot 2026-04-21]**: Fotorealistisches Beet-Preview (Gemini 2.5 Flash Image / Nano Banana) als Phase 8 v1.1 hinzugefügt — Stretch-USP nach MVP.
- **[Pivot 2026-04-21]**: Vereinsregeln-Aktivierung (inkl. PDF-Extraktion Edge Function live + Editor-Warnings + BKleingG 1/3-Warnung) als Phase 9 v1.1 hinzugefügt.
- **[Pivot 2026-04-21]**: Human-verify Phase 02 reduziert von 10 auf 4 Akzeptanz-Items (nur NFR-07, AUTH-05, AUTH-04, Logout-Guard); Vereinsregeln-/PDF-Schritte auf Phase 9 deferred.
- Roadmap: Start with react-native-svg in Phase 5; Skia upgrade decision gated at end of Phase 5 via profiling (100 elements on real device). Do not pre-emptively adopt Skia.
- Roadmap: Custom outbox sync (not PowerSync/Legend-State). LWW semantics (2-User Shared Garden, Konflikte selten erwartet).
- ~~Roadmap: Vereinsregeln placed in Phase 2 (onboarding)~~ — superseded by Pivot 2026-04-21 (Vereinsregeln → Phase 9).
- Roadmap: Phase 6 (M3 Seed inventory) depends only on Phase 3 (Sync), not Phase 5 — it can be built in parallel with Phase 5 if timeline pressure rises.
- [Phase 01]: Expo SDK 53 stable used instead of SDK 55 canary — upgrade path is a version bump when SDK 55 stable releases
- [Phase 01]: StorageAdapter (D-08): CRUD-only interface + schema version, Platform.select export at storage/index.ts — callers never know which adapter
- [Phase 01]: jest split-project config: node env for storage tests (ts-jest + fake-indexeddb), expo env for RN component tests
- [Phase 01]: app typecheck script uses direct node invocation to bypass Windows/pnpm hoisted tsc shell wrapper bug
- [Phase 01]: SET LOCAL ROLE authenticated required in supabase db query RLS tests — Management API runs as postgres superuser, bypassing RLS without explicit role switch
- [Phase 01]: jest hooks project uses ts-jest/node (not jest-expo) — jest-expo setup.js crashes in multi-project Node context; pattern extends Plan 01 fix
- [Phase 01]: enqueueAiJob uses (supabase as any).schema('pgmq_public') — pgmq_public not in generated Database type; any-cast intentional and documented
- [Phase 01]: supabase functions invoke removed in CLI v2.90.0 — deployment verified via functions list (ACTIVE status); manual invoke documented in e2e-pgmq-smoke.sql
- [Phase 01]: SUPABASE_SERVICE_ROLE_KEY is NOT a GitHub secret — lives only in Supabase Function Secrets (T-3-06 mitigation)
- [Phase 01]: Sentry.init guarded by !!process.env.EXPO_PUBLIC_SENTRY_DSN — no-op in local dev without DSN
- [Phase 01]: EAS Build uses --no-wait flag — CI queues build on expo.dev without blocking runner
- [Phase 02-04]: Vereinsregeln checklist rendered flat (not 7-category) — VereinsregelChecklistItem in @spatenstich/shared has no `kategorie` field; grouping deferred pending shared-type extension
- [Phase 02-04]: Migration rollback invariant — storage.delete STRICTLY AFTER every Supabase upsert succeeds (T-2-04-03); signUp failure or upsert failure leaves local data intact for retry
- [Phase 02-04]: BKleingG seed rows keep deterministic `bk-<userId>-<index>` id across migration so DB CHECK constraint and client guard continue to recognise them
- [Phase 02-04]: Settings logout uses inline confirmation expansion (no Modal, UI-SPEC line 234); Sentry.setUser(null) gated on EXPO_PUBLIC_SENTRY_DSN (T-2-04-04 mitigation, mirrors Plan 01-03 pattern)
- [Phase 02-04]: Swipe-to-delete deferred — react-native-gesture-handler not in stack; tap-trash fallback used per plan Behavior 14 permission
- [Phase 02-04]: ExtractionLoader uses NativeWind animate-pulse (not Reanimated worklet) — adequate for MVP, no added surface
- [Phase 02-04 post-hoc]: Supabase column contract enforced via toRow/fromRow in vereinsregelnRepo — Postgres column is `ist_bkleingg` (snake_case); camelCase `istBKleingG` would be silently dropped on upsert. migrateLocalToAccount routed through toRow. Fix shipped 2026-04-20 (e6b8c30).
- [Phase 02-04 post-hoc]: confirm.tsx inline-edit wires VereinsregelRow.onEdit → vereinsregelnStore.updateRule. Closes SC5 edit-reachability gap. Fix shipped 2026-04-20 (d885901).
- [Phase 02.5 P01]: Clean-Cut-Typen — UserProfile reduziert auf Account-Scope (userId/mode/displayName/createdAt/updatedAt); LocalProfile extends UserProfile mit plz/klimazone/archetype. D-01-Pivot (Garden-Scope) eingefroren in packages/shared.
- [Phase 02.5 P01]: D-16 Owner-Rights-Keys (14) unter garden.transferOwnership.* + garden.delete.* verankert — Plan 04 darf keine weiteren Keys einführen.
- [Phase 02.5 P01]: Test-Framework — Jest (nicht Vitest wie im Plan-Text beschrieben). Jest-Globals via jest-expo, kein expliziter Import nötig. Pattern identisch zu vereinsregelnRepo.test.ts (Rule-1-Fix).
- [Phase 02.5 P01]: migrateLocalToAccount.ts Typ-Signatur UserProfile → LocalProfile als Rule-3-Blocking-Fix; Body-Erweiterung (ensure_default_garden_for_user RPC + gardenId-Stempel) folgt in Plan 03.
- [Phase 02.5 P01]: SQL-Test-Stubs nutzen Crockford-Alphabet-Check `[0OILU]` via regex match im invite_code.sql — konsistent mit GARDEN-02 Requirement-Wording.
- [Phase 02.5 P02]: SECURITY-DEFINER-Helper-Pattern für selbst-referenzielle RLS — `public.is_garden_member(uuid)` + `public.is_garden_owner(uuid)` (STABLE + SET search_path = public, pg_temp) bypassen RLS im Subquery. Behebt Infinite-Recursion 42P17 auf garden_members. Alle 11 Member-Check-Policies nutzen Helper statt rekursivem Subquery. Eingeführt in Migration 004.
- [Phase 02.5 P02]: pgcrypto-Schema-Awareness — `gen_random_bytes` lebt in `extensions`-Schema (nicht `public`). SECURITY DEFINER functions, die pgcrypto-Primitiven nutzen, müssen `SET search_path = public, extensions, pg_temp` setzen. Fix in Migration 005.
- [Phase 02.5 P02]: Migration-History ist append-only — Supabase CLI speichert Migration-Hash in schema_migrations; post-push-Edits brechen den nächsten `supabase db push`. Rule-1-Bug-Fixes an vorherigen Migrations gehen in numerisch-höhere Follow-up-Migrations (Pattern: 004/005/006).
- [Phase 02.5 P02]: Supabase CLI 2.90 surfacet `raise notice` NICHT mehr in JSON-output — SQL-Test-Success-Detection via absence of `ERROR:` / `unexpected status 4xx` im stderr. Alte Plan-Text-`grep -q "ok"`-Assertions sind obsolete.
- [Phase 02.5 P02]: SQL-Test-Setup-Phasen-Trennung — profiles + direct garden_members-INSERTs laufen als postgres superuser (ohne `set local role authenticated`), weil profiles-RLS `auth.uid() = id` zweiten User blockiert UND garden_members keine INSERT-Policy hat (productive code: consume_invite_code RPC). Nur RPC-Calls + Assertions laufen als authenticated. UUIDs via `set_config`/`current_setting` über role-switches.
- [Phase 02.5 P02]: profiles.plz/klimazone/archetype bleiben weiterhin INTAKT (Pitfall 4 Two-phase-refactor) — Migration 007 dropt sie, sobald Plan 04 alle Reads auf gardens-Row migriert hat.
- [Phase 02.5 P02]: Enqueue/repo-Column-Rename-Breaks (enqueueAiJob.ts `user_id` + vereinsregelnRepo.ts `user_id`) werden bewusst NICHT in Plan 02 gefixt — Plan-Text sagt explizit "fix those consumers in Plan 03, not here". Handoff dokumentiert in 02.5-02-SUMMARY.md.
- [Phase 02.5 P03]: Typed Domain Errors für D-16 — vier Error-Klassen (NotOwnerError/GardenHasMembersError/CannotTransferToSelfError/TargetNotMemberError) mappen Supabase-SQLSTATE (42501/P0003/P0004/P0005) auf unterscheidbare UI-Reaktionen. i18n-Keys aus Plan 01 P01 über error.message konsumierbar.
- [Phase 02.5 P03]: Account-Only Repo Guard (D-13) — gardenRepo + inviteCodeRepo werfen `'gardens are account-only'` wenn `useAuthStore.getState().mode !== 'account'` (außer `ensureDefaultGardenForUser`, das direkt nach signUp läuft bevor authStore flipped wird)
- [Phase 02.5 P03]: `ProfilePatch` als explizites type-Alias statt `Partial<UserProfile> & Partial<LocalProfile>` — LocalProfile.mode ist Literal `'local'` und narrowte die Intersection; neue Struktur hat lockeres `mode?: UserProfile['mode']`
- [Phase 02.5 P03]: migrateLocalToAccount 8-Step-Flow — `ensureDefaultGardenForUser` zwischen signUp und profile.upsert platziert (NICHT danach); atomic-tail bleibt bei RPC-Failure erhalten: kein profile-Row, kein gardens-update, keine vereinsregeln, keine storage.delete. Reihenfolge in Tests per `invocationCallOrder` geprüft.
- [Phase 02.5 P03]: vereinsregelnRepo.deleteVereinsregel scopet by `(id, garden_id)` statt `(id, user_id)` — RLS macht member-check auf garden_id; doppeltes `.eq()` schützt gegen ID-Collision zwischen parallelen Gärten (defense-in-depth).
- [Phase 02.5 P03]: enqueueAiJob.ts + vereinsregelnRepo.ts Column-Rename-Fix (`user_id` → `created_by_user_id` + `garden_id` NOT NULL) in diesem Plan durchgeführt — Plan 02 Summary dokumentierte explizit "fix those consumers in Plan 03, not here". Typecheck damit sauber grün.
- [Phase 02.5 P04]: Router-4-Äquivalent für `Stack.Protected` — expo-router 4.0.22 (SDK 53) kennt `Stack.Protected` (SDK 54+) nicht. Security-equivalentes `<Redirect />`-in-GuardedStack-Pattern dokumentiert inline im `_layout.tsx`-Header (identity === null → (auth); identity !== null → (app)).
- [Phase 02.5 P04]: Inline-Confirmation-Expansion (keine Modals) für alle destruktiven Aktionen — leave-garden, remove-member, transfer-ownership, delete-garden. Folgt UI-SPEC Zeile 234 (Phase 02-04-Pattern); `setState`-Toggles statt React-Native Modal.
- [Phase 02.5 P04]: D-16 Error-Class-Wiring — `NotOwnerError` / `GardenHasMembersError` / `CannotTransferToSelfError` / `TargetNotMemberError` via `err instanceof` im Mein-Garten-Screen in typspezifische `t('garden.transferOwnership.*')` / `t('garden.delete.*')`-Keys gemappt. Alle 14 D-16 i18n-Keys aus Plan 01 konsumiert; Plan 04 hat keine weiteren D-16-Keys eingeführt.
- [Phase 02.5 P04]: `canDelete = isOwner && members.length <= 1` — Delete-Button bleibt sichtbar aber `disabled` mit Hint-Text `settings-garden-delete-disabled-hint`, wenn weitere Member existieren. Klar kommuniziert Owner-Rights-Präkondition.
- [Phase 02.5 P04]: Bootstrap-useEffect in `_layout.tsx` (D-12 Defense-in-Depth) — ruft `ensureDefaultGardenForUser()` RPC, wenn `identity && mode === 'account' && !activeGardenId`. Covered Cases: (a) neue signUps post-deploy ohne migrate-flow, (b) v0 persist-blobs mit activeGardenId:null, (c) DB-Rows ohne Migration-Seed, (d) post-delete-garden (D-16) wo User nur-Garten gelöscht hat. RPC ist server-idempotent.
- [Phase 02.5 P04]: expo-clipboard@~7.0.1 statt ^55.x (Rule-1-Bug-Fix) — SDK-53-compatible Version gepinnt (Hoisting ins monorepo vermied). Share+Copy-Flow via `expo-clipboard` + RN Share API.
- [Phase 02.5 P04]: Crockford-Alphabet-Filter im join-by-code-Input — `[^A-Z1-9]` regex schließt `0/O/I/L/U` aus, matcht GARDEN-02-Requirement-Wording und Migration-Tests. Kein 6. Zeichen wird akzeptiert ohne Alphabet-Bestätigung.

### Pending Todos

None yet.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260418-q01 | Fix CI: add react-native-web to app deps | 2026-04-18 | 12c988d | [260418-q01-fix-react-native-web-ci](.planning/quick/260418-q01-fix-react-native-web-ci/) |
| 260421-v43 | Roadmap-Pivot: shared-garden MVP, defer vereinsregeln+photorealism to post-MVP | 2026-04-21 | (pending) | [260421-v43-roadmap-pivot](.planning/quick/260421-v43-roadmap-pivot/) |

### Blockers/Concerns

- Open question: NativeWind v4 + Reanimated v3 compatibility on SDK 55 unconfirmed. Spike needed in Phase 1 before any styling work.
- Open question: expo-sqlite WASM + COOP/COEP headers on EAS Hosting — must be validated in Phase 1.
- Open question: @supabase/supabase-js >= 2.49.5 stable release — check npm before first sprint.
- Open question: pnpm + EAS Build compatibility (eas-cli issue #3247) — full EAS Build must be tested in Phase 1.
- Risk: Claude Vision structural extraction quality for German allotment plots is MEDIUM confidence. Run 5-10 photo test harness before locking Phase 4 architecture.
- **[Pivot 2026-04-21]** Open question: API-Key-Strategie für Phase 4 (Claude Vision Foto→Plan) + Phase 8 (Gemini Fotorealismus) + Phase 9 (Claude PDF-Extraktion) — Spike geplant: selbst-gehosteter Claude Code Proxy auf 24/7-Rechner vs. Ollama lokal vs. bezahlter API-Key. Betrifft Phase 4 Kickoff.

## Session Continuity

Last session: 2026-04-23T19:59:00.000Z
Stopped at: Phase 2.5 Plan 04 complete (3/3 autonome Tasks, 3 commits 06b3cca/5e1eb30/60404df, SUMMARY written, 109/109 Jest tests green, typecheck clean) — human-verify-Checkpoint (SC-1..SC-4 + D-16 Scenarios 5..7 + bootstrap + regression) PENDING für nächste `/gsd-verify-work`-Session. Danach Phase 3 Offline & Sync.
Resume file: .planning/phases/02.5-shared-garden-model/02.5-04-SUMMARY.md
