# Research Summary: Kleingarten-App

**Synthesized:** 2026-04-14
**Sources:** STACK.md · FEATURES.md · ARCHITECTURE.md · PITFALLS.md · PROJECT.md

---

## Stack Recommendation

| # | Library / Tool | Version | Role |
|---|---------------|---------|------|
| 1 | Expo SDK | 55 | Universal app framework; new architecture mandatory; web via Metro |
| 2 | React Native / React | 0.83 / 19.2 | Core runtime (via SDK 55) |
| 3 | Expo Router | 4.x | File-based routing; static web export |
| 4 | @shopify/react-native-skia | ~1.x | GPU-accelerated plan editor canvas (60 fps, 200 elements) |
| 5 | react-native-gesture-handler + react-native-reanimated | 2.x / 3.x | Worklet-driven gestures; no JS bridge per drag frame |
| 6 | NativeWind + react-native-reusables | 4.x / latest | Tailwind-based cross-platform styling; copy-owned primitives |
| 7 | Zustand + zundo | 5.x / latest | App state + undo/redo for plan editor (50-state history, elements slice only) |
| 8 | TanStack Query | 5.x | Server state, AI job polling, feature flags, cache invalidation |
| 9 | @supabase/supabase-js | >= 2.49.5 | Postgres + Auth + Storage + Realtime (must be >= 2.49.5 — earlier versions break under Metro ES module resolution) |
| 10 | expo-sqlite + drizzle-orm | 15.x / latest | Local structured storage; drizzle provides type-safe migrations |

**Additional required:** `expo-image-manipulator` (client-side photo resize to 1092x1092 px before any upload), `expo-secure-store` (token + local-mode UUID storage), `expo-camera` / `expo-image-picker` (native), Deno 2.x (Edge Functions runtime), pnpm 9.x + `node-linker=hoisted`.

**Note on renderer:** ARCHITECTURE.md recommends starting with `react-native-svg` and upgrading to Skia only if profiling at 100 elements shows < 50 fps. STACK.md recommends Skia from the start. The safer position for a solo dev is **start with react-native-svg, commit to the Skia upgrade decision by the end of M2** — both files agree on this as the decision gate.

---

## Table Stakes

Features any garden planning app must have to avoid immediate rejection. All major competitors (Fryd, GrowVeg, Gardenize) have these.

| Feature | Minimum Viable Form | Notes |
|---------|---------------------|-------|
| Visual 2D bed layout editor | Drag/drop, grid, basic shapes | Every competitor has this; absence = app is not a garden planner |
| Plant database | 100-150 Kleingarten-relevant varieties | Fryd has 4,000; MVP subset is acceptable if well-curated |
| Planting calendar with regional dates | PLZ → Klimazone → date offsets | Fryd uses 26 zones; 7-zone DWD approach is sufficient and faster to build |
| Companion planting warnings | Simple good/bad neighbor flag on placement | Full matrix is v1.1; a placement warning is sufficient for MVP |
| Crop rotation warning | One-season same-family replanting alert | GrowVeg tracks 5 years; a single-season check is MVP-adequate |
| Task list from plan | Auto-generated sow/plant/harvest tasks | Dirk expects this; calendar module (M4) delivers it |
| Mobile + desktop access | iPhone + desktop browser | Expo handles this natively; cross-device is expected, not a differentiator |
| Seed/inventory list | Viewable inventory linked to plan | Export (PDF) is v2; a readable in-app list is the floor |
| Offline access to existing plan | Read + edit without connectivity | Most competitors are online-only — offline is expected by Dirk even if it's a differentiator vs competitors |
| Photo documentation | Attach photo to bed or plant | Gardenize built its brand on this; basic attach is the floor |

---

## Key Differentiators

What makes Kleingarten-App genuinely different from every competitor. These are the moat.

