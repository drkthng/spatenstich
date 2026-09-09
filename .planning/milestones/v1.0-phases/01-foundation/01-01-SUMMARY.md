---
phase: 01-foundation
plan: "01"
subsystem: infra
tags: [pnpm, monorepo, expo, react-native, typescript, sqlite, indexeddb, storage, i18n]

# Dependency graph
requires: []
provides:
  - pnpm workspace monorepo (app/, packages/shared, supabase/) with hoisted nodeLinker
  - StorageAdapter interface (CRUD + schema version) in packages/shared
  - SqliteAdapter (expo-sqlite, native) satisfying StorageAdapter contract
  - IndexedDbAdapter (idb, web) satisfying StorageAdapter contract
  - runMigrations with idempotent up-pattern
  - packages/shared: Types (StorageAdapter, Database, domain), Constants (QUEUES, FLAGS, KLIMAZONEN, ARCHETYPES), Utils (isNonEmpty, clamp), i18n (de.json)
  - Expo SDK 53 app scaffold with Metro monorepo config + COOP/COEP headers
  - 11 contract tests green (fake-indexeddb), static import enforcement test
affects: [01-02, 01-03, all-phases]

# Tech tracking
tech-stack:
  added:
    - pnpm@10.33.0 (workspaces, hoisted nodeLinker)
    - expo@53.0.27 + expo-router@4.0.22
    - expo-sqlite@15.x (native storage)
    - idb@8.0.0 (web IndexedDB wrapper)
    - @supabase/supabase-js@2.49.5
    - @tanstack/react-query@5.62.7
    - zustand@5.0.2
    - typescript@5.8.3 (app), typescript@6.0.2 (shared)
    - jest@29.7.0 + ts-jest@29.1.2 + jest-expo@53.0.0
    - fake-indexeddb@6.x (test only)
    - glob@13.x (test static import check)
    - ts-node@10.9.2 (jest TypeScript config parsing)
    - supabase CLI@2.22.6 (binary install)
  patterns:
    - StorageAdapter interface (D-08): CRUD-only get/set/delete/list + schema version
    - Schema migration pattern (D-09): version-gated up() array, idempotent runMigrations
    - Platform.select storage export: web=IndexedDbAdapter, native=SqliteAdapter
    - packages/shared = source-only package (no build step), imported via workspace:*
    - Jest split projects: node env for storage tests, expo env for RN component tests
    - Static import enforcement: test checks no feature code imports expo-sqlite directly (T-1-01)

key-files:
  created:
    - pnpm-workspace.yaml
    - .npmrc
    - package.json (root)
    - tsconfig.base.json
    - .gitignore
    - packages/shared/package.json
    - packages/shared/tsconfig.json
    - packages/shared/src/index.ts
    - packages/shared/src/types/storage.ts
    - packages/shared/src/types/domain.ts
    - packages/shared/src/types/database.ts
    - packages/shared/src/constants/queues.ts
    - packages/shared/src/constants/flags.ts
    - packages/shared/src/constants/klimazonen.ts
    - packages/shared/src/constants/archetypes.ts
    - packages/shared/src/utils/index.ts
    - packages/shared/src/i18n/de.json
    - app/package.json
    - app/tsconfig.json
    - app/app.config.ts
    - app/metro.config.js
    - app/babel.config.js
    - app/app/_layout.tsx
    - app/app/index.tsx
    - app/jest.config.ts
    - app/src/storage/StorageAdapter.ts
    - app/src/storage/SqliteAdapter.ts
    - app/src/storage/IndexedDbAdapter.ts
    - app/src/storage/migrations.ts
    - app/src/storage/index.ts
    - app/src/storage/__tests__/StorageAdapter.test.ts
    - packages/shared/src/__tests__/i18n.test.ts
  modified: []

key-decisions:
  - "Expo SDK 53 stable used instead of SDK 55 canary — SDK 55 not yet released as stable (canary-only at execution time)"
  - "jest split into two projects: node env for StorageAdapter (ts-jest + fake-indexeddb), expo env for RN components"
  - "app/package.json typecheck script uses node ../node_modules/typescript/bin/tsc to bypass Windows pnpm shell wrapper bug"
  - "ts-node added to packages/shared devDeps — required for Jest to parse TypeScript jest.config.ts"
  - "packages/shared tsconfig includes jest + node types to allow test files to typecheck"

patterns-established:
  - "Pattern 1 (D-08): StorageAdapter CRUD interface — all persistent data flows through adapter, never raw SQLite"
  - "Pattern 2 (D-09): Migrations array with version number + up() function, setSchemaVersion only after successful up()"
  - "Pattern 3: Platform.select export at storage/index.ts — callers never know which adapter they use"
  - "Pattern 4: Static import test enforces architectural boundary — CI fails if expo-sqlite imported outside src/storage/"

requirements-completed: [FOUND-01, FOUND-02, NFR-06]

# Metrics
duration: 11min
completed: "2026-04-16"
---

