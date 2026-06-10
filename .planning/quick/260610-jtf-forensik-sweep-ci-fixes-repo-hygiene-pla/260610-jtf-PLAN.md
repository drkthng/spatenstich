---
phase: quick-260610-jtf
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/shared/src/types/supabase.ts
  - app/src/lib/__tests__/auth.test.ts
  - app/src/components/editor/web/WebPlanEditor.tsx
  - app/src/components/editor/web/WebResizeHandle.tsx
  - app/src/components/editor/web/WebRotationHandle.tsx
  - app/src/lib/editor/handleGeometry.ts
  - app/src/lib/editor/__tests__/handleGeometry.test.ts
  - app/src/components/editor/__tests__/WebResizeHandle.test.tsx
  - app/src/components/editor/__tests__/WebRotationHandle.test.tsx
  - .gitignore
  - .planning/ROADMAP.md
  - .planning/BACKLOG.md
  - .planning/STATE.md
autonomous: true
requirements: [QUICK-260610-JTF]

must_haves:
  truths:
    - "pnpm --filter @spatenstich/shared typecheck exits 0 (supabase.ts has no CLI garbage line)"
    - "pnpm --filter app exec jest --selectProjects=hooks passes the 2 previously-red auth UUID tests"
    - "pnpm --filter app exec jest --selectProjects=editor is fully green including rotated-resize regression tests"
    - "Dragging a corner handle on a 90deg-rotated element grows the correct local dimension and keeps the opposite corner fixed"
    - "Repo root contains no bash.exe.stackdump and no accidental root tsconfig.json; .claude/ + *.stackdump are gitignored"
    - "docs/specs/M07-claude-ai-bridge.md and docs/test-plans/2026-05-13-full-app-manual.md and 09-UAT.md are tracked in git"
    - "ROADMAP, BACKLOG, STATE reflect reality: Phase 9 complete, Phase 3 gap closed, BACKLOG 999.1 resolved, STATE position reconciled"
    - "Final gate: app + shared typecheck and app + shared test all green"
  artifacts:
    - path: "packages/shared/src/types/supabase.ts"
      provides: "Valid generated Supabase types starting with 'export type Json ='"
      contains: "export type Json ="
    - path: "app/src/components/editor/web/WebResizeHandle.tsx"
      provides: "Rotated-aware resize math (local-frame delta + world-frame center shift)"
    - path: ".gitignore"
      provides: "Ignore rules for .claude/ and *.stackdump"
      contains: ".claude/"
  key_links:
    - from: "WebPlanEditor.tsx resize-handle block"
      to: "WebResizeHandle rotateDeg prop"
      via: "prop pass-through from provenance.rotateDeg"
      pattern: "rotateDeg=\\{"
    - from: "auth.test.ts"
      to: "react-native Platform mock"
      via: "Platform.OS override to 'ios' in beforeAll/afterAll"
      pattern: "Platform.*OS.*=.*'ios'"
---

<objective>
Forensik-Sweep: fix all 6 verified findings from the pre-planning audit so CI is green, the repo is clean, and the .planning artifacts match reality. This closes the broken shared typecheck (CLI stdout garbage), two red auth tests, the mathematically-wrong uncommitted rotated-resize WIP (4 red editor tests + new regression coverage), repo-hygiene junk, and stale planning docs.

Purpose: One atomic forensic cleanup pass — restore a green build on branch ci/test-pr and remove planning drift so the next phase (10 Aussaatkalender) starts from a trustworthy baseline.
Output: 3 conventional commits on ci/test-pr (code/test fixes; repo hygiene; planning docs), all referencing quick-260610-jtf, with the full test+typecheck gate green.

NON-NEGOTIABLE constraints:
- ALL work stays on branch ci/test-pr. Never switch branches, never touch origin/master.
- The uncommitted WIP in the 3 web editor files is the BASE for the rotated-resize fix — complete it, never revert it.
- German text uses native UTF-8 umlauts (ä ö ü ß), never ASCII replacements.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/BACKLOG.md
@CLAUDE.md

