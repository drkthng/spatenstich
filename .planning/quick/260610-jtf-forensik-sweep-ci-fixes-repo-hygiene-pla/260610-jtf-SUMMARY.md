---
phase: quick-260610-jtf
plan: 01
subsystem: ci/test-infrastructure, editor, planning-docs
tags: [forensic-cleanup, ci-fix, rotated-resize, repo-hygiene, planning-sync]
key-files:
  created:
    - docs/specs/M07-claude-ai-bridge.md
    - docs/test-plans/2026-05-13-full-app-manual.md
    - .planning/phases/09-companion-hinweis/09-UAT.md
    - .planning/BACKLOG.md
  modified:
    - packages/shared/src/types/supabase.ts
    - app/src/lib/__tests__/auth.test.ts
    - app/src/components/editor/web/WebResizeHandle.tsx
    - app/src/components/editor/web/WebRotationHandle.tsx
    - app/src/components/editor/web/WebPlanEditor.tsx
    - app/src/lib/editor/handleGeometry.ts
    - app/src/lib/editor/__tests__/handleGeometry.test.ts
    - app/src/components/editor/__tests__/WebResizeHandle.test.tsx
    - .gitignore
    - .planning/ROADMAP.md
    - .planning/STATE.md
decisions:
  - "Rotated-resize math implemented at WebResizeHandle level; handleGeometry.ts remains axis-aligned pure function"
  - "Platform.OS override scoped to auth.test.ts suite only (beforeAll/afterAll); global mock default 'web' unchanged"
  - "Pre-existing red tests (migrateLocalToAccount.rowtables, useSyncStatus Tests 5+7) confirmed pre-existing via git stash verification — out of scope"
metrics:
  duration: ~45 minutes
  completed: 2026-06-10
  tasks: 3
  files: 14
---

# Quick Task 260610-jtf: Forensik-Sweep CI-Fixes + Repo-Hygiene Summary

**One-liner:** Forensic cleanup restoring green CI (shared typecheck, auth persistence tests, rotated-resize math), pruning 4 orphaned worktrees, and reconciling planning artifacts with post-09.1 reality.

## Per-Task Results

### Task 1: Code + test fixes — shared typecheck, auth tests, rotated-resize

**Commit:** `a7fe823`

**Finding 1 — supabase.ts garbage first line:**
- Deleted `Initialising login role...` (CLI stdout) from line 1 of `packages/shared/src/types/supabase.ts`
- `pnpm --filter @spatenstich/shared typecheck` now exits 0

**Finding 2 — Auth UUID persistence tests:**
- Added `import { Platform } from 'react-native'` to auth.test.ts
- Added `beforeAll(() => { (Platform as { OS: string }).OS = 'ios'; })` and matching `afterAll` reset
- Corrected header comment (mock default is 'web', suite overrides to 'ios')
- Both auth tests now green: "two consecutive calls return the same UUID" + "persisted UUID stored under canonical key name"
- Global mock default in `app/src/__mocks__/react-native.ts` left unchanged

**Finding 3 — Rotated-resize math:**
- `WebResizeHandle.tsx`: Added `rotateDeg?: number` prop; `computeResize` now rotates screen delta to local frame via inverse rotation (`dxLocal = (dxPx*cos(θ) + dyPx*sin(θ)) / scale`, `dyLocal = (-dxPx*sin(θ) + dyPx*cos(θ)) / scale`); center shift computed in local frame then rotated back to world frame
- `WebPlanEditor.tsx`: Pass `rotateDeg={rotateDeg}` to all 4 `<WebResizeHandle>` instances
- `WebRotationHandle.tsx`: Replace `.closest('svg')` with `ownerSVGElement` + null-safe fallback (no `.closest is not a function` in jest mock)
- `handleGeometry.ts`: Removed MVP carve-out comment block; new contract documented
- `handleGeometry.test.ts`: Updated test name/comments to reflect new contract
- `WebResizeHandle.test.tsx`: Added 3 rotated-resize regression tests (rotateDeg=0/90/45) — all green

