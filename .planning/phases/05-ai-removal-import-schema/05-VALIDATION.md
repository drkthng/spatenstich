---
phase: 5
slug: ai-removal-import-schema
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-09
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 29.x (via expo) |
| **Config file** | `app/jest.config.js` (if exists) or inline in package.json |
| **Quick run command** | `cd app && npx expo run:web` (build check) |
| **Full suite command** | `cd app && npx tsc --noEmit && npx jest` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd app && npx tsc --noEmit`
- **After every plan wave:** Run `cd app && npx tsc --noEmit && npx jest`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 5-01-01 | 01 | 1 | REMOVE-01 | — | N/A | build | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 5-01-02 | 01 | 1 | REMOVE-02 | — | N/A | grep | `grep -ri "anthropic\|plantnet\|vision" app/src/` | ✅ | ⬜ pending |
| 5-01-03 | 01 | 1 | REMOVE-03 | — | N/A | build | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 5-02-01 | 02 | 2 | IMPORT-01 | — | N/A | script | `node schemas/validate.mjs` | ❌ W0 | ⬜ pending |
| 5-02-02 | 02 | 2 | IMPORT-02 | — | N/A | script | `node schemas/validate.mjs` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `schemas/validate.mjs` — AJV validation script for schema + example payloads
- [ ] Existing TypeScript infrastructure covers removal verification (tsc --noEmit)

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Supabase secrets cleanup | REMOVE-02 | Requires dashboard/CLI access | Run `supabase secrets unset CLAUDE_API_KEY` |
| App builds on iOS + Android | REMOVE-01 | Requires native build environment | Run `eas build --platform all --profile preview` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