# Affected source — already read during planning; re-read only the specific lines you edit
@packages/shared/src/types/supabase.ts
@app/src/lib/__tests__/auth.test.ts
@app/src/lib/auth.ts
@app/src/__mocks__/react-native.ts
@app/src/components/editor/web/WebPlanEditor.tsx
@app/src/components/editor/web/WebResizeHandle.tsx
@app/src/components/editor/web/WebRotationHandle.tsx
@app/src/lib/editor/handleGeometry.ts
@app/src/lib/editor/__tests__/handleGeometry.test.ts
@app/src/components/editor/__tests__/WebResizeHandle.test.tsx
@app/src/components/editor/__tests__/WebRotationHandle.test.tsx
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Code + test fixes — shared typecheck, auth tests, rotated-resize (Findings 1-3)</name>
  <files>packages/shared/src/types/supabase.ts, app/src/lib/__tests__/auth.test.ts, app/src/components/editor/web/WebResizeHandle.tsx, app/src/components/editor/web/WebRotationHandle.tsx, app/src/components/editor/web/WebPlanEditor.tsx, app/src/lib/editor/handleGeometry.ts, app/src/lib/editor/__tests__/handleGeometry.test.ts, app/src/components/editor/__tests__/WebResizeHandle.test.tsx, app/src/components/editor/__tests__/WebRotationHandle.test.tsx</files>
  <behavior>
    Finding 2 (auth) — after fix, in the hooks jest project:
      - "two consecutive calls return the same UUID (persistence)" passes (Platform.OS='ios' routes reads/writes through the SecureStore in-memory mock, not absent window.localStorage).
      - "persisted UUID stored under the canonical key name" passes (UUID is written to SecureStore under 'spatenstich_local_uuid').
      - The existing two passing tests (valid-UUID-shape, clear-then-new) still pass.
    Finding 3 (rotated-resize) — new + fixed editor-project tests:
      - rotateDeg=0: dragging br by screen (+dxPx,+dyPx) still grows width by dxPx/scale and height by dyPx/scale, BR-anchor logic unchanged (no regression vs current axis-aligned behavior).
      - rotateDeg=90 (clockwise, y-down): dragging the visually-right handle changes the element's local width dimension (not height); opposite corner (anchor) stays fixed in world space.
      - rotateDeg=45: a drag aligned with the element's rotated local x-axis grows width only, leaves height ~unchanged.
      - WebRotationHandle: onMouseDown resolves the SVG bounding rect without throwing (no `.closest is not a function` in the editor jest project); existing 5 WebRotationHandle tests stay green.
  </behavior>
  <action>
    Finding 1 — packages/shared/src/types/supabase.ts: delete ONLY line 1 (the literal CLI stdout `Initialising login role...`). The file MUST now start with `export type Json =`. Do not touch any other line; the rest is valid generated TypeScript.

    Finding 2 — app/src/lib/__tests__/auth.test.ts: the file runs in the jest `hooks` project whose react-native mock sets Platform.OS='web', which makes auth.ts use window.localStorage (absent in node) so persistence silently no-ops. Add `import { Platform } from 'react-native';` (resolves to app/src/__mocks__/react-native.ts). Add a `beforeAll(() => { (Platform as { OS: string }).OS = 'ios'; })` and `afterAll(() => { (Platform as { OS: string }).OS = 'web'; })` so reads/writes route through the expo-secure-store in-memory mock during this suite only. Fix the file header comment: it currently falsely claims "Platform (default 'ios')" — change it to state the mock default is 'web' and this suite overrides to 'ios' for SecureStore persistence. Do NOT change the global mock default in app/src/__mocks__/react-native.ts — the editor/components/stores jest projects depend on OS='web'.

    Finding 3 — complete the uncommitted rotated-resize WIP. Conventions: the element renders via SVG `rotate(rotateDeg, cx, cy)` where positive rotateDeg is CLOCKWISE in screen coords (y-down). Let θ = rotateDeg in radians.
      (a) WebResizeHandle.tsx — accept a new prop `rotateDeg: number` on WebResizeHandleProps (default to 0 at call site via `?? 0`). In `computeResize`, before applying the existing per-corner sign logic, rotate the screen-pixel delta into the element's LOCAL (unrotated) frame using the inverse rotation: `dxLocal = ( dxPx * cos(θ) + dyPx * sin(θ) ) / scale`, `dyLocal = ( -dxPx * sin(θ) + dyPx * cos(θ) ) / scale`. Apply the existing `sxW`/`syH` corner signs to dxLocal/dyLocal (these are now meters in local frame, so drop the separate `/scale` that was applied to raw pixels). Compute newW/newH with the MIN_DIM_M clamp as today. The center shift is first computed in LOCAL frame: `cxLocal = sxW * (newW - startWidthM) / 2`, `cyLocal = syH * (newH - startHeightM) / 2`. Then rotate the local center shift BACK to world frame before returning: `cxAdj = cxLocal * cos(θ) - cyLocal * sin(θ)`, `cyAdj = cxLocal * sin(θ) + cyLocal * cos(θ)`. The onMove handler keeps applying `xM: startXM + cxAdj`, `yM: startYM + cyAdj` (already in WIP). Pass θ into computeResize by reading the `rotateDeg` prop and converting degrees→radians inside the component. Preserve the WIP's setDrag/useEffect-with-deps structure and the try/finally gestureActive release.
      (b) WebPlanEditor.tsx — in the resize-handle render block (the IIFE around current lines 420-462), pass `rotateDeg={rotateDeg}` to each of the 4 `<WebResizeHandle>` instances (rotateDeg is already computed locally in that block from `prov.rotateDeg`). Keep the surrounding `<G transform={rotateDeg !== 0 ? rotate(...) : undefined}>` wrapper so handle CIRCLES stay visually pinned to the rotated corners; the math fix makes the drag deltas correct in local frame regardless.
      (c) WebRotationHandle.tsx:81 — replace the brittle `(e.target as Element).closest('svg')` SVG-rect resolution. Use `(e.currentTarget as SVGElement & { ownerSVGElement?: SVGSVGElement }).ownerSVGElement` to get the owning SVG, then `getBoundingClientRect()`; if `ownerSVGElement` is null/undefined, fall back to `(e.currentTarget as Element).getBoundingClientRect()`. This must not throw under the editor jest mock (where react-native-svg is stubbed as a View and `.closest` is absent). Keep the existing setCenterScreen + setGestureActive(true) behavior.
      (d) handleGeometry.ts:11 — update the MVP carve-out comment block (lines 10-14 + 33): rotated-resize math is now IMPLEMENTED at the handle layer; remove the "Caller MUST hide resize handles when rotateDeg !== 0" and "DEFERRED-rotated-resize-math" wording. New contract: corner geometry is axis-aligned in the element's local frame; the caller wraps handles in a rotation `<G>` for display and passes rotateDeg to WebResizeHandle so drag deltas are converted into local frame. Do not change the function bodies — only the doc comments.
      (e) handleGeometry.test.ts:72 — update the test named "MVP carve-out: rotated-resize math TODO..." to reflect the new contract: rename/retarget it so it asserts computeCornerHandles still returns axis-aligned local-frame corners for a rotated element (the existing toBeCloseTo(2.5) assertions stay valid since the function is unchanged), and drop the "math TODO / hidden handles" claim from the test description and comment.
      (f) Make the 4 currently-red editor tests green AND add rotated-resize regression tests in WebResizeHandle.test.tsx: (i) rotateDeg=0 br-drag grows width=dxPx/scale, height=dyPx/scale and shifts center by half the growth (BR anchor fixed) — assert via mockUpdateElement call args; (ii) rotateDeg=90 drag of the visually-right handle changes local width and keeps the opposite corner fixed; (iii) rotateDeg=45 drag along the rotated local x-axis grows width only. Pass `rotateDeg` as a prop in these new render() calls. In WebRotationHandle.test.tsx, ensure the SVG-rect resolution change does not break the existing onMouseDown test (line ~176) — the View stub has no ownerSVGElement, so the fallback path must run without throwing.
    NEVER inline full implementations elsewhere — edit the named files only. Keep all German UI strings as native UTF-8.
  </action>
  <verify>
    <automated>pnpm --filter @spatenstich/shared typecheck; pnpm --filter app exec jest --selectProjects=hooks --selectProjects=editor</automated>
  </verify>
  <done>shared typecheck exits 0; hooks project shows the 2 auth tests green (4/4 in that file); editor project fully green with the new rotated-resize regression tests passing; supabase.ts line 1 is `export type Json =`; the 3 web editor WIP files are completed (not reverted) and WebResizeHandle receives rotateDeg. Commit: `fix(quick-260610-jtf): repair shared typecheck garbage line, auth Platform mock, rotated-resize math`.</done>
