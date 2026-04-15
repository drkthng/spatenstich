# Pitfalls Research: Kleingarten-App

**Domain:** Expo/React Native universal app (iOS + Android + Web) with Supabase backend, SVG interactive editor, Claude Vision AI, and offline-first sync
**Researched:** 2026-04-14
**Overall confidence:** HIGH (most findings verified against official docs or multiple sources)

---

## Critical Pitfalls (Must Avoid)

These are showstoppers. Hitting them mid-project causes rewrites, data loss, or catastrophic UX failures.

---

### CRITICAL-1: expo-sqlite Web Support Is Alpha — Not Production-Ready

**What goes wrong:** The project uses expo-sqlite as its local persistence layer and targets Desktop-Browser via Expo web export. expo-sqlite's web implementation is explicitly marked **alpha** in the official Expo docs and may be unstable. It runs SQLite via WebAssembly (wa-sqlite), requires `SharedArrayBuffer`, and demands specific HTTP security headers (`Cross-Origin-Embedder-Policy: require-corp` and `Cross-Origin-Opener-Policy: same-origin`). Developers report "SharedArrayBuffer is not defined" errors even with proper Metro config. WASM SQLite is also slower than IndexedDB in browsers because of the JS-to-WASM data transfer overhead.

**Why it happens:** expo-sqlite was built for native first. The web port is an afterthought, not a production target.

**Consequences:**
- Desktop-browser users cannot persist their garden plan locally
- App breaks entirely on web if SQLite fails to initialize
- SQLite web builds fail silently or crash on Supabase/Vercel-hosted builds without the required COOP/COEP headers

**Prevention:**
- For web target: use a separate persistence adapter. IndexedDB via `@react-native-async-storage/async-storage` (falls back to localStorage on web, max ~5 MB) or a library like `Legend State` that uses IndexedDB on web natively.
- Abstract the persistence layer behind an interface from day one: `StorageAdapter` with `NativeAdapter` (expo-sqlite) and `WebAdapter` (IndexedDB). Never call expo-sqlite directly from feature code.
- Test the web build on the actual hosting environment early (not just `expo start --web`), because COOP/COEP headers must be set at the server/CDN level.

**Warning signs:** `SharedArrayBuffer is not defined` in browser console; SQLite init hanging on web; works in Expo Go but fails in web export.

**Phase:** Address the storage abstraction boundary in M1 (first time SQLite is used). Do not defer.

---

### CRITICAL-2: Claude Vision JSON Schema Drift — Perfectly Formatted Wrong Answers

**What goes wrong:** Claude Vision's structured output feature guarantees schema adherence, NOT correctness. An overhead garden photo of a sparse early-spring plot (mostly bare soil) will produce valid JSON with confident coordinates for elements that are not actually there. Hallucinated elements (e.g., "Tomatenbeete" with plausible-looking coordinates) will be placed into the garden plan and appear authoritative.

**Why it happens:** Claude Vision cannot refuse to populate required JSON fields. If the schema requires `elements[]`, it will provide elements even when the image gives insufficient evidence. The model also has no notion of German allotment-garden scale or typical lot sizes, so coordinate estimates will be inconsistent across photos.

**Consequences:**
- User's first plan contains phantom objects → destroys trust in the core USP
- Multi-photo analysis (3+ perspectives) increases contradiction probability: each image may produce different coordinates for the same physical object
- Cost: each garden analysis sends 3+ images (M1 spec), costing ~$0.015–$0.048 per call at 1.15 MP resolution

**Prevention:**
- Include `"confidence": "high|medium|low"` and `"reasoning": "string"` for every detected element in the JSON schema. Low-confidence elements must be presented as "Vorschlag (unsicher)" in the UI, not as confirmed facts.
- Add an explicit instruction: "If you cannot reliably determine an element's position, set confidence to 'low' and explain why. Do NOT invent positions."
- Always render "erkannte Elemente zum Bestätigen" confirmation step (already in M1 spec) — this is the safety valve. Never skip it.
- Test with poor-quality inputs (overcast day, single oblique angle) before shipping M1, not after.
- Cache raw Claude JSON responses in Supabase (already planned) — enables debugging without re-burning API budget.

**Warning signs:** All 3 photos return the same confidence level regardless of quality; elements appear in geographically impossible positions relative to stated lot dimensions; the plan looks "too good" for a fuzzy photo.

