---
phase: 9
slug: companion-hinweis
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-17
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 29.x (split-project config) |
| **Config file** | app/jest.config.ts |
| **Quick run command** | `pnpm --filter app exec jest --selectProjects hooks --testPathPattern='companion'` |
| **Full suite command** | `pnpm --filter app exec jest --selectProjects hooks stores editor components --testPathPattern='companion\|CompanionToast\|InlineBanner'` |
| **Estimated runtime** | ~8 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter app exec jest --selectProjects hooks --testPathPattern='companion'`
- **After every plan wave:** Run full suite command
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| (filled by planner) | — | — | — | — | — | — | — | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `app/src/hooks/__tests__/useCompanionDetection.test.ts` — stubs for detection hook
- [ ] `app/src/components/__tests__/CompanionToast.test.tsx` — stubs for toast component
- [ ] `app/src/lib/__tests__/companionDetection.test.ts` — stubs for detection logic (PiP, batch lookup)

*Existing infrastructure covers test framework — no new packages needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Toast visual appearance (color, position) | SC-2, SC-3 | Visual rendering on real device | Place Tomate next to Basilikum → green toast appears above toolbar; Place Kartoffel next to Tomate → red toast appears |
| Red triangle Skia overlay visibility | SC-5 | Skia canvas rendering | After placing conflicting plant, dismiss toast → red triangle visible on plant element |
| Auto-dismiss timing (4s) | D-06 | Timing-dependent | Place companion plant, observe toast → disappears after ~4 seconds |
| Non-blocking placement | SC-4 | Interaction flow | Place conflicting plant → banner shows but plant IS placed on canvas |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