</task>

<task type="auto">
  <name>Task 2: Repo hygiene — junk files, gitignore, orphaned worktrees, commit untracked docs (Finding 4)</name>
  <files>.gitignore, bash.exe.stackdump (delete), tsconfig.json (delete), docs/specs/M07-claude-ai-bridge.md, docs/test-plans/2026-05-13-full-app-manual.md, .planning/phases/09-companion-hinweis/09-UAT.md</files>
  <action>
    (a) Delete repo-root `bash.exe.stackdump` (junk crash dump). Delete repo-root `tsconfig.json` (untracked, accidental — content is `{"compilerOptions":{},"extends":"expo/tsconfig.base"}`; each package owns its own tsconfig, root has none in git).
    (b) Append to .gitignore (after the existing `deno.lock` line, keep native UTF-8): a `.claude/` rule (agent worktrees + local agent state must never be committed) and a `*.stackdump` rule (Windows/MSYS crash dumps). Add a one-line German comment above each explaining why.
    (c) Orphaned worktrees — VERIFIED during planning: all 4 branches (worktree-agent-a0314858, -a38c4096, -a38e0e77, -afd8c95f) have ZERO unique commits over ci/test-pr (`git log ci/test-pr..<branch> --oneline` empty for all four). For each of the 4 worktree paths under .claude/worktrees/, run `git worktree remove --force <path>` then `git branch -D <branch>`. They are `locked`, so `--force` is required. After removal run `git worktree prune`. If — contrary to the planning check — any branch is found to have unique commits at execution time, leave that one in place and report it in the summary instead of deleting.
    (d) Commit the untracked docs referenced by STATE.md as-is: `git add docs/specs/M07-claude-ai-bridge.md docs/test-plans/2026-05-13-full-app-manual.md`. Also `git add .planning/phases/09-companion-hinweis/09-UAT.md` (Phase 9 UAT, referenced in Finding 5a).
    Do not modify the content of the committed docs — commit them verbatim.
  </action>
  <verify>
    <automated>git worktree list; git status --porcelain</automated>
  </verify>
  <done>`git worktree list` shows only the main worktree (no agent-* entries); no `worktree-agent-*` branches remain (`git branch --list "worktree-agent-*"` empty); bash.exe.stackdump and root tsconfig.json gone from working tree; .gitignore contains `.claude/` and `*.stackdump`; the 2 docs files + 09-UAT.md are staged/tracked. Commit: `chore(quick-260610-jtf): repo hygiene — drop stackdump+stray tsconfig, ignore .claude+stackdump, prune worktrees, commit M07+test-plan+UAT docs`.</done>