| Differentiator | Why It Matters | Competitor Status | Confidence |
|---------------|---------------|------------------|------------|
| **Photo → 2D Plan (Claude Vision)** | Fastest onboarding: real garden captured in minutes vs. hours of manual drawing. Structural extraction (not aesthetic rendering) is entirely novel. | Zero competitors do structural extraction. Ogrovision does photorealistic renders, not floor-plan JSON. | MEDIUM — technically feasible; quality at first release will be imperfect |
| **BKleingG 1/3 Nutzgartenpflicht tracker** | Real-time "Sie liegen bei 31% — 2m² unter Minimum" prevents lease risk. Every Kleingartenpächter needs this. | Zero competitors address any German regulatory context. | HIGH |
| **Vereinssatzung PDF extraction** | Upload your club's bylaws; Claude extracts rules; editor enforces them inline. No centralized Satzungs-DB exists — each club varies. | Zero competitors exist. | HIGH for value; MEDIUM for implementation quality |
| **Saatgut-Inventar per Samentüten-Foto** | Photograph seed packet → Claude extracts variety, sowing window, expiry. Fryd's Saatgut-Manager is manual-only. Seed to Spoon does this in the US, not for German packets. | No German competitor. | HIGH |
| **Offline-first with sync queue** | Plan readable and editable without WiFi; AI jobs queue for reconnect. Most competitors require connectivity. | Fryd and GrowVeg require connectivity. | HIGH — achievable; real gap vs competitors |
| **"Lokal nutzen" without account** | Zero-friction first use. No email required to see the first plan. | Most competitors require account before value. | HIGH — low complexity, high retention impact |
| **German archetype-driven planning** | "Selbstversorger" archetype links to compliance calculator; suggestions are weighted by archetype, not just a preference tag. | Fryd has templates but no structural archetype-to-compliance link. | HIGH |

**The three differentiators that together define the product identity:** Photo → Plan, BKleingG compliance tracking, and offline-first. Without all three, Kleingarten-App is a Fryd clone with worse UX.

---

## Critical Architecture Decisions

Non-obvious decisions that cannot be changed cheaply after M1. Get these right before writing feature code.

### 1. Abstract storage behind an interface on day one

Do not call `expo-sqlite` directly from any feature code. Create a `StorageAdapter` interface with `NativeAdapter` (expo-sqlite) and `WebAdapter` (IndexedDB) in `packages/shared/src/storage/`. expo-sqlite web support is **alpha** — it requires `SharedArrayBuffer` and COOP/COEP headers that may not be available on all hosting configurations. The abstraction costs ~2 hours and eliminates an entire class of web-build failures.

**Wrong:** `import { openDatabaseSync } from 'expo-sqlite'` in a screen or store.
**Right:** `import { getStorage } from '@kleingarten/shared/storage'` everywhere; inject the adapter at app boot.

### 2. Store all coordinates in garden-meters; compute screen-pixels at render time

The plan editor has two coordinate spaces: garden meters (real-world dimensions) and screen pixels (viewport). All `PlanElement` positions stored in SQLite and Supabase Postgres must be in **garden meters**. Screen coordinates are computed only at render via `toPx(meters, scale)`. If screen coordinates are stored, the data breaks on device changes, zoom changes, and cross-device sync.

