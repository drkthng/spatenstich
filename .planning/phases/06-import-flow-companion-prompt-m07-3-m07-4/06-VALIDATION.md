---
phase: 6
slug: import-flow-companion-prompt-m07-3-m07-4
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-09
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 29.7.0 + jest-expo ~53.0.0 |
| **Config file** | `app/package.json` → jest config |
| **Quick run command** | `cd app && pnpm test -- --testPathPattern=import` |
| **Full suite command** | `cd app && pnpm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd app && pnpm test -- --testPathPattern=import`
- **After every plan wave:** Run `cd app && pnpm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | IMPORT-03 | — | N/A | smoke | `ls prompts/garden-project-system-prompt.md` | ❌ W0 | ⬜ pending |
| 06-02-01 | 02 | 2 | IMPORT-05, IMPORT-07 | T-06-01 | ajv validates against schema, rejects unknown fields | unit | `cd app && pnpm test -- --testPathPattern=importValidator` | ❌ W0 | ⬜ pending |
| 06-02-02 | 02 | 2 | IMPORT-06 | T-06-02 | Confidence < 0.6 prevents bulk-accept | unit | `cd app && pnpm test -- --testPathPattern=importValidator` | ❌ W0 | ⬜ pending |
| 06-02-03 | 02 | 2 | IMPORT-04 | — | N/A | manual | manual on device (share-intent) | — | ⬜ pending |
| 06-03-01 | 03 | 3 | IMPORT-08 | T-06-03 | RLS `is_garden_member()` on all draft tables | unit | `cd app && pnpm test -- --testPathPattern=importRepo` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `app/src/lib/__tests__/importValidator.test.ts` — stubs for IMPORT-05, IMPORT-06, IMPORT-07
- [ ] `app/src/lib/__tests__/importRepo.test.ts` — stubs for IMPORT-08
- [ ] `expo-share-intent@4.1.2` installation: `cd app && pnpm add expo-share-intent@4.1.2`
- [ ] Verify `resolveJsonModule: true` in root `tsconfig.json`