**Phase:** M1 is the highest-risk phase. Build the confirmation UX before wiring Claude Vision, not after.

---

### CRITICAL-3: SVG Touch Event Platform Divergence — iOS vs Android vs Web

**What goes wrong:** react-native-svg has fundamentally different touch-event behavior across platforms:
- **Android**: SVG elements swallow touch events. Gestures intended for a pan-zoom container are consumed by child SVG shapes. An `<Svg>` placed over other UI blocks all underlying touch.
- **iOS**: Touch events pass through SVG to underlying elements — the opposite behavior. `onPress` hitboxes on `<G>` elements do NOT scale and pan with transform changes (confirmed open issue, react-native-svg #2809).
- **Web**: Standard pointer events work, but `pointerEvents` CSS prop set on native does not translate to web (reported January 2025).

**Why it happens:** react-native-svg wraps platform-native SVG renderers, which have different event models. The library's event normalization layer is incomplete.

**Consequences:**
- Drag-to-place plant elements works on one platform, is broken on another
- Pinch-to-zoom gesture fights with element selection — whichever gesture captures first wins
- iOS hitbox drift after zoom: user taps where element appears to be; actual hitbox is elsewhere

**Prevention:**
- Use `react-native-gesture-handler` (RNGH) for ALL gestures on the SVG canvas. Never use React Native's built-in PanResponder for this.
- For element selection after zoom/pan: always recompute screen-to-SVG coordinate transform (`x = (screenX - translateX) / scale`, `y = (screenY - translateY) / scale`). Never rely on SVG intrinsic hit testing after a transform is applied.
- Platform-test gesture interactions on a real iPhone (not simulator) from the first interactive prototype. Simulators cannot reproduce multi-touch.
- Use Gesture Detector wrapping the outer SVG, with `simultaneousHandlers` for pan and pinch gestures to prevent gesture competition.

**Warning signs:** "Works on Android, broken on iPhone" or vice versa; elements can't be selected after zoom; pinch-zoom causes accidental element moves.

**Phase:** M2 (SVG editor). Prototype gesture stack on real hardware before building the full element library.

---

### CRITICAL-4: Supabase Edge Function CPU Limit Kills Multi-Image Vision Analysis

**What goes wrong:** Supabase Edge Functions have a hard **2-second CPU execution time limit per request** (separate from the 150-second wall-clock limit). Claude Vision API calls for a 3-photo garden analysis (`await anthropic.messages.create(...)`) are I/O-bound — they block on network waiting for Claude's response (typically 3–12 seconds per call). However, if any synchronous JavaScript processing before/after the API call exceeds 2 seconds of CPU time (e.g., base64 encoding 3 large images, JSON parsing, schema validation), the function is killed.

**Why it happens:** Edge Functions run on Deno isolates with strict CPU quotas to prevent runaway compute on shared infrastructure. The CPU limit counts only actual CPU cycles, not I/O wait — but heavy image pre-processing (resize, compress, base64-encode 3 photos) can burn through 2s CPU easily.

**Consequences:**
- The core M1 feature (photo → plan) fails silently or returns 504 after 150s
- No partial results returned to client; user sees a spinner, then an error

**Prevention:**
- Resize and compress all photos **client-side** before uploading to the Edge Function. Use `expo-image-manipulator` to resize to max 1092x1092 px (1.15 MP — Claude's optimal input). This moves CPU-heavy work off the Edge Function.
- Upload compressed images to Supabase Storage first, then pass `file_id` references (Files API) to Claude — keeps request payload small and avoids base64 encoding in the Edge Function.
- If processing multiple photos: make individual Claude calls per image, not one call with all images at once. Allows partial results if one call fails.
- Benchmark the Edge Function with a representative photo set during M1 development — not at integration testing time.

**Warning signs:** Sporadic 504 errors on the garden analysis endpoint; function times out only on large photos; works in local dev (Supabase local has no CPU limit) but fails in production.

**Phase:** M1 architecture decision. Resolve before writing the Edge Function.

---

## High-Risk Areas

Significant risks with concrete mitigations. These do not block the project but will cause pain if ignored.

---

### HIGH-1: Expo Web Export — Camera and FileSystem Unavailability

**What breaks:** On the web export, `expo-camera` has limited browser support. It was historically broken outside Safari desktop. Recent versions have improved, but mobile Chrome and Firefox on the web target remain unreliable for camera access. More critically, `expo-file-system` has no meaningful web implementation — the browser does not have a writable filesystem. The offline photo queue (photo → base64 → queue → upload when online) breaks entirely on web because there is no `FileSystem.writeAsStringAsync` equivalent.

**Mitigation:**
- For the Desktop-Browser target: replace camera capture with `<input type="file" accept="image/*" capture="environment">` — this uses the browser's native file picker/camera API universally.
- For the photo queue on web: store base64 blobs in IndexedDB (not the file system). Use a unified `PhotoQueueService` that detects `Platform.OS === 'web'` and uses IndexedDB, while native uses `expo-file-system`.
- Never use `expo-file-system` APIs in shared code. Wrap behind the same storage abstraction as SQLite (see CRITICAL-1).

**Warning signs:** Web users cannot take photos; photo queue crashes silently on web; `FileSystem.documentDirectory` returns null or undefined in browser.

**Phase:** M1 (first camera usage). Handle platform divergence at the point of first integration.

---

### HIGH-2: SVG Performance — Re-render Storm at 200 Elements

**What breaks:** react-native-svg re-renders the entire SVG tree on any state change. With 200 elements (plants, infrastructure, paths), a single drag operation triggers 200+ component re-renders per animation frame, making it impossible to achieve the 60 fps target.

**Mitigation:**
- Memoize every SVG element component with `React.memo`. The element only re-renders when its own position/properties change.
- Lift zoom/pan transform state out of React state into a `react-native-reanimated` shared value (`useSharedValue`). Transform the root `<G>` via `useAnimatedProps` — this runs on the UI thread and never triggers JS re-renders.
- For the actively dragged element: render it in a separate top-level `<G>` overlaid on the canvas. Only one element re-renders during drag; the rest are frozen.
- Profile with React DevTools Profiler at 100 elements (the threshold that will definitely occur in M2) before building the 200-element case.
- Skia (`@shopify/react-native-skia`) is the upgrade path if SVG performance proves insufficient. The switching cost is high (full rewrite of all drawing code), so it must be decided before M2 reaches 50+ elements in production.

**Skia switching cost:** Skia uses an imperative draw-call API, not JSX element trees. All `<Rect>`, `<Circle>`, `<Path>` components must be replaced with Skia equivalents. Estimated effort: 3–5 days of dedicated refactoring. Plan this as a known spike in M2 if profiling shows SVG can't hit 60 fps.

**Warning signs:** Frame time > 16ms in React DevTools during drag with 50+ elements; garbage collector pauses during animation; Flipper JS thread shows > 80% CPU on pan gestures.

**Phase:** M2. Commit to Skia upgrade decision by M2 milestone, not after.

---

### HIGH-3: Offline Sync — Photo Queue Corruption on Reconnect

**What breaks:** When a user takes photos offline, they are queued in local storage. On reconnect, the sync process uploads them to Supabase Storage and triggers the Edge Function for analysis. If the upload succeeds but the Edge Function times out, or if the app is killed mid-upload, the queue entry remains in a half-processed state — the photo exists in Storage but no analysis record exists in the DB. On next reconnect, the queue replays and attempts a duplicate upload.

**Mitigation:**
- Implement a state machine for each queue entry: `pending → uploading → uploaded → analyzing → complete | failed`. Never transition directly from `pending` to `deleted`.
- Use idempotency: generate a deterministic `operation_id` (e.g., `sha256(photoUri + timestamp)`) and pass it to the Edge Function. If the function is called with a duplicate `operation_id`, return the cached result.
- Store `operation_id` in expo-sqlite queue table. On reconnect, check for entries in `uploading` state older than 5 minutes and reset them to `pending`.
- Supabase Storage upload is idempotent by file path — uploading the same file twice to the same path is safe.

**Warning signs:** User reports duplicate photos in their plan; analysis runs twice for the same photo; plan shows the same element twice.

**Phase:** M1 (offline photo queue is a core requirement). Design the state machine before implementing upload logic.

---

### HIGH-4: Supabase RLS — "Working in SQL Editor" Trap

**What breaks:** Supabase SQL Editor runs as the `postgres` superuser, bypassing all RLS policies. Every query returns results, even if RLS policies are wrong or missing. Developers test in SQL Editor, see correct results, deploy, and then authenticated users see empty tables.

For this project (single-user MVP now, multi-user later), the risk is:
1. Ship with `RLS: disabled` for speed → retrofitting RLS later requires backfilling `user_id` on every row and writing policies without breaking Dirk's existing data.
2. Write RLS policies with missing `WITH CHECK` clauses → future multi-user mode allows users to steal each other's garden data.

**Mitigation:**
- Enable RLS on every table from migration 001. Even for single-user MVP, use `auth.uid() = user_id` policies. This costs nothing now and prevents a painful migration later.
- Always test auth-scoped queries through the Supabase JS client with a real session token, never through SQL Editor for auth validation.
- Add `CREATE INDEX ON garden_plans(user_id)` (and every other `user_id` column) in the same migration that creates the table. A missing index on `user_id` causes full table scans when RLS evaluates `auth.uid() = user_id` on every row.
- For the "local without account" mode: use a synthetic UUID stored in `expo-secure-store` as the `user_id` for local-mode rows. This preserves the RLS pattern even without Supabase Auth.

**Warning signs:** App works for developer but returns empty results for test users; Supabase logs show sequential scans on large tables; query time degrades as data grows.

**Phase:** Establish in the Supabase schema setup (pre-M1). Never skip.

---

### HIGH-5: Claude Vision Latency — User Will Abandon the Flow

**What breaks:** A 3-photo garden analysis requires 3 sequential or parallel Claude Vision calls. Each call at 1.15 MP image size takes approximately 3–8 seconds (time-to-first-token, then streaming). Sequential calls = 9–24 seconds of wait. The M1 spec requires this to complete before rendering the garden plan. Users on mobile routinely abandon flows that take > 10 seconds.

**Mitigation:**
- Run all 3 Claude Vision calls in parallel (`Promise.all`). This reduces total latency to the slowest single call (~6–10 seconds) rather than the sum.
- Show a meaningful progress UI: "Analysiere Foto 1 von 3... erkenne Elemente..." rather than a generic spinner. Streaming partial results from the Edge Function (Server-Sent Events or chunked JSON) allows progressive rendering.
- For the Edge Function: use `Response` streaming — send each detected element as it comes from Claude, render on the client progressively. User sees something appearing within 3–4 seconds.
- Consider offering "Schnell-Analyse" (1 photo) vs "Vollständige Analyse" (3 photos) — let the user choose speed vs accuracy.
- The 150-second Edge Function wall-clock limit is not a concern for 3 parallel calls, but 10+ parallel calls (e.g., bulk seed-packet analysis in M3) would be.

**Warning signs:** Users drop off at the "Warte auf Analyse..." screen; support requests about the app being frozen; analytics showing high abandonment rate at the vision step.

**Phase:** M1 UX design. The progress UI must be designed before the Edge Function is built, not added as an afterthought.

---

### HIGH-6: Expo SDK Upgrades — New Architecture Compatibility Risk

**What breaks:** As of Expo SDK 53 (current), the New Architecture (Fabric/JSI) is enabled by default. As of React Native 0.82, it **cannot be disabled**. Libraries that have not been updated for New Architecture will fail silently or crash. Key libraries for this project:
- `react-native-svg`: New Architecture compatible since v14, but older versions are not
- `@shopify/react-native-skia`: New Architecture required
- `react-native-gesture-handler`: New Architecture compatible since v2

**EAS Build complexity:** Free tier builds queue behind paid builds — wait times of 30–90 minutes have been reported. Each Expo SDK upgrade typically requires a new binary build (cannot be OTA-updated). The upgrade from SDK 50 → 51 was documented as a "multi-day debugging odyssey" involving Podfile conflicts, EAS config changes, and native module incompatibilities.

**Mitigation:**
- Lock to a single Expo SDK version for the entire MVP. Do not upgrade during M1–M5 unless a critical security issue forces it.
- Upgrade Expo SDK only between milestones, never mid-milestone. Always read the full CHANGELOG and check react-native-svg, RNGH, and Skia compatibility before upgrading.
- For CI: cache EAS builds with the `cache` key in `eas.json`. Reduces rebuild time by up to 30%.
- Use `expo-updates` for JS-only fixes. Reserve full binary builds for SDK upgrades and native config changes.

**Warning signs:** `NativeModule.xxx is null` errors on a library that worked before; build succeeds locally but fails on EAS; Podfile merge conflicts after `npx expo install`.

**Phase:** Project setup. Pin SDK version immediately, document it in README and CI config.

---

### HIGH-7: Supabase Storage — Silent RLS 403 on File Upload

**What breaks:** Supabase Storage requires explicit RLS policies on the `storage.objects` table. Without them, all uploads return 403 Unauthorized. The error is easy to hit: creating a bucket (even a public one) does not automatically enable upload permissions. The `public` flag on a bucket only affects **read** access (anyone with the URL can download). Write, delete, and move operations still require RLS policies regardless of bucket visibility.

**Additional trap:** If the Supabase client is "infected" with user credentials via `supabase.auth.getUser()` on the service-role client, uploads using the service role key will also fail with RLS errors.

**Mitigation:**
- Create RLS policies on `storage.objects` in the same migration that creates each bucket. Never create a bucket without its policy.
- Photos bucket policy: `auth.uid()::text = (storage.foldername(name))[1]` — user can only upload to their own folder path.
- Keep the service-role client (`supabaseAdmin`) completely separate from the authenticated client. Never call auth methods on the admin client.
- Test uploads from the mobile app with a non-admin user in development, not from SQL Editor or Postman with the service key.

**Warning signs:** 403 errors in React Native fetch logs for storage uploads; uploads work in Supabase dashboard but fail in the app; network errors without clear status code.

**Phase:** M1 (first photo upload). Configure storage policy before writing upload code.

---

## Phase-Specific Warnings

| Phase | Topic | Most Dangerous Pitfall | Mitigation Priority |
|-------|-------|----------------------|---------------------|
| Pre-M1 setup | Storage abstraction | expo-sqlite alpha on web (CRITICAL-1) | Design `StorageAdapter` interface before first SQLite call |
| Pre-M1 setup | Supabase schema | RLS disabled by default (HIGH-4) | Enable RLS + indexes in migration 001 |
| Pre-M1 setup | Storage bucket | Missing upload RLS policies (HIGH-7) | Create policy in same migration as bucket |
| M1: Photo → Plan | Edge Function CPU | 2s CPU limit kills image pre-processing (CRITICAL-4) | Resize images client-side; use Files API |
| M1: Photo → Plan | Claude JSON quality | Hallucinated elements with valid JSON (CRITICAL-2) | Include confidence field + confirmation UX |
| M1: Photo → Plan | Latency | 9–24s sequential analysis (HIGH-5) | Parallel calls + streaming progress UI |
| M1: Photo → Plan | Offline queue | State corruption on reconnect (HIGH-3) | Design state machine (pending → uploading → complete) |
| M1: Web target | Camera / FileSystem | No native APIs on web (HIGH-1) | `<input type="file">` fallback + IndexedDB queue |
| M2: SVG Editor | Gesture handling | Platform divergence iOS/Android/Web (CRITICAL-3) | RNGH Gesture Detector from first interactive prototype |
| M2: SVG Editor | Performance | Re-render storm at 50+ elements (HIGH-2) | Reanimated shared values for transform; memoize elements |
| M2: SVG Editor | Skia decision | Switching cost grows with each milestone (HIGH-2) | Decide Skia upgrade by end of M2 profiling |
| M3: Seed inventory | Vision accuracy | Seed packet text extraction confidence (CRITICAL-2) | Same confirmation pattern as garden analysis |
| M3: Seed inventory | Rate limiting | Bulk packet scanning hits 50 calls/day soft limit | Per-user daily counter in Supabase before processing |
| M4: Calendar | SQLite migrations | Schema changes corrupt existing user data (see below) | Drizzle ORM migration runner from M1 |
| M5: Profile | PDF extraction | Large PDF upload to Edge Function (20MB bundle limit) | Stream PDF to Storage first, process in background |
| Any SDK upgrade | New Architecture | Library incompatibility breaks native modules (HIGH-6) | Never upgrade mid-milestone; full regression test |

---

## Quick Wins to Mitigate Risk

Early decisions that cost little now but eliminate entire categories of risk later.

**1. Abstract storage behind an interface on day one.**
Create `packages/shared/src/storage/` with `StorageAdapter`, `NativeAdapter`, and `WebAdapter` before M1. All feature code uses `StorageAdapter`. This resolves CRITICAL-1 and HIGH-1 in a single architectural decision and costs ~2 hours.

**2. Use Drizzle ORM with expo-sqlite from migration 001.**
Drizzle provides type-safe schema definitions and a migration runner for expo-sqlite. Without it, manual `ALTER TABLE` migrations across app versions are fragile and have caused data wipes in SDK version upgrades (documented issue expo/expo #4980). Cost: ~1 hour setup.

**3. Enable RLS + user_id indexes on every table from the first migration.**
Zero-cost to do now. Expensive to retrofit after data exists. Resolves HIGH-4 entirely and prepares for multi-user without schema changes.

**4. Resize images client-side to 1092x1092 px maximum before any upload.**
Use `expo-image-manipulator`. This: (a) prevents Edge Function CPU limit hits (CRITICAL-4), (b) reduces Claude Vision costs by 60–80% vs sending full 12 MP phone photos, (c) improves Claude time-to-first-token. Implement once in a `PhotoProcessor` utility at M1. Cost: ~30 minutes.

**5. Store a `confidence` field and `raw_response` for every Claude Vision call.**
Store the raw JSON response in a `ai_analysis_log` table. Enables: debugging hallucinations without re-burning API quota, building a test dataset, auditing costs. Cost: 1 extra column + 30 minutes. Value: prevents CRITICAL-2 from being invisible.

**6. Use `react-native-gesture-handler` Gesture API (not PanResponder) from the first touch interaction.**
The new Gesture API from RNGH v2 handles concurrent gestures correctly across platforms. Migrating from PanResponder to RNGH later is painful and causes regression bugs. Cost: declare the dependency and use it exclusively from M2 start.

**7. Write a `GardenDimension` utility that handles coordinate math in one place.**
All conversions between screen pixels, SVG units, and garden meters must flow through a single `toPx(meters, scale)` / `toMeters(px, scale)` utility. Coordinate math scattered across components becomes inconsistent when zoom level or viewport size changes. Cost: ~1 hour. Eliminates an entire class of positioning bugs in M2.

**8. Build a Claude Vision test harness before M1 goes to production.**
Create a small script that sends 5–10 representative garden photos (different quality, angles, seasons) to the Edge Function and logs the JSON output + element count + confidence distribution. Run this before the feature ships, not after Dirk finds a bug in his own garden. Cost: ~2 hours. Value: catches prompt engineering failures before real-user impact.

---

## Sources

- Expo SQLite official docs (web alpha status): https://docs.expo.dev/versions/latest/sdk/sqlite/
- expo-sqlite web issues (SharedArrayBuffer): https://github.com/expo/expo/issues/32918
- Supabase Edge Functions limits (CPU 2s, wall-clock 150s): https://supabase.com/docs/guides/functions/limits
- Supabase Edge Functions cold starts (97% improvement, 42ms median): https://supabase.com/blog/persistent-storage-for-faster-edge-functions
- Supabase RLS pitfalls (testing gap, missing WITH CHECK, index requirement): https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv
- Supabase Storage RLS (public bucket still requires write policies): https://supabase.com/docs/guides/storage/security/access-control
- Claude Vision image size requirements (1.15 MP optimal, 8000x8000 px max): https://platform.claude.com/docs/en/build-with-claude/vision
- Claude structured outputs (schema adherence ≠ correctness): https://platform.claude.com/docs/en/build-with-claude/structured-outputs
- react-native-svg iOS hitbox scaling bug: https://github.com/software-mansion/react-native-svg/issues/2809
- react-native-svg Android touch swallowing: https://github.com/software-mansion/react-native-svg/issues/1034
- React Native Gesture Handler pinch/pan: https://docs.swmansion.com/react-native-gesture-handler/docs/gestures/pinch-gesture/
- react-native-svg vs Skia switching analysis: https://blog.swmansion.com/you-might-not-need-react-native-svg-b5c65646d01f
- Expo SDK upgrade pain (New Architecture, multi-day debugging): https://expo.dev/blog/expo-sdk-upgrade-guide
- Expo New Architecture default (SDK 53+, RN 0.82 cannot disable): https://docs.expo.dev/guides/new-architecture/
- Supabase Realtime reconnect failures on mobile: https://github.com/supabase/realtime-js/issues/463
- expo-sqlite data wipe across SDK versions: https://github.com/expo/expo/issues/4980
- Supabase Storage duplicate upload / state corruption: https://github.com/orgs/supabase/discussions/20321
- EAS Build free tier queue times: https://github.com/expo/fyi/blob/main/eas-build-queues.md
