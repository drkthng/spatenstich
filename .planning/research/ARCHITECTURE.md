# Architecture Research: Kleingarten-App

**Researched:** 2026-04-14
**Confidence:** HIGH (stack choices) / MEDIUM (sync specifics, editor patterns)

---

## System Components

### Component Map

```
┌─────────────────────────────────────────────────────────────────┐
│  MOBILE APP  (Expo / React Native + Web export)                 │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  UI Layer    │  │  State Layer │  │  Persistence Layer   │  │
│  │  (Screens +  │◄─►  (Zustand   │◄─►  (expo-sqlite via    │  │
│  │   SVG Editor)│  │   Stores)    │  │   drizzle-orm)       │  │
│  └──────┬───────┘  └──────────────┘  └──────────┬───────────┘  │
│         │                                        │              │
│  ┌──────▼───────────────────────────────────────▼───────────┐  │
│  │  Sync Layer  (SyncManager — outbox queue + cursor pull)  │  │
│  └──────────────────────────┬────────────────────────────────┘  │
└─────────────────────────────┼───────────────────────────────────┘
                              │ HTTPS / Supabase JS client
┌─────────────────────────────▼───────────────────────────────────┐
│  SUPABASE BACKEND  (Frankfurt, EU)                              │
│                                                                 │
│  ┌────────────┐  ┌─────────────────┐  ┌──────────────────────┐ │
│  │  Auth      │  │  Postgres DB    │  │  Supabase Storage    │ │
│  │  (JWT/     │  │  (RLS enabled,  │  │  (photo uploads,     │ │
│  │  anon key) │  │  feature flags) │  │  encrypted at rest)  │ │
│  └────────────┘  └────────┬────────┘  └──────────────────────┘ │
│                           │                                     │
│  ┌────────────────────────▼────────────────────────────────┐   │
│  │  Edge Functions                                          │   │
│  │  ┌─────────────────┐   ┌────────────────────────────┐  │   │
│  │  │  ai-vision/     │   │  sync-push / sync-pull     │  │   │
│  │  │  (pgmq consumer │   │  (outbox ingestion,        │  │   │
│  │  │  → Claude API)  │   │  cursor-based pull)        │  │   │
│  │  └─────────────────┘   └────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────────────────────────────┐                      │
│  │  pgmq  (ai_jobs queue)               │                      │
│  │  pg_cron  (polling schedule)         │                      │
│  └──────────────────────────────────────┘                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                   ┌──────────▼──────────┐
                   │  packages/shared    │
                   │  (Zod schemas,      │
                   │  TypeScript types,  │
                   │  constants, utils)  │
                   └─────────────────────┘
```

### Component Boundaries

| Component | Owns | Communicates With | Does NOT own |
|-----------|------|-------------------|--------------|
| UI Layer (Screens) | Visual presentation, user input | Zustand stores (read/write) | Business logic, DB access |
| SVG Plan Editor | Canvas render, gesture state (Reanimated shared values) | planStore (Zustand), zundo history | Network, DB |
| Zustand Stores | Application state (plan, inventory, profile, AI jobs) | expo-sqlite via repository fns, SyncManager | Remote Supabase directly |
| SyncManager | Outbox queue lifecycle, cursor state, network detection | expo-sqlite (outbox table), Supabase JS client | UI state |
| expo-sqlite (drizzle-orm) | Local schema, migrations, queries | Zustand hydration, SyncManager | Remote data |
| Supabase Auth | Identity, session tokens | App via supabase-js | Local state |
| Supabase Postgres | Source of truth for all user data | Edge Functions, Supabase JS client | App logic |
| Edge Function: ai-vision | Claude API calls, job lifecycle, cost tracking | pgmq, Postgres (ai_jobs table), Supabase Storage | App state |
| Supabase Storage | Photo blobs (photos uploaded per job) | Edge Functions, Supabase JS client | Metadata |
| packages/shared | Types, Zod schemas, constants | app/, supabase/ Edge Functions | Runtime state |

---

## Data Flow

### 1. Normal Read Path (app starts)