**Wrong:** Store `x: 350, y: 200` (pixels on Dirk's current phone viewport).
**Right:** Store `x: 3.5, y: 2.0` (meters from plot origin); derive pixels at paint time.

### 3. Use custom outbox sync — no third-party sync library

PowerSync, Legend-State, and Supastash are credible options but add schema constraints, bundle size, and operational dependencies not justified for a single-user MVP with Last-Write-Wins semantics. Build the outbox pattern directly: `outbox` table in SQLite → `SyncManager.flush()` → Edge Function → Postgres upsert with `WHERE updated_at < EXCLUDED.updated_at`. This pattern is fully documented, fits the constraints, and avoids vendor lock-in at the critical persistence layer.

**Caveat:** If the app pivots to multi-user with collaborative editing, revisit this decision — LWW is insufficient for CRDTs.

### 4. AI jobs are async via pgmq — never synchronous Edge Function calls

Multi-photo garden analysis (3 photos, parallel Claude Vision calls) runs 6–20 seconds. Supabase Edge Functions have a 2-second **CPU** limit (separate from 150-second wall-clock). Never call Claude Vision synchronously from a client-triggered Edge Function. The correct pattern:

1. Client uploads photos to Supabase Storage
2. Client inserts row into `ai_jobs` + enqueues pgmq message
3. `pg_cron` triggers Edge Function consumer every 60s
4. Consumer calls Claude Vision (parallel per photo), stores `raw_response` + `parsed_result`
5. Client polls via TanStack Query (5s interval while `status = 'pending'`)

**Wrong:** `POST /ai-vision` → await Claude → return result in same request.
**Right:** Job queue → background processing → client polls for completion.

### 5. Enable RLS + user_id indexes on every table in migration 001

Supabase SQL Editor runs as postgres superuser and bypasses RLS. Every query succeeds in the editor; zero queries succeed for an authenticated user if RLS policies are missing. The cost of enabling RLS on an empty table is zero. The cost of retrofitting RLS after Dirk's data exists is a multi-hour migration with risk of breaking existing rows.

Rule: every table gets `RLS: enabled`, `user_id UUID FK`, `auth.uid() = user_id` policy, and `CREATE INDEX ON table(user_id)` in the same migration that creates it. No exceptions.

### 6. Resize photos client-side to 1092x1092 px before any upload

Claude Vision's optimal input is 1.15 MP (1092x1092 px). A 12 MP phone photo costs 4–5x more in tokens and triggers CPU-limit failures in the Edge Function (base64 encoding 3 large images burns through the 2s CPU budget). Use `expo-image-manipulator` in a `PhotoProcessor` utility before every upload. This is one of the highest-leverage decisions in the project: it halves AI costs, prevents a class of production outages, and improves latency.

### 7. Skia vs react-native-svg: decide by M2 profiling gate, not before

Both STACK.md and ARCHITECTURE.md agree: the correct approach is to start with `react-native-svg` (simpler, same JSX API on all platforms) with Reanimated worklets for gestures, then profile at 100 elements on a real device. If frame time exceeds 16ms during drag with 100 elements, upgrade to Skia. The switching cost is 3–5 days (imperative draw-call API, full rewrite of canvas code). Plan this spike explicitly in the M2 milestone.

**Do not adopt Skia pre-emptively** — the Reanimated shared-value + memo pattern resolves most re-render issues without the full Skia migration.

---

## Top Pitfalls to Avoid

### 1. Claude Vision hallucinations in valid JSON (CRITICAL-2)

Claude's structured output guarantees schema adherence, not factual accuracy. A fuzzy photo of bare early-spring soil will produce a valid JSON array with confident coordinates for non-existent Tomatenbeete. This destroys user trust in the core USP.

**Prevention:** Every detected element in the schema must include `"confidence": "high|medium|low"` and `"reasoning": string`. Low-confidence elements render as "Vorschlag (unsicher)" in the confirmation UI, never as accepted facts. The confirmation step (user accepts/rejects each element) is not optional — it is the safety valve for the entire M1 flow. Build the confirmation UX before wiring Claude Vision.

### 2. SVG touch event platform divergence (CRITICAL-3)

react-native-svg has incompatible touch behaviors across platforms: Android swallows touch events; iOS passes them through; hitboxes do not scale after zoom transforms on iOS (confirmed open bug #2809). These discrepancies make the plan editor feel broken on whichever platform was not tested first.

**Prevention:** Use react-native-gesture-handler's Gesture API (not PanResponder) for 100% of canvas touch handling from the first interactive prototype. Never rely on SVG intrinsic hit-testing after a transform is applied — always recompute touch coordinates via `(screenX - translateX) / scale`. Test on a real iPhone, not Simulator, from the first drag interaction.

### 3. expo-sqlite alpha status on web (CRITICAL-1)

expo-sqlite web runs via WASM and requires `SharedArrayBuffer`, which requires COOP/COEP HTTP headers. Builds that work in `expo start --web` locally can fail silently on the production hosting environment if headers are not configured. This breaks the desktop-browser target entirely.

**Prevention:** Abstract storage behind a `StorageAdapter` interface on day one (see Architecture Decision #1). Test the web export on the actual EAS Hosting environment during M1, not at M5.

### 4. Supabase RLS "SQL Editor trap" (HIGH-4)

Supabase SQL Editor bypasses RLS. Queries that work in the editor will return empty results for authenticated app users if RLS policies are missing or misconfigured. This is the single most common Supabase production issue reported by developers.

**Prevention:** Enable RLS on every table in migration 001. Test all data access through the Supabase JS client with a real session token. Add `user_id` indexes in the same migration to prevent full-table scans when RLS evaluates `auth.uid() = user_id` on every row.

### 5. Offline photo queue state corruption on reconnect (HIGH-3)

If the app is killed mid-upload or the Edge Function times out after Storage upload succeeds, the queue entry lands in a half-processed state: photo exists in Storage, no `ai_jobs` row exists. On reconnect, the queue replays and attempts a duplicate analysis.

**Prevention:** Implement a state machine for every queue entry: `pending → uploading → uploaded → analyzing → complete | failed`. Generate a deterministic `idempotency_key` (e.g., `sha256(photoUri + timestamp)`) and pass it to the Edge Function. The function must be idempotent: duplicate calls return the cached result.

---

## Build Order Recommendation

Based on component dependencies, risk profile, and the Saison 2026 deadline.

```
Phase 1 — Foundation (blocks everything else)
  - pnpm monorepo scaffold + packages/shared skeleton
  - StorageAdapter interface + NativeAdapter (expo-sqlite + drizzle-orm, WAL mode, migrations)
  - Supabase project: Auth, DB schema, RLS policies, user_id indexes — all in migration 001
  - Zustand store shells (planStore, inventoryStore, profileStore, aiJobStore, syncStore)
  - SyncManager skeleton (compiles, no-ops until Phase 3)
  - Feature flag table + useFlag() hook (wire up now; use throughout)

Phase 2 — Auth + Profile (blocks AI calls and sync)
  - Supabase Auth (magic link + anon/local mode)
  - "Lokal nutzen" mode with synthetic UUID in expo-secure-store
  - profileStore: PLZ input → Klimazone lookup → Archetyp selection
  - Onboarding flow (Account | Lokal → PLZ → Archetyp → Vereinsregeln optional)

Phase 3 — Sync Layer (blocks all data features)
  - outbox table + SyncManager push (batch flush, exponential backoff)
  - sync_cursors + SyncManager pull (cursor-based, LWW upsert)
  - Network detection (expo-network)
  - Web storage fallback: WebAdapter (IndexedDB)

Phase 4 — Garden Capture + AI Vision (M1 — highest risk, core USP)
  - PhotoProcessor utility: expo-image-manipulator → 1092x1092 px
  - Supabase Storage bucket + RLS write policy
  - pgmq queue + ai-vision Edge Function (Claude Vision, garden_scan job type)
  - ai_jobs table + usage_ledger + rate limiting (50 soft / 200 hard)
  - Job polling via TanStack Query (5s interval)
  - Confirmation UX: "erkannte Elemente bestätigen" with per-element confidence display
  - Edge cases: 1 photo warning, zero elements → empty template
  → Claude Vision test harness: 5-10 representative photos before shipping

Phase 5 — SVG Plan Editor (M2 — depends on M1 AI output)
  - Coordinate system: garden meters ↔ screen pixels via GardenDimension utility
  - Static render: SVG from M1 parsed_result (react-native-svg)
  - Gesture stack: RNGH Gesture Detector, pan + pinch + tap (real device from day 1)
  - Drag elements: Reanimated shared values (UI thread), commit on onEnd only
  - React.memo on every SVG element; Record<id, element> in planStore for O(1) updates
  - Undo/redo: zundo middleware, elements slice only, 50-state limit
  - Auto-save: 5s debounce → drizzle-orm → outbox enqueue
  - Element palette, polygon bed tool, rotation, scale
  - BKleingG 1/3 ratio display (computed live from plan elements)
  → PROFILING GATE: measure frame time at 100 elements. Decide Skia upgrade here.

Phase 6 — Seed Inventory (M3 — parallel path, shares AI pattern)
  - ai-vision: seed_packet job type (reuses M1 Edge Function with job_type routing)
  - Sorten-DB: 100-150 entries in packages/shared constants
  - inventoryStore + CRUD UI (photo-first + text-fallback with autocomplete)

Phase 7 — Planting Calendar (M4 — depends on M3 inventory + M2 plan)
  - Klimazone-based date calculation engine
  - 12-month timeline UI
  - Placement suggestions: free beds + plant spacing + Klimazone offsets
  - User confirms suggestion → element added to plan, task activated

Phase 8 — Rules Engine (M5 — depends on profile + plan)
  - Vereinssatzung PDF: stream to Storage → rules_pdf Edge Function (pgmq, same pattern)
  - Rules confirmation UI; fallback checklist (15 typical German allotment rules)
  - Inline editor warnings for Satzungs-violations
  - BKleingG 1/3 tracker surfaced as Profil section stat
```

**Critical path:** Foundation → Sync → AI Vision (M1) → SVG Editor (M2)

M1 and M2 are the highest-risk phases (novel patterns, performance requirements, no prior comparable). Build them first. Every other milestone is lower risk and can be compressed if the deadline demands it.

---

## Open Questions Before Planning

These need decisions or spikes before the roadmap is locked. Each one can block a phase if resolved wrong.

| # | Question | Blocks | Resolution Path |
|---|---------|--------|----------------|
| 1 | **NativeWind v4 + Reanimated v3 on SDK 55** — confirmed working on SDK 53, but SDK 55 ships RN 0.83 which may require Reanimated v4. NativeWind v4 + Reanimated v4 compatibility is unconfirmed. | M1 styling work | Proof-of-concept spike: create throwaway Expo SDK 55 project with NativeWind 4.x + Reanimated 3.x. Run on device before committing to the styling stack. |
| 2 | **expo-sqlite web on EAS Hosting** — WASM SQLite + COOP/COEP headers on EAS Hosting is documented but alpha-quality. The WebAdapter (IndexedDB) fallback may be required even if Dirk is the only web user. | Phase 1 StorageAdapter design | Deploy a minimal EAS Hosting build with expo-sqlite init as early as Phase 1. Confirm headers work before M2. |
| 3 | **@supabase/supabase-js 2.49.5 stable release** — the Metro ES module fix was in a `-next.1` pre-release at research time. If the stable release is not available, the entire Supabase integration requires the `unstable_enablePackageExports: false` workaround in metro.config.js. | Phase 1 Supabase integration | Check npm for `@supabase/supabase-js >= 2.49.5` stable before first sprint. Document the workaround in metro.config.js as a fallback. |
| 4 | **Skia bundle size on web** — Skia ships ~7-10 MB WASM for the web target. For a desktop-browser user this is acceptable but should be measured. If bundle analysis (Expo Atlas) shows unacceptable load time, the Skia upgrade must be scoped to native-only (web stays on react-native-svg). | M2 Skia upgrade decision | Run `expo export --platform web` + Expo Atlas bundle analysis as part of the M2 profiling gate. |
| 5 | **pnpm + EAS Build compatibility** — EAS Build has reported issues detecting pnpm lockfiles in monorepo setups (eas-cli issue #3247). The `node-linker=hoisted` strategy mitigates but does not guarantee this. | Phase 1 CI setup | Test a full EAS Build (iOS + Android) from the monorepo scaffold before committing to the CI/CD configuration. Do this in Phase 1, not at M1 release. |
| 6 | **Claude Vision structural extraction quality for German allotment plots** — the photo-to-plan USP depends on Claude Vision producing usable coordinate estimates from overhead garden photos. Early-spring plots (bare soil, few visual landmarks) are the worst-case input. If extraction quality is below the threshold for a useful confirmation step, the M1 feature needs rethought. | M1 architecture | Run the Claude Vision test harness (5-10 representative photos: good summer plot, sparse spring plot, single oblique angle, overcast) before committing to M1 architecture. Budget: ~$0.50 in API costs. |
| 7 | **"Lokal nutzen" data migration path** — when a local-mode user creates an account and wants to sync their existing local data to Supabase, the migration must map the synthetic local UUID to the new `auth.uid()`. This is a data migration with risk of duplication. The data model must be designed for this from Phase 2, not retrofitted later. | Phase 2 Auth design | Design the local-mode → auth migration path in Phase 2 before writing any local-mode persistence code. |

---

## Confidence Assessment

| Area | Confidence | Basis |
|------|-----------|-------|
| Stack choices | HIGH | Official Expo/Supabase docs + multiple corroborating sources; specific versions verified |
| German regulatory features (BKleingG, 1/3 rule) | HIGH | Primary legal sources (buzer.de, kleingarten-bund.de) |
| Competitive landscape | HIGH | Direct app store research + competitor feature pages |
| AI Vision photo quality for structural extraction | MEDIUM | No published precedent for this exact use case; Ogrovision et al. do aesthetic rendering only |
| NativeWind v4 + SDK 55 compatibility | LOW | Confirmed on SDK 53; SDK 55 is newer than the research date |
| Sync architecture (custom outbox) | MEDIUM | Well-documented pattern but not battle-tested at this exact stack combination |
| expo-sqlite web production reliability | LOW | Alpha status; known SharedArrayBuffer issues; mitigation path exists |
| EAS Build + pnpm monorepo | MEDIUM | Open issue exists; workaround documented; not verified for this project |

**Overall confidence: MEDIUM-HIGH.** The stack and architecture recommendations are well-grounded. The two areas of genuine uncertainty (AI Vision extraction quality and SDK 55 library compatibility) are both de-risked by early spikes that should happen in Phase 1 before any feature code is written.