</task>

<task type="auto">
  <name>Task 3: Planning consistency + final gate (Findings 5-6)</name>
  <files>.planning/ROADMAP.md, .planning/BACKLOG.md, .planning/STATE.md</files>
  <action>
    Finding 5a — ROADMAP.md Phase 9: implementation is verified complete and wired in both editors (useCompanionDetection + CompanionToast + conflict overlays; 09-UAT.md exists). In the Progress table (line ~290) change the `9. Companion-Hinweis` row from `0/4 | Not started | -` to `4/4 | ✅ Complete | 2026-05-29`. In the Phases list (line ~38) change `- [ ] **Phase 9: Companion-Hinweis**` to `- [x]`.
    Finding 5b — ROADMAP.md Phase 3: the uploadPending() wiring gap is actually CLOSED — app/src/lib/sync/SyncTriggers.ts calls syncAll() on NetInfo reconnect (line 50) and AppState foreground (line 59), registered via registerSyncTriggers(). Update the Phase 3 detail block (line ~75) status from "⚠ 6/7 ... gap closure pending/offen" to a complete note: state that the reconnect + foreground syncAll wiring closed the gap (reference SyncTriggers.ts). In the Progress table change the `3. Offline & Sync` row from `6/7 | ⚠ Gap pending | -` to `7/7 | ✅ Complete | 2026-06-10` (or "✅ Code Complete" to match sibling rows) with a brief note that the wiring gap was confirmed closed.
    Finding 5c — BACKLOG.md item 999.1 (Web Properties Panel): delivered by Phase 09.1 ElementEditorModal. Mark it resolved — add a `**Status:** ✅ Erledigt (Phase 09.1 ElementEditorModal, 2026-05-29)` line with a one-line reference, keeping the original description for history. Native UTF-8 umlauts.
    Finding 5d — STATE.md: reconcile the body with reality. The "Current Position" section is stale (says "Plan: 1 of 6", "Phase 8 1/4 25%", references uploadPending gap). Update it to: Phase 09.1 COMPLETE; next up Phase 10 (Aussaatkalender v1); note Phase 7.5b remains optional/open. In Blockers/Concerns remove the stale uploadPending gap if listed and mark the DEFERRED-1 supabase.ts first-line issue as RESOLVED by this quick task (quick-260610-jtf). The progress frontmatter (12/12 phases, 100%) may stay as-is since it tracks the v1.0 foundation count — but ensure the prose no longer contradicts it (remove the "Phase 8 1/4 25%" and "Plan 1 of 6" lines or correct them to reflect 09.1 complete). Keep all German text native UTF-8.
    Finding 6 — FINAL GATE (run after the edits above, before committing): execute all four and confirm green:
      `pnpm --filter app typecheck`
      `pnpm --filter @spatenstich/shared typecheck`
      `pnpm --filter app test`
      `pnpm --filter @spatenstich/shared test`
    The app suite had 637 tests with 6 red before Task 1; all must now pass. If any gate fails, fix the regression before committing (do not commit a red gate).
  </action>
  <verify>
    <automated>pnpm --filter app typecheck; pnpm --filter @spatenstich/shared typecheck; pnpm --filter app test; pnpm --filter @spatenstich/shared test</automated>
  </verify>
  <done>ROADMAP Phase 9 = ✅ Complete (4/4) and Phase 3 = complete with wiring-closed note; BACKLOG 999.1 marked erledigt with Phase 09.1 reference; STATE Current Position reflects 09.1 complete / next Phase 10, DEFERRED-1 marked resolved, stale gap removed; all 4 final-gate commands exit 0 (app 637 tests green, shared green). Commit: `docs(quick-260610-jtf): reconcile planning — Phase 9 complete, Phase 3 gap closed, BACKLOG 999.1 erledigt, STATE position`.</done>