```
App Boot
  → Zustand stores hydrate from expo-sqlite (synchronous, <50ms)
  → App renders with local data immediately
  → SyncManager checks network + last sync cursor
  → If online: pull changed rows since cursor from Supabase
  → Merge into expo-sqlite + update Zustand stores
  → UI re-renders with fresh server data
```

### 2. Normal Write Path (user edits garden plan)

```
User drag/drop element in SVG editor
  → Reanimated shared value updates (UI thread, 60fps)
  → onDragEnd fires on JS thread
  → planStore.updateElement(id, position) [Zustand]
  → zundo records snapshot in history stack
  → Auto-save trigger: debounce 5s
    → drizzle-orm: UPDATE plan_elements SET x=?, y=? WHERE id=?
    → outbox INSERT: { type: 'plan.element.update', payload, idempotency_key }
  → SyncManager (background): flush outbox to Supabase
    → POST /sync-push Edge Function → UPSERT to Postgres
    → Mark outbox row as 'done'
```

### 3. AI Vision Job Flow

```
User submits photos
  → Photos uploaded to Supabase Storage (via supabase-js)
  → App inserts row into ai_jobs (status: 'pending') via Supabase JS
  → App inserts message into pgmq 'ai_jobs' queue
  → App sets local job state = 'pending'

Server-side (pg_cron triggers Edge Function every 60s):
  → ai-vision Edge Function reads N messages from pgmq
  → For each message:
    → Fetch photos from Storage
    → Call Claude Vision API with prompt + images
    → Store raw API response JSON in ai_jobs.raw_response
    → Parse structured JSON into ai_jobs.parsed_result
    → UPDATE ai_jobs: status='done', tokens_input=?, tokens_output=?
    → UPDATE usage_ledger: user_id, date, call_count, tokens_total
    → pgmq.delete(message_id)
  → On failure: message remains in queue, visibility timeout → auto-retry

Client poll (TanStack Query, 5s interval while job pending):
  → GET ai_jobs WHERE id = ? AND user_id = ?
  → On status='done': hydrate planStore with parsed_result
  → Show confirmation UI
```

### 4. Feature Flag Read Path

```
App init
  → TanStack Query fetches feature_flags table (all rows, user context)
  → Results cached in memory via React Query
  → TTL: 5 minutes (staletime)
  → useFlagStore() returns boolean for named flag
  → No SQLite caching needed: flags fetched once per session
```

---

## State Management

### Recommendation: Zustand + zundo + TanStack Query

**Zustand** for all local application state. **TanStack Query** for server state (AI job polling, feature flags, seed database). **zundo** (< 700 bytes) as Zustand temporal middleware for undo/redo in the plan editor.

**Rationale:**

- Zustand is the consensus recommendation for React Native in 2025. It works natively with Expo/Hermes, has no bridge overhead, supports middleware (immer for immutability, zundo for history, devtools), and is simple enough for a single-developer project. [HIGH confidence]
- TanStack Query handles server state (polling, caching, stale-while-revalidate) that Zustand should not own. Separating concerns prevents stores from becoming fat with network logic. [HIGH confidence]
- Jotai's atomic model is valuable for fine-grained reactivity but adds complexity. For a single-user app where the garden plan is one interconnected state object (200 elements that need batch operations), Zustand's centralized store is a better fit. [MEDIUM confidence — no direct benchmark found for this exact use case]
- Redux Toolkit is ruled out: overkill for a solo-developer MVP, boilerplate slows iteration.

### Store Structure

```typescript
// app/stores/planStore.ts
interface PlanStore {
  gardenId: string | null
  elements: Record<string, PlanElement>  // keyed by id, O(1) updates
  layers: { infrastructure: string[]; seasonal: Record<number, string[]> }
  gridVisible: boolean
  selectedElementId: string | null
  // Actions
  updateElement: (id: string, patch: Partial<PlanElement>) => void
  addElement: (el: PlanElement) => void
  removeElement: (id: string) => void
}

// app/stores/inventoryStore.ts
// app/stores/profileStore.ts
// app/stores/aiJobStore.ts  (job status, polling trigger)
// app/stores/syncStore.ts   (last sync cursor, queue depth indicator)
```

### Undo/Redo

Use `zundo` middleware wrapping planStore. Limit history depth to 50 states to cap memory. Only include `elements` slice in temporal tracking (not UI state like `gridVisible`).