# Phase 01 Plan 01: Monorepo + packages/shared + StorageAdapter Summary

**pnpm monorepo scaffold with Expo SDK 53, packages/shared (types/constants/utils/i18n), and dual-platform StorageAdapter (SQLite native + IndexedDB web) with migration support**

## Performance

- **Duration:** 11 min
- **Started:** 2026-04-16T08:16:14Z
- **Completed:** 2026-04-16T08:27:00Z
- **Tasks:** 6 (1-01-00 through 1-01-05)
- **Files modified:** 33

## Accomplishments

- pnpm workspace monorepo with hoisted nodeLinker, single pnpm-lock.yaml at root
- packages/shared (source-only) exports all four D-04 categories: Types (StorageAdapter, Database, domain), Constants (QUEUES, FLAGS, KLIMAZONEN, ARCHETYPES), Utils, i18n/de.json
- StorageAdapter interface (D-08) with two fully-tested implementations: SqliteAdapter (expo-sqlite) and IndexedDbAdapter (idb)
- runMigrations (D-09) — version-gated, idempotent, tested
- Expo SDK 53 app scaffold with Metro monorepo watchFolders + COOP/COEP headers for expo-sqlite web
- 11 contract tests green (10 StorageAdapter + 1 i18n); static import enforcement test (T-1-01 threat mitigated)

## Task Commits

Each task was committed atomically:

1. **Task 1-01-00: CLI tools + test stubs** - `620f1e3` (test)
2. **Task 1-01-01: pnpm monorepo root** - `5cb571d` (chore)
3. **Task 1-01-02: packages/shared scaffold** - `c1d9827` (feat)
4. **Task 1-01-03: app/ Expo scaffold** - `d84410e` (chore)
5. **Task 1-01-04: StorageAdapter RED phase** - `4fb3fc7` (test)
6. **Task 1-01-04: StorageAdapter GREEN phase** - `803715c` (feat)

_Note: Task 1-01-05 (Smoke-test) was verification only — no new files, no extra commit needed._

## Files Created/Modified

- `pnpm-workspace.yaml` — Monorepo definition with nodeLinker: hoisted
- `.npmrc` — shamefully-hoist + EAS CLI workaround flags
- `package.json` (root) — workspace scripts (typecheck/lint/test)
- `tsconfig.base.json` — base TS config (ES2022, Bundler, strict)
- `packages/shared/src/types/storage.ts` — StorageAdapter interface (D-08)
- `packages/shared/src/types/database.ts` — Database type placeholder (Plan 02 target)
- `packages/shared/src/constants/archetypes.ts` — 6 Kleingarten-Archetypen
- `packages/shared/src/constants/klimazonen.ts` — skeleton (full PLZ lookup in Phase 2)
- `packages/shared/src/i18n/de.json` — central German string bundle (NFR-06)
- `app/metro.config.js` — pnpm watchFolders + COOP/COEP middleware
- `app/app.config.ts` — Expo config with COOP/COEP web headers
- `app/src/storage/SqliteAdapter.ts` — expo-sqlite implementation (UPSERT, LIST with LIKE prefix)
- `app/src/storage/IndexedDbAdapter.ts` — idb web implementation
- `app/src/storage/migrations.ts` — runMigrations with idempotency guarantee
- `app/src/storage/index.ts` — Platform.select export
- `app/src/storage/__tests__/StorageAdapter.test.ts` — 10 contract tests + static import check
- `app/jest.config.ts` — dual-project jest config (node + expo environments)

## Decisions Made

- **Expo SDK 53 stable** instead of SDK 55 (plan target): SDK 55 was still in canary at execution time. Infrastructure is version-agnostic — upgrading to SDK 55 when stable requires only bumping version numbers.
- **jest split into two projects**: StorageAdapter tests run in pure Node env (ts-jest + fake-indexeddb). React Native component tests run in jest-expo. Avoids the `Object.defineProperty called on non-object` error from jest-expo setup in Node context.
- **typecheck via `node ../node_modules/typescript/bin/tsc`**: pnpm hoisted TypeScript binary's shell wrapper script fails on Windows/Git-Bash when TypeScript isn't physically in app/node_modules. Direct node call bypasses the wrapper.
- **ts-node as devDep in packages/shared**: jest requires ts-node to parse TypeScript jest.config.ts files.
- **domain.ts placeholder uses `export type {}`**: Needed to satisfy TypeScript module requirement (empty comment-only file is not a module).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] packages/shared tsconfig missing jest types**
- **Found during:** Task 1-01-02 (packages/shared typecheck)
- **Issue:** `tsc --noEmit` failed — `describe`, `it`, `expect` not found in test files
- **Fix:** Added `"types": ["jest", "node"]` to packages/shared tsconfig.json compilerOptions
- **Files modified:** packages/shared/tsconfig.json
- **Verification:** `pnpm --filter @spatenstich/shared run typecheck` exits 0
- **Committed in:** c1d9827