</task>

</tasks>

<verification>
- Branch is still `ci/test-pr` throughout (run `git rev-parse --abbrev-ref HEAD` — must equal `ci/test-pr`). No branch switch, no push to origin/master.
- The 3 web editor WIP files were COMPLETED, not reverted (their git history shows the rotated-resize math, not a revert to the pre-WIP version).
- Three conventional commits exist on ci/test-pr, each message containing `quick-260610-jtf`.
- Final gate: `pnpm --filter app typecheck`, `pnpm --filter @spatenstich/shared typecheck`, `pnpm --filter app test`, `pnpm --filter @spatenstich/shared test` ALL exit 0.
- No `bash.exe.stackdump`, no orphaned `agent-*` worktrees, no `worktree-agent-*` branches.
- All German text written in this task uses native UTF-8 umlauts (no ae/oe/ue/ss substitutions).
</verification>

<success_criteria>
1. CI-relevant gates green: shared typecheck (no `Initialising login role...` line), app typecheck, app test (637 green, 0 red), shared test.
2. Rotated-resize is mathematically correct: deltas converted to local frame, center shift rotated back to world; regression tests for 0deg/45deg/90deg pass; opposite-corner anchor stays fixed under rotation.
3. Auth tests fixed via Platform.OS='ios' override in the hooks suite only (global mock default untouched).
4. Repo clean: junk + stray tsconfig deleted; .claude/ and *.stackdump gitignored; 4 orphaned worktrees pruned; M07 spec + test-plan + 09-UAT committed.
5. Planning artifacts truthful: ROADMAP Phase 9 complete + Phase 3 gap closed; BACKLOG 999.1 erledigt; STATE position reconciled, DEFERRED-1 resolved.
6. Exactly 3 atomic commits on ci/test-pr referencing quick-260610-jtf.
</success_criteria>

<output>
Create `.planning/quick/260610-jtf-forensik-sweep-ci-fixes-repo-hygiene-pla/260610-jtf-SUMMARY.md` when done, recording: per-task commit SHAs, final gate results (test counts), worktree-removal confirmation, and any deviation (e.g. a worktree branch found with unique commits and therefore left in place).
</output>