```typescript
import { temporal } from 'zundo'
const usePlanStore = create(temporal(planSlice, {
  partialize: (state) => ({ elements: state.elements }),
  limit: 50,
}))
const { undo, redo, pastStates } = useStore(usePlanStore.temporal)
```

### Auto-Save

Debounced write to expo-sqlite: 5-second debounce after last element mutation. Triggered by a `useEffect` subscribing to the `elements` slice of planStore. Never write on every drag frame — only on `onDragEnd`. The auto-save also enqueues an outbox row for sync.

---

## Sync Architecture

### Pattern: Outbox Queue (Push) + Cursor Pull

**Decision: Do not use a third-party sync library (PowerSync, Legend-State, Supastash) for MVP.** The single-user, Last-Write-Wins constraint makes the problem simple enough to own directly. Third-party sync libraries add bundle size, schema constraints, and operational complexity that is not justified for a solo-user MVP.

**Confidence: MEDIUM** — verified that third-party solutions exist and work well, but the custom outbox pattern is well-documented and fits the constraints exactly.

### SQLite Schema (key tables)

```sql
-- Local outbox for pending writes
CREATE TABLE outbox (
  id          TEXT PRIMARY KEY,
  type        TEXT NOT NULL,          -- e.g. 'plan.element.update'
  payload     TEXT NOT NULL,          -- JSON string
  idempotency_key TEXT NOT NULL UNIQUE,
  status      TEXT NOT NULL DEFAULT 'pending',  -- pending | done | failed
  attempt_count INTEGER NOT NULL DEFAULT 0,
  next_attempt_at INTEGER NOT NULL DEFAULT 0,   -- unix ms
  created_at  INTEGER NOT NULL
);
CREATE INDEX outbox_dispatch_idx ON outbox(status, next_attempt_at);

-- Sync cursor: which rows have been pulled from server
CREATE TABLE sync_cursors (
  table_name TEXT PRIMARY KEY,
  last_pulled_at TEXT NOT NULL  -- ISO timestamp
);
```

### Push Flow (outbox → Supabase)

```
SyncManager.flush():
  1. SELECT 10 rows WHERE status='pending' AND next_attempt_at <= now()
  2. POST to /sync-push Edge Function with batch of events
  3. Edge Function: for each event → upsert into appropriate Postgres table
  4. On 200: UPDATE outbox SET status='done'
  5. On failure: attempt_count++, next_attempt_at = now + (attempt_count * 2min, max 15min)
```

### Pull Flow (Supabase → SQLite)

```
SyncManager.pull():
  1. Read last_pulled_at from sync_cursors for each table
  2. GET /sync-pull?table=plan_elements&since=<cursor>
     (Edge Function: SELECT * FROM plan_elements WHERE updated_at > $since AND user_id = auth.uid())
  3. UPSERT all returned rows into local SQLite tables
  4. Update sync_cursors.last_pulled_at = now()
```

### Conflict Resolution

**Last-Write-Wins is sufficient** for this app. Rationale:
- Single device is the norm; two-device simultaneous edits are edge cases
- The garden plan is not financial data — minor drift is acceptable
- Both local SQLite rows and Postgres rows carry `updated_at` timestamps
- The push outbox sends the client's `updated_at`; the server upsert compares and keeps whichever is newer

Server upsert pattern:
```sql
INSERT INTO plan_elements (..., updated_at)
VALUES (...)
ON CONFLICT (id) DO UPDATE
  SET ... WHERE plan_elements.updated_at < EXCLUDED.updated_at;
```

This means a stale offline write never clobbers a fresher server state.

### expo-sqlite Configuration

Enable WAL mode on database open to allow concurrent reads during background sync writes:
```typescript
const db = openDatabaseSync('kleingarten.db')
db.execSync('PRAGMA journal_mode = WAL;')
db.execSync('PRAGMA synchronous = NORMAL;')
```

Use **drizzle-orm** (not raw SQL) for type-safe queries. drizzle-orm has first-class expo-sqlite support with migrations via `expo-drizzle-studio-plugin` for development.

---

## SVG Plan Editor Architecture

