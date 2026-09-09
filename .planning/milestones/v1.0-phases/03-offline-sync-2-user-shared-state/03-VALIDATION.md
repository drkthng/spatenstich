---
phase: 3
slug: offline-sync-2-user-shared-state
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-24
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Siehe `03-RESEARCH.md` §"Validation Architecture" für die vollen Invariant-Beschreibungen.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 29.x (unit/integration, Node-env) + Playwright (E2E Web) — setup im `app/` Workspace |
| **Config file** | `app/jest.config.js` (bestehend); `app/playwright.config.ts` (neu in W0) |
| **Quick run command** | `pnpm --filter app test -- --findRelatedTests` |
| **Full suite command** | `pnpm --filter app test && pnpm --filter app e2e` |
| **Estimated runtime** | ~45s unit + ~90s E2E (offline/reconnect szenarien mit network-throttling) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter app test -- --findRelatedTests <modified files>`
- **After every plan wave:** Run `pnpm --filter app test` (alle unit/integration)
- **Before `/gsd-verify-work`:** Full suite (inkl. Playwright E2E gegen Staging-Supabase) muss grün sein
- **Max feedback latency:** 60s für unit/integration, 120s inklusive E2E

---

## Per-Task Verification Map

> Wird vom Planner beim Schreiben der PLAN.md-Dateien gefüllt. Jeder Task mit `type: execute`
> bekommt hier eine Zeile mit Plan-Nummer, Wave, Requirement-ID, Threat-Ref und einem
> ausführbaren Verifikations-Command. Der Planner muss die Auffüllung dieser Tabelle als
> Teil seines Deep-Work-Contracts ansehen.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 3-XX-YY | {plan} | {wave} | REQ-SYNC-{XX} | T-3-{XX} / — | {expected secure behavior} | unit/integration/e2e | `{command}` | ✅ / ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Core Invariants (Nyquist — aus RESEARCH.md §"Validation Architecture")

Alle Invarianten müssen durch mindestens einen automatisierten Test abgedeckt sein.
Planner muss beim PLAN-Schreiben pro Invariante mindestens eine Test-Zeile in die Per-Task-Verification-Map eintragen.

| # | Invariante | Test-Typ | Messpunkt |
|---|-----------|----------|-----------|
| **I-1** | **Offline-Start zeigt letzten Plan** — App bootet ohne Netz, Root-Layout rendert aus lokaler Row-Table binnen <2s | Integration (jest + mock NetInfo offline) + E2E (Playwright offline-mode) | `app/__tests__/offline-boot.test.ts` |
| **I-2** | **Write-Persist in Outbox** — `gardenRepo.updateName(...)` bei Offline erzeugt lokale Row + `sync_outbox`-Eintrag, UI re-rendert optimistisch | Integration (mock NetInfo offline) | `app/__tests__/outbox-enqueue.test.ts` |
| **I-3** | **LWW-Trigger rejected älteren Write** — Staging-Supabase: 2 parallele Updates mit `updated_at t0` und `t0+1s`; älterer muss SQLSTATE P9011 zurückgeben | Integration gegen Staging DB | `supabase/tests/lww-trigger.test.sql` + `app/__tests__/lww-reject.integration.test.ts` |
| **I-4** | **30s-Reconnect-Propagation** — 2-Account-Szenario: Gerät A editiert offline, reconnected; Gerät B pullt; binnen 30s sichtbar | E2E Playwright (2 Browser-Kontexte) | `app/e2e/30s-sync.spec.ts` |
| **I-5** | **EXIF wird immer entfernt** — unabhängig vom Opt-in-Toggle; wenn Toggle AN: GPS-Felder in `photo_queue.geo_*` persistiert | Integration (jest mit EXIF-Test-Fixture) | `app/__tests__/exif-strip.test.ts` |
| **I-6** | **Photo-Queue-Upload → AI-Job-Enqueue** — Offline-Foto, reconnect, `supabase.storage.upload` erfolgreich, RPC `enqueue_photo_analysis` liefert `job_id` | Integration gegen Staging | `app/__tests__/photo-queue.integration.test.ts` |
| **I-7** | **Member-RLS für photo_queue** — fremder User (Nicht-Member) kann keine `photo_queue`-Row für fremden `garden_id` einfügen | Integration (pgTAP oder supabase-js mit 2 Accounts) | `supabase/tests/photo-queue-rls.test.sql` |

---

## Wave 0 Requirements

- [ ] `app/jest.config.js` — existing (verify jest 29.x konfiguriert, TypeScript via ts-jest)
- [ ] `app/playwright.config.ts` — **neu**, installiert @playwright/test, konfiguriert 2 Browser-Kontexte für I-4
- [ ] `app/__tests__/__fixtures__/exif-test.jpg` — Test-Foto mit bekannten EXIF/GPS-Feldern (für I-5)
- [ ] `app/__tests__/helpers/mockNetInfo.ts` — zentraler Mock für NetInfo `isConnected=true/false`
- [ ] `supabase/tests/README.md` + pgTAP-Setup oder supabase-js-Harness für DB-Level-Tests (I-3, I-7)
- [ ] `app/.env.test` — Pointer auf Staging-Supabase-Projekt (nicht Production)
- [ ] `pnpm --filter app add -D @playwright/test piexifjs @types/piexifjs` — Dependencies

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Sync-Status-Badge visuell (3 States ✓/⇄/⚠) | SYNC-04 | UI-visuelle Ästhetik, Tap-Animation, a11y-Label — kein sinnvoller Unit-Test | Offline toggeln, Write auslösen, Reconnect; Screenshot pro State; a11y-Label via VoiceOver/TalkBack verifizieren |
| Settings > Sync-Status Pending/Failed-Liste | SYNC-04 | Inline-Confirm-Expansion-Pattern (UI-SPEC Zeile 234) — E2E-Snapshot reicht nicht | Failed-Op erzeugen (invalid payload via Dev-Tool), Settings öffnen, Retry/Verwerfen testen |
| Opt-in "Standort-Daten aus Fotos teilen" UX | NFR-05 | Verständlichkeit des Toggles + DSGVO-Hinweis | Toggle testen mit realem Foto inkl. GPS, Foto ohne GPS, verifizieren dass Default=AUS |
| iPhone Safari Pull-to-Refresh triggert Delta-Pull | NFR-01 | iOS-spezifisches Gesture-Verhalten | Manuell auf iOS Safari (Frau's Gerät) swipen, Badge-Update verifizieren |

---

## Validation Sign-Off

- [ ] Alle Tasks haben `<automated>` verify oder Wave 0 Dependencies
- [ ] Sampling continuity: keine 3 aufeinanderfolgenden Tasks ohne automated verify
- [ ] Wave 0 deckt alle MISSING references ab (Playwright, piexifjs, pgTAP-Harness, Staging-.env)
- [ ] Keine watch-mode flags in CI-Commands
- [ ] Feedback-Latenz < 60s (unit/integration)
- [ ] Alle 7 Core Invariants I-1..I-7 haben ≥1 Test-Map-Zeile
- [ ] `nyquist_compliant: true` in Frontmatter gesetzt

**Approval:** pending
