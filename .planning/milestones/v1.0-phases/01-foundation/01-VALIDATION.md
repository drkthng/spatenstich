---
phase: 1
slug: foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-16
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 29.x (app/ + packages/shared), Deno test (supabase/) |
| **Config file** | `app/jest.config.ts` (Wave 0 creates); `packages/shared/jest.config.ts` |
| **Quick run command** | `pnpm --filter app test --passWithNoTests` |
| **Full suite command** | `pnpm -r test --passWithNoTests` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter app test --passWithNoTests`
- **After every plan wave:** Run `pnpm -r test --passWithNoTests`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 1-01-00 | 01 | 0 | FOUND-01 | — | N/A | infra | Create test stubs (Wave 0) | ❌ W0 | ⬜ pending |
| 1-01-01 | 01 | 1 | FOUND-01 | — | N/A | build | `pnpm install && pnpm -r build` | ❌ W0 | ⬜ pending |
| 1-01-02 | 01 | 1 | FOUND-01/NFR-06 | — | N/A | build | `pnpm --filter packages/shared build` | ❌ W0 | ⬜ pending |
| 1-01-03 | 01 | 1 | FOUND-01 | — | N/A | build | `pnpm -r typecheck` | ❌ W0 | ⬜ pending |
| 1-01-04 | 01 | 1 | FOUND-03 | — | N/A | unit | `pnpm --filter app test -- StorageAdapter` | ❌ W0 | ⬜ pending |
| 1-01-05 | 01 | 1 | FOUND-01 | — | N/A | build | `pnpm -r test --passWithNoTests` | ❌ W0 | ⬜ pending |
| 1-02-01 | 02 | 1 | FOUND-04 | — | N/A | infra | Supabase Cloud project created (Frankfurt) | ❌ W0 | ⬜ pending |
| 1-02-02 | 02 | 1 | FOUND-05/FOUND-08 | — | N/A | unit | `pnpm --filter app test -- useFlag` | ❌ W0 | ⬜ pending |
| 1-02-03 | 02 | 2 | FOUND-04/FOUND-07/FOUND-08 | T-2-01 | RLS blocks cross-user reads | migration | `supabase migration list` | ❌ W0 | ⬜ pending |
| 1-02-04 | 02 | 2 | FOUND-04 | — | N/A (infra gate) | infra | `supabase db push` [BLOCKING] | ❌ W0 | ⬜ pending |
| 1-02-05 | 02 | 2 | FOUND-04/FOUND-05/FOUND-08 | T-2-01 | RLS isolates user data | manual | Cross-user RLS test + feature flag toggle | ❌ W0 | ⬜ pending |
| 1-03-01 | 03 | 2 | NFR-08/FOUND-06 | T-3-06 | Service keys not in client env | config | `grep -r EXPO_PUBLIC app/eas.json` (expect empty) | ❌ W0 | ⬜ pending |
| 1-03-02 | 03 | 2 | NFR-08 | — | N/A | build | GitHub Actions CI workflow runs clean | ❌ W0 | ⬜ pending |
| 1-03-03 | 03 | 3 | FOUND-07/FOUND-08 | T-3-01 | Claude API key not in bundle | unit | `deno test supabase/functions/ai-job-consumer/` | ❌ W0 | ⬜ pending |
| 1-03-04 | 03 | 3 | FOUND-07 | T-3-01 | N/A | manual | pgmq round-trip smoke test | ❌ W0 | ⬜ pending |
| 1-03-05 | 03 | 3 | FOUND-06/NFR-08 | T-3-01 | Claude API key absent from bundle | manual | Bundle secret scan + phase acceptance gate | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `app/jest.config.ts` — Jest config for React Native/Expo
- [ ] `packages/shared/jest.config.ts` — Jest config for shared package
- [ ] `app/src/storage/__tests__/StorageAdapter.test.ts` — Stubs for FOUND-03 (Plan 01, Task 1-01-04)
- [ ] `app/src/hooks/__tests__/useFlag.test.ts` — Stubs for FOUND-05 (Plan 02, Task 1-02-02)
- [ ] `pnpm add -D jest @types/jest babel-jest` — If Jest not already installed

*All stubs must pass (skip/todo) before Wave 1 tasks begin.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Supabase RLS: user sees only own rows | FOUND-04 | Requires live Supabase project + test user auth | 1. Create 2 test users. 2. Insert row as user A. 3. Query as user B — must return 0 rows. |
| Feature flag toggle without redeploy | FOUND-05 | Requires running app + live Supabase dashboard | 1. Toggle `example_flag` in dashboard. 2. Reload app. 3. Verify `useFlag('example_flag')` reflects new value. |
| Claude API key absent from client bundle | FOUND-06 | Bundle inspection tool required | Run `eas build --platform web --local`; grep dist/ for API key pattern. |
| pgmq end-to-end: job → Edge Function → ai_results | FOUND-07 | Requires live Supabase + deployed Edge Function | 1. INSERT test row into ai_jobs via pgmq RPC. 2. Wait ≤30s. 3. Verify ai_results has response row. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