### Rendering Decision: react-native-svg for MVP, upgrade path to Skia

Start with `react-native-svg` (simpler, well-supported, same API on iOS/Android/Web). The 60fps requirement for 200 elements is achievable if drag gestures run on the UI thread via Reanimated 3.

Upgrade to `@shopify/react-native-skia` if profiling shows frame drops above 50 elements with SVG. Skia is supported in Expo SDK 52+ via `expo-modules`. The API differs significantly, so plan the architecture with an abstraction layer.

**Threshold for upgrade:** Profile on real device. If `react-native-svg` hits < 50fps at 100 elements with Reanimated-driven drags, migrate to Skia (which renders directly on the UI thread via Skia GPU path, not the React tree).

### Coordinate System

Two coordinate spaces must be cleanly separated:

```typescript
// Garden space: real-world meters
type GardenPoint = { x: number; y: number }   // e.g. { x: 3.5, y: 2.0 }

// Screen space: SVG pixels (viewport)
type ScreenPoint = { x: number; y: number }   // e.g. { x: 350, y: 200 }

// Transform: garden meters → screen pixels
const PIXELS_PER_METER = viewportWidth / gardenWidthMeters
const toScreen = (g: GardenPoint): ScreenPoint => ({
  x: g.x * PIXELS_PER_METER + panOffset.x,
  y: g.y * PIXELS_PER_METER + panOffset.y,
})
const toGarden = (s: ScreenPoint): GardenPoint => ({
  x: (s.x - panOffset.x) / PIXELS_PER_METER,
  y: (s.y - panOffset.y) / PIXELS_PER_METER,
})
```

All data stored in planStore and SQLite is in **garden coordinates (meters)**. Screen coordinates are computed only at render time. This means saved data is device-independent and scale-invariant.

The SVG `viewBox` is always `"0 0 gardenWidthMeters gardenHeightMeters"` with a fixed `width`/`height` viewport — the SVG transform handles scaling, not the application code.

### Drag Architecture (60fps requirement)

Use `react-native-gesture-handler` Pan gesture + `react-native-reanimated` shared values for the dragged position. Commit to planStore only on `onEnd`.

```
onBegin → store original position in worklet
onUpdate → update Reanimated shared value (UI thread, no JS bridge)
onEnd → call runOnJS(commitDrag)(id, finalGardenCoords)
       → planStore.updateElement(id, { x, y })
       → enqueue outbox row
```

This keeps every intermediate drag frame off the JS thread. Only the final `onEnd` write crosses to JS.

### State for 200 Elements

Store elements as a `Record<string, PlanElement>` (keyed by id) in Zustand, not an array. This gives O(1) updates for single-element drags without re-rendering the whole list.

Use React.memo on each SVG element component with a selector that reads only that element's slice:
```typescript
const element = usePlanStore(s => s.elements[id])  // only re-renders when this element changes
```

---

## AI Integration Pattern

### Pattern: pgmq + pg_cron + Edge Function Consumer

**Do not call Claude Vision synchronously from the app** — Edge Function timeout (30s default, 150s with background tasks) is too tight for multi-photo analysis. Use async job queue.

### Job Lifecycle

```
Postgres table: ai_jobs
  id              UUID PK
  user_id         UUID FK (auth.users)
  job_type        TEXT  -- 'garden_scan' | 'seed_packet' | 'rules_pdf'
  status          TEXT  -- pending | processing | done | failed
  photo_paths     TEXT[]  -- Supabase Storage paths
  prompt_hash     TEXT  -- for dedup/cache
  raw_response    JSONB  -- full Claude API response (for debugging)
  parsed_result   JSONB  -- extracted structured data
  tokens_input    INTEGER
  tokens_output   INTEGER
  error_message   TEXT
  created_at      TIMESTAMPTZ
  completed_at    TIMESTAMPTZ

Postgres table: usage_ledger
  id          UUID PK
  user_id     UUID FK
  date        DATE
  job_type    TEXT
  call_count  INTEGER DEFAULT 0
  tokens_in   INTEGER DEFAULT 0
  tokens_out  INTEGER DEFAULT 0
  -- UNIQUE(user_id, date, job_type) for upsert-based tracking
```