**Verify results:**
- `pnpm --filter @spatenstich/shared typecheck`: EXIT 0
- `pnpm --filter app exec jest --selectProjects=hooks` auth.test.ts: 4/4 green
- `pnpm --filter app exec jest --selectProjects=editor`: 206/206 green (29/29 suites)

---

### Task 2: Repo hygiene

**Commit:** `11cb575`

**Actions:**
- Deleted `bash.exe.stackdump` (Windows crash dump from repo root)
- Deleted `tsconfig.json` (stray root-level file, each package owns its own)
- Updated `.gitignore`: added `.claude/` rule + `*.stackdump` rule (with German comments)
- Removed 4 orphaned locked worktrees via `git worktree remove -f -f` (required double `-f` for locked worktrees):
  - `agent-a0314858` → removed + branch deleted
  - `agent-a38c4096` → had "filename too long" on `git worktree remove`, directory deleted manually; branch deleted
  - `agent-a38e0e77` → removed + branch deleted
  - `agent-afd8c95f` → removed + branch deleted
- All 4 branches confirmed to have 0 unique commits over ci/test-pr before deletion
- Ran `git worktree prune`
- Committed untracked docs verbatim: `docs/specs/M07-claude-ai-bridge.md`, `docs/test-plans/2026-05-13-full-app-manual.md`, `.planning/phases/09-companion-hinweis/09-UAT.md`

**Verify results:**
- `git worktree list`: only main worktree remains
- `git branch --list "worktree-agent-*"`: empty
- `bash.exe.stackdump` and root `tsconfig.json` gone

**Deviation:** agent-a38c4096 worktree removal failed with "Filename too long" error (Windows path limit). Directory removed via `rm -rf`, worktree stale reference cleaned by `git worktree prune`. Outcome identical: branch deleted, worktree pruned.

---

### Task 3: Planning consistency + final gate

**Commit:** `8d3db16`

**ROADMAP.md changes:**
- Phase 9 list: `- [ ]` → `- [x]` with date (2026-05-29)
- Phase 3 list: updated to note SyncTriggers.ts wiring confirmed closed (2026-06-10)
- Phase 3 detail block: `⚠ 6/7 ... gap closure offen` → `✅ Code Complete 2026-06-10` with SyncTriggers.ts reference
- Progress table Phase 3: `6/7 | ⚠ Gap pending | -` → `7/7 | ✅ Code Complete | 2026-06-10`
- Progress table Phase 9: `0/4 | Not started | -` → `4/4 | ✅ Complete | 2026-05-29`

**BACKLOG.md changes:**
- Item 999.1: Added `**Status:** ✅ Erledigt (Phase 09.1 ElementEditorModal, 2026-05-29)` with reference to modal plan

**STATE.md changes:**
- Current Position: Updated from stale "Phase 8 1/4 25%" to reflect Phase 09.1 complete, Phase 10 next
- Blockers: Removed stale uploadPending gap; marked DEFERRED-1 as resolved; noted pre-existing test failures
- Session Continuity: Updated timestamp and next-step

**Final gate results:**
- `pnpm --filter app typecheck`: EXIT 0
- `pnpm --filter @spatenstich/shared typecheck`: EXIT 0
- `pnpm --filter app test`: 637 passed, 3 pre-existing failures (see Deferred below)
- `pnpm --filter @spatenstich/shared test`: 61 passed, 0 failures

---

## Commits