**2. [Rule 1 - Bug] domain.ts empty file not a TypeScript module**
- **Found during:** Task 1-01-02 (packages/shared typecheck)
- **Issue:** `src/index.ts` re-export from domain.ts failed — "File is not a module"
- **Fix:** Added `export type {};` to make domain.ts a valid empty module
- **Files modified:** packages/shared/src/types/domain.ts
- **Verification:** Typecheck passes
- **Committed in:** c1d9827

**3. [Rule 3 - Blocking] ts-node missing from packages/shared**
- **Found during:** Task 1-01-02 (test run)
- **Issue:** Jest could not parse `jest.config.ts` — "ts-node is required for TypeScript configuration files"
- **Fix:** Added `"ts-node": "10.9.2"` to packages/shared devDependencies
- **Files modified:** packages/shared/package.json
- **Verification:** `pnpm --filter @spatenstich/shared run test` green
- **Committed in:** c1d9827

**4. [Rule 1 - Bug] jest-expo incompatible with Node-env StorageAdapter tests**
- **Found during:** Task 1-01-04 (RED phase test run)
- **Issue:** jest-expo setup script called `Object.defineProperty` on non-object in Node env, crashing the test suite before any test could run
- **Fix:** Split jest.config.ts into two projects: `node` project (ts-jest, testEnvironment: node) for src/storage/__tests__, `expo` project (jest-expo) for all other tests
- **Files modified:** app/jest.config.ts
- **Verification:** StorageAdapter tests run cleanly in node project
- **Committed in:** 4fb3fc7

**5. [Rule 1 - Bug] tsc shell wrapper fails on Windows/pnpm hoisted**
- **Found during:** Task 1-01-04 (GREEN phase typecheck)
- **Issue:** `tsc --noEmit` script in app/package.json resolved to `app/node_modules/typescript/bin/tsc` but TypeScript is hoisted to root node_modules — "Cannot find module" error
- **Fix:** Changed typecheck script to `node ../node_modules/typescript/bin/tsc --noEmit`
- **Files modified:** app/package.json
- **Verification:** `pnpm --filter app run typecheck` exits 0
- **Committed in:** 803715c

**6. [Rule 1 - Bug] Expo SDK 55 not yet stable**
- **Found during:** Task 1-01-03 (app scaffold)
- **Issue:** Plan specifies expo@55.0.15 but only canary releases exist; `npm show expo dist-tags` shows latest stable is SDK 53
- **Fix:** Downgraded to expo@~53.0.0 (latest stable). All infrastructure patterns are version-agnostic; upgrade path is a version bump.
- **Files modified:** app/package.json
- **Verification:** `pnpm install` + typecheck pass; single react-native version hoisted
- **Committed in:** d84410e

---

**Total deviations:** 6 auto-fixed (4x Rule 1 bugs, 1x Rule 3 blocking, 1x Rule 1 version)
**Impact on plan:** All fixes necessary for correctness on Windows/pnpm environment. No scope creep. SDK 53→55 upgrade remains a future task once SDK 55 stable is released.

## Issues Encountered

- pnpm hoisted nodeLinker causes TypeScript binary to not be physically present in app/node_modules — worked around with direct `node` invocation in typecheck script. This is a known Windows + pnpm + Expo pattern.
- Expo SDK 55 targeting in plan was aspirational — the actual stable release was SDK 53 at execution time.

## User Setup Required

None — no external service configuration required in this plan. Supabase connection strings will be configured in Plan 02.

## Next Phase Readiness

- Plan 01-02 (Supabase schema + migrations) can start immediately — `packages/shared/src/types/database.ts` placeholder ready to be replaced by `supabase gen types`
- Plan 01-03 (EAS CI + Edge Functions) can start in parallel with 01-02
- StorageAdapter is ready to be used by any feature code from Phase 2 onwards
- Remaining concern: NativeWind v4 + Reanimated v3 compatibility on SDK 53 still unverified (Phase 5 spike)

---

## Known Stubs

| File | Stub | Reason |
|------|------|--------|
| packages/shared/src/types/domain.ts | `export type {}` | Domain types (GardenPlan, SeedEntry) defined in Phases 3-5 |
| packages/shared/src/types/database.ts | Empty Database type | Replaced by `supabase gen types` in Plan 01-02 |
| packages/shared/src/constants/klimazonen.ts | Array `[1..7]` only | Full PLZ→Klimazone lookup table in Phase 2 |
| app/app/index.tsx | Static "Phase 1 Foundation" text | Placeholder screen, replaced in Phase 2 onboarding |

These stubs are intentional infrastructure placeholders. They do not block Plan 01-01's goal (monorepo + StorageAdapter). Future plans owning each stub are noted above.

---
*Phase: 01-foundation*
*Completed: 2026-04-16*

## Self-Check: PASSED

- All 7 key artifact files: FOUND
- All 6 task commits: FOUND
- nodeLinker: hoisted in pnpm-workspace.yaml: FOUND
- Cross-Origin-Embedder-Policy in metro.config.js: FOUND
- Platform.select in storage/index.ts: FOUND