### Cost Tracking

Claude API responses include `usage.input_tokens` and `usage.output_tokens` in every response body. The Edge Function extracts these and upserts into `usage_ledger` with:
```sql
INSERT INTO usage_ledger (user_id, date, job_type, call_count, tokens_in, tokens_out)
VALUES ($user, NOW()::date, $type, 1, $in, $out)
ON CONFLICT (user_id, date, job_type)
DO UPDATE SET
  call_count = usage_ledger.call_count + 1,
  tokens_in  = usage_ledger.tokens_in  + EXCLUDED.tokens_in,
  tokens_out = usage_ledger.tokens_out + EXCLUDED.tokens_out;
```

**Rate limiting** is enforced in the Edge Function before calling Claude: query `usage_ledger` for today's `call_count` for the user, reject with 429 if above soft limit (50), hard-block at 200.

### Retry Logic

pgmq visibility timeout handles retry automatically: if the Edge Function crashes before calling `pgmq.delete()`, the message reappears after `visibility_timeout_seconds` (set to 300s). No explicit retry table needed — pgmq is the retry mechanism.

Maximum delivery attempts: configure `max_delivery_attempts` on the queue to 3. After 3 failures, message lands in the dead letter queue for investigation.

### Response Storage

Store both `raw_response` (full Claude JSON) and `parsed_result` (structured garden data). The raw response is essential for:
- Debugging unexpected parsing failures
- Re-running the parser without a new API call
- Audit trail for cost disputes

---

## Monorepo Structure

### Layout

```
kleingarten-app/
├── pnpm-workspace.yaml          # packages: ['apps/*', 'packages/*', 'supabase']
├── package.json                 # root dev deps: turbo, typescript, eslint
├── turbo.json                   # optional: build pipeline for CI
├── apps/
│   └── expo/                   # React Native + Expo app
│       ├── app.json
│       ├── metro.config.js      # SDK 52: mostly defaults, watchFolders not needed
│       ├── tsconfig.json        # extends ../../tsconfig.base.json
│       └── src/
│           ├── screens/
│           ├── components/
│           ├── stores/          # Zustand stores
│           ├── sync/            # SyncManager
│           ├── db/              # drizzle schema + migrations
│           └── lib/             # supabase client init
├── packages/
│   └── shared/                 # @kleingarten/shared
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── schemas/         # Zod schemas (PlanElement, InventoryItem, etc.)
│           ├── types/           # TypeScript types inferred from Zod
│           ├── constants/       # klimazonen lookup, archetypen, crop data
│           └── utils/           # pure functions (coordinate transforms, date utils)
└── supabase/
    ├── migrations/              # SQL migrations (numbered)
    ├── functions/               # Edge Functions (Deno)
    │   ├── ai-vision/
    │   ├── sync-push/
    │   └── sync-pull/
    └── seed.sql
```

### What Belongs in packages/shared

| Category | Examples | Rationale |
|----------|----------|-----------|
| Zod schemas | PlanElementSchema, InventoryItemSchema, AiJobSchema | Single source of truth, validated in both app and Edge Functions |
| TypeScript types | `type PlanElement = z.infer<typeof PlanElementSchema>` | Inferred from Zod, never duplicated |
| Domain constants | klimazonenLookup (PLZ → zone), archetypen list, crop categories | Used in app UI and Edge Function logic |
| Pure utils | toGardenCoords, toScreenCoords, formatDate, calculateArea | Zero dependencies, testable in isolation |
| Feature flag keys | `FEATURE_FLAGS` enum | Prevents string typos across app and functions |

**Does NOT belong in shared:** React components, Expo APIs, Supabase client instances, navigation types.

### TypeScript Path Aliases

In `apps/expo/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "paths": {
      "@kleingarten/shared": ["../../packages/shared/src/index.ts"],
      "@/*": ["./src/*"]
    }
  }
}
```

In `apps/expo/metro.config.js`:
```javascript
const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')
const config = getDefaultConfig(__dirname)
config.resolver.extraNodeModules = {
  '@kleingarten/shared': path.resolve(__dirname, '../../packages/shared/src'),
}
module.exports = config
```