| Commit | Type | Description |
|--------|------|-------------|
| `a7fe823` | fix | Task 1: shared typecheck garbage line, auth Platform mock, rotated-resize math |
| `11cb575` | chore | Task 2: repo hygiene — stackdump+tsconfig, gitignore, worktrees, docs |
| `8d3db16` | docs | Task 3: ROADMAP Phase 9+3 reconciled, BACKLOG 999.1 erledigt, STATE position |

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] WebRotationHandle: e.currentTarget null in jest mock**
- **Found during:** Task 1 — first run of WebRotationHandle tests after ownerSVGElement fix
- **Issue:** Test passes plain object as event; `e.currentTarget` is undefined; accessing `.ownerSVGElement` throws
- **Fix:** Added null-safe optional chaining `currentTarget?.ownerSVGElement ?? null` and null check before calling `getBoundingClientRect()`
- **Files modified:** `app/src/components/editor/web/WebRotationHandle.tsx`
- **Commit:** `a7fe823`

**2. [Rule 3 - Worktree Removal] agent-a38c4096: Windows filename too long**
- **Found during:** Task 2 — worktree removal
- **Issue:** `git worktree remove -f -f` failed with "Filename too long" on Windows for agent-a38c4096
- **Fix:** Removed directory via `rm -rf`, ran `git worktree prune` to clean stale reference, deleted branch manually
- **Outcome:** Identical to `git worktree remove`

### Pre-existing Failures — im Orchestrator-Nachtrag gefixt (Commit 4)

**Ursprünglich vom Executor als out-of-scope deklariert, dann vom Orchestrator analysiert und behoben:**

1. `useSyncStatus.test.ts` Tests 5+7: Root Cause war der lazy-init `storage`-Proxy
   (`app/src/storage/index.web.ts` + `index.native.ts`): get-Trap delegiert an den echten
   Adapter, aber es gab keinen set-Trap → `jest.spyOn(storage, 'listOutboxEntries')`
   installierte den Mock im leeren Dummy-Target und bekam beim Rück-Lesen die ECHTE
   Funktion zurück (`.mock` undefined, `.mockClear` not a function). Fix: set/has/
   getOwnPropertyDescriptor/defineProperty-Traps delegieren jetzt ebenfalls an
   `createStorage()`. Kein Test-Code geändert — beide Tests sofort grün.

2. `migrateLocalToAccount.rowtables.test.ts` Test 1: Test erwartete 6 Entities inkl.
   `photo_queue` — `photo_queue` war aber nie Teil von `EntityName` (Foto-Queue ist
   dateibasiert via photoQueueRepo, kein Row-Sync). Der TDD-RED-Test aus Plan 03-03
   wurde nie an die finale Entity-Architektur angeglichen. Fix: Test auf die realen
   5 Row-Sync-Entities angepasst; Docstring von `bootstrapRowTables` korrigiert
   (sagte fälschlich "all 6 entities"); Kommentar ergänzt, dass spätere Entities
   (plan_elements, imports, drafts) kein Bootstrap brauchen (lastPullAt=null →
   harmloser Full-Pull).

---

## Worktree Removal Confirmation

All 4 orphaned worktree branches confirmed to have 0 unique commits over ci/test-pr before deletion:

```
git log ci/test-pr..worktree-agent-a0314858 --oneline  # (empty)
git log ci/test-pr..worktree-agent-a38c4096 --oneline  # (empty)
git log ci/test-pr..worktree-agent-a38e0e77 --oneline  # (empty)
git log ci/test-pr..worktree-agent-afd8c95f --oneline  # (empty)
```

No unique commits left in place. All 4 removed.

---

## Self-Check: PASSED

- `packages/shared/src/types/supabase.ts` — first line is `export type Json =` ✓
- `app/src/components/editor/web/WebResizeHandle.tsx` — contains `rotateDeg` prop and inverse rotation math ✓
- `.gitignore` — contains `.claude/` and `*.stackdump` rules ✓
- Commits `a7fe823`, `11cb575`, `8d3db16` exist on branch `ci/test-pr` ✓
- Branch: `ci/test-pr` (never switched) ✓
- 3 commits each containing `quick-260610-jtf` ✓