Do NOT use a catch-all `@/*` alias in more than one package — scope aliases per package name.

---

## Feature Flag System

### Pattern: Supabase Table + TanStack Query Cache

Simple Postgres table, queried once at app launch, cached in TanStack Query (5-minute stale time):

```sql
CREATE TABLE feature_flags (
  key         TEXT PRIMARY KEY,
  enabled     BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
-- No RLS needed for MVP (single user); add per-user flags if needed later
```

App-side hook:
```typescript
function useFlag(key: string): boolean {
  const { data } = useQuery({
    queryKey: ['feature-flags'],
    queryFn: () => supabase.from('feature_flags').select('key, enabled'),
    staleTime: 5 * 60 * 1000,
  })
  return data?.find(f => f.key === key)?.enabled ?? false
}
```

Flag keys live in `packages/shared/src/constants/featureFlags.ts` as an enum to prevent string typos.

**When to use flags:**
- New features not yet confirmed stable (e.g., `POLYGON_TOOL`, `SEED_SCAN`)
- A/B experiments for future multi-user scenario
- Emergency kill switch for expensive AI features

---

## Build Order Recommendation

Components must be built in dependency order. The sync and DB layer is shared by all features — if it is built wrong, every feature above it is affected.

### Phase Sequence

```
1. FOUNDATION (blocks everything)
   ├── pnpm monorepo scaffold + packages/shared skeleton
   ├── expo-sqlite + drizzle-orm: schema + migrations
   ├── Supabase project: Auth, DB schema, RLS stubs
   ├── Zustand stores (empty slices, no logic)
   └── SyncManager skeleton (compiles, no-ops)

2. AUTH + PROFILE (blocks AI calls and sync)
   ├── Supabase Auth (email/magic link + anon mode)
   ├── profileStore (PLZ, Klimazone, Archetyp)
   └── "Lokal nutzen" mode (skips Auth, uses local-only flag)

3. SYNC LAYER (blocks all data features)
   ├── outbox table + SyncManager push
   ├── sync_cursors + SyncManager pull
   ├── Network detection (expo-network)
   └── Conflict resolution (LWW upsert on server)

4. GARDEN CAPTURE + AI VISION (M1 — core USP)
   ├── Supabase Storage: photo upload
   ├── pgmq queue setup + ai-vision Edge Function
   ├── Claude Vision integration (garden_scan job type)
   ├── usage_ledger + rate limiting
   └── Job polling (TanStack Query, 5s interval)

5. SVG PLAN EDITOR (M2 — depends on AI output from M1)
   ├── Coordinate system (garden meters ↔ screen pixels)
   ├── Static render (SVG from AI parsed_result)
   ├── Pan/zoom (Reanimated + Gesture Handler)
   ├── Drag elements (Reanimated UI thread, onEnd commit)
   ├── Element palette (add/remove)
   ├── Undo/redo (zundo)
   └── Auto-save (5s debounce → SQLite → outbox)
   → Skia upgrade gate: profile at 100 elements, decide here

6. SEED INVENTORY (M3 — parallel to editor, shares AI pattern)
   ├── ai-vision: seed_packet job type
   ├── Sorten-DB (packages/shared constants, 100-150 entries)
   └── inventoryStore + CRUD UI

7. CALENDAR (M4 — depends on inventory + profile)
   ├── Klimazone calendar calculations
   ├── Timeline UI (12-month scroll)
   └── Plan placement suggestions

8. RULES ENGINE (M5 — depends on profile)
   ├── ai-vision: rules_pdf job type
   ├── BKleingG warnings (computed from plan area ratios)
   └── Inline editor warnings

9. FEATURE FLAGS + KILL SWITCHES
   → Can be added at any phase, but wire up in Phase 1
```

### Critical Path

```
Foundation → Sync Layer → AI Vision (M1) → SVG Editor (M2)
```

M1 and M2 are the highest-risk features (novel patterns, performance requirements). Build them early so there is time to recover from design mistakes.

---

## Key Architectural Decisions

| Decision | Recommendation | Alternative | Why Not Alternative | Confidence |
|----------|---------------|-------------|---------------------|------------|
| Client state | Zustand + zundo | Jotai, Redux Toolkit | Jotai: atomic model fits poorly with batch plan operations; Redux: too much boilerplate | HIGH |
| Server state | TanStack Query | SWR, Apollo | SWR: less offline support; Apollo: no REST | HIGH |
| Sync library | Custom outbox (no 3rd party) | PowerSync, Supastash, Legend-State | PowerSync requires schema constraints + $$$; Supastash adds id/timestamp schema constraints; LWW single-user doesn't need CRDTs | MEDIUM |
| Local DB ORM | drizzle-orm | raw expo-sqlite, WatermelonDB | Raw SQL: no type safety; WatermelonDB: heavier, complex setup | MEDIUM |
| SVG renderer (start) | react-native-svg | @shopify/react-native-skia | Skia: steeper API, premature optimization; upgrade when profiling proves need | HIGH |
| Drag performance | Reanimated 3 worklets + Gesture Handler | React DnD, PanResponder | React DnD: web-only; PanResponder: not UI thread | HIGH |
| AI job pattern | pgmq async queue + pg_cron | Direct Edge Function call, Redis/Bull | Direct call: timeout risk on 3+ photos; Redis/Bull: adds infra outside Supabase | HIGH |
| Undo/redo | zundo middleware | Custom useReducer history | Custom: more code, same result; zundo is <700B with battle-tested semantics | HIGH |
| Coordinate system | Garden-coords stored, screen-coords computed | Screen-coords stored | Screen-coords break on device change, zoom change | HIGH |
| Monorepo tool | pnpm workspaces (no Turborepo) | Turborepo, Nx | Turborepo: useful for CI caching but adds config for a solo-dev MVP; add later | MEDIUM |
| Feature flags | Supabase table + TanStack Query | LaunchDarkly, Unleash | External services: overkill for MVP, GDPR complexity | HIGH |

---

## Sources

- [Expo Local-First Guide](https://docs.expo.dev/guides/local-first/)
- [Expo Monorepo Documentation](https://docs.expo.dev/guides/monorepos/)
- [Supabase: Processing Large Jobs with Edge Functions, Cron, and Queues](https://supabase.com/blog/processing-large-jobs-with-edge-functions)
- [Supabase Queues: Consuming Messages with Edge Functions](https://supabase.com/docs/guides/queues/consuming-messages-with-edge-functions)
- [React Native Offline Sync with SQLite Queue (DEV Community)](https://dev.to/sathish_daggula/react-native-offline-sync-with-sqlite-queue-4975)
- [supastash: Offline-First Supabase Sync Engine](https://github.com/0xZekeA/supastash)
- [Zustand vs Jotai Comparison (BetterStack)](https://betterstack.com/community/guides/scaling-nodejs/zustand-vs-redux-toolkit-vs-jotai/)
- [zundo: Undo/Redo Middleware for Zustand](https://github.com/charkour/zundo)
- [Expo pnpm Monorepo Example](https://github.com/byCedric/expo-monorepo-example)
- [React Native Reanimated DnD Library](https://github.com/entropyconquers/react-native-reanimated-dnd)
- [Shopify React Native Skia](https://shopify.github.io/react-native-skia/)
- [The Future of React Native Graphics: WebGPU, Skia (Shopify Engineering, 2025)](https://shopify.engineering/webgpu-skia-web-graphics)
- [TanStack DB 0.6 with Persistence and Offline Support](https://tanstack.com/blog/tanstack-db-0.6-app-ready-with-persistence-and-includes)
- [Fintech Clean Architecture: React Native, Expo, Supabase, Zustand (Medium)](https://medium.com/@seyhunak/fintech-mobile-architecture-clean-architecture-react-native-expo-supabase-backend-with-zustand-5857fb7a531f)
- [Sharing Types with Zod Across a Monorepo (Leapcell)](https://leapcell.io/blog/sharing-types-and-validations-with-zod-across-a-monorepo)
- [Feature Flag System with Next.js and Supabase (freeCodeCamp)](https://www.freecodecamp.org/news/how-to-build-a-production-ready-feature-flag-system-with-nextjs-and-supabase/)
- [Anthropic Usage and Cost API Docs](https://platform.claude.com/docs/en/build-with-claude/usage-cost-api)
