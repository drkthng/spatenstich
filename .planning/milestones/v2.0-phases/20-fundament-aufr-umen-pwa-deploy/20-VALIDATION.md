---
phase: "20"
slug: "fundament-aufr-umen-pwa-deploy"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: true
created: "2026-09-09"
updated: "2026-09-09"
---

# Phase 20 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 29.7.0 (`ts-jest`, Multi-Projekt-Konfiguration) — `app` und `@spatenstich/shared` je eigene Suite |
| **Config file** | `app/jest.config.ts` (6 Projekte heute; nach 20-02 fünf, das Foto-Projekt entfällt) |
| **Quick run command** | `pnpm --filter app exec jest --ci --selectProjects <projekt>` |
| **Full suite command** | `pnpm -r run typecheck && pnpm -r run lint && pnpm --filter app exec jest --ci && pnpm --filter @spatenstich/shared exec jest --ci` |
| **Build gate** | `pnpm --filter app run build:web` (ab 20-03) und `bash scripts/check-claude-key-in-bundle.sh app/dist` |
| **Estimated runtime** | Jest-Gesamtsuite ~60–90 s; einzelnes Projekt < 20 s; Web-Export 2–4 min |

**Jest-Fallstrick (Masterplan Kap. 0.4):** Flags nie über `pnpm --filter app test -- --flag` weiterreichen — pnpm verschluckt das zweite `--`. Immer `pnpm --filter app exec jest …`.

---

## Sampling Rate

- **Nach jedem Task-Commit:** `pnpm --filter app exec jest --ci --selectProjects <betroffenes Projekt>` (< 20 s)
- **Nach jedem Plan (Wave-Ende):** volle Gate-Reihe aus Masterplan Kap. 0.4
- **Vor `/gsd-verify-work`:** Gesamtsuite grün + `build:web` erfolgreich + Bundle-Scan exit 0
- **Max feedback latency:** 20 Sekunden pro Task-Commit

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 20-01-01 | 01 | 1 | DEPLOY-01 | — | N/A | lint (static) | `OUT=$(pnpm --filter app run lint 2>&1); ! printf '%s' "$OUT" \| grep -qE 'react/display-name\|import/first\|@typescript-eslint/no-require-imports'` | ✅ | ⬜ pending |
| 20-01-02 | 01 | 1 | DEPLOY-01 | — | N/A | lint + typecheck | `pnpm -r run typecheck && pnpm -r run lint` | ✅ | ⬜ pending |
| 20-01-03 | 01 | 1 | DEPLOY-01 | — | N/A | unit | `pnpm --filter app exec jest --ci --testPathPattern=create-garden-entrypoints` + `--detectOpenHandles --testPathPattern=reconnect-` | ✅ | ⬜ pending |
| 20-01-04 | 01 | 1 | DEPLOY-01 | T-20-01-02 / T-20-01-03 / T-20-01-04 | Sentry-DSN nur als Secret; Secret-Scan-Step bleibt in ci.yml; eas-build nur noch manuell | config assertion | `sed -n '/^on:/,/^jobs:/p' .github/workflows/eas-build.yml \| grep -v '^[[:space:]]*#' \| grep -q 'workflow_dispatch'` + `grep -q 'vars.EXPO_PUBLIC_SUPABASE_URL' .github/workflows/ci.yml` | ✅ | ⬜ pending |
| 20-02-01 | 02 | 2 | DEPLOY-02 | T-20-02-05 | Feature-Schalter wird zur Compile-Time-Konstante (nicht mehr manipulierbar) | grep gate + unit | `test -z "$(git grep -n 'rules\.upload\|pdf_extraction' -- app packages)"` + Gesamtsuite | ✅ | ⬜ pending |
| 20-02-02 | 02 | 2 | DEPLOY-02 | T-20-02-SC | Keine neuen Pakete; nur Entfernungen | grep gate + build | `test "$(git grep -n -i 'plantnet\|anthropic\|captureStore\|exif\|useFlag' -- app/src app/app \| grep -vE ':[0-9]+:[[:space:]]*(//\|\*\|/\*)' \| wc -l)" -eq 0` | ✅ | ⬜ pending |
| 20-02-03 | 02 | 2 | DEPLOY-02 | — | N/A | unit + i18n assertion | `node -e "…common.accountRequired…"` + `pnpm --filter app exec jest --ci --selectProjects components` | ❌ W0 → Test entsteht in diesem Task | ⬜ pending |
| 20-02-04 | 02 | 2 | DEPLOY-02 | T-20-02-02 / T-20-02-03 | Policies nur zusammen mit Bucket; Audit-Invariante von transfer_ownership wiederhergestellt | static SQL assertion | drei grep-Gates auf `supabase/migrations/20260910000020_cleanup_legacy.sql` | N/A — Migrationsdatei | ⬜ pending |
| 20-02-05 | 02 | 2 | DEPLOY-02 | T-20-02-01 | Einbahnstraße wird vor dem Durchschreiten bestätigt | manual (decision) | — | N/A | ⬜ pending |
| 20-02-06 | 02 | 2 | DEPLOY-02 | T-20-02-01 | Kein Push ohne Backup (R9) | manual (human action) | — | N/A | ⬜ pending |
| 20-02-07 | 02 | 2 | DEPLOY-02 | T-20-02-01 / T-20-02-04 | 3-Gate-Protokoll, Dry-Run vor echtem Push | infra command | `supabase migration list --linked` (Nachweis in beiden Spalten) | N/A — Infrastruktur | ⬜ pending |
| 20-03-01 | 03 | 3 | DEPLOY-03 | T-20-03-SC | Paket-Legitimität vor `pnpm add -D` bestätigt | manual (human verify) | — | N/A | ⬜ pending |
| 20-03-02 | 03 | 3 | DEPLOY-03 | T-20-03-01 | SW-Registrierung nur über https | build-output assertion | `node scripts/gen-icons.mjs` + Manifest-Feldprüfung + `pnpm --filter app run build:web && grep -q 'rel="manifest"' app/dist/index.html && grep -q 'precacheAndRoute' app/dist/sw.js` | ❌ W0 — kein Jest-Test möglich (jsdom kann keinen Service Worker ausführen), Ersatz ist die Build-Output-Prüfung | ⬜ pending |
| 20-03-03 | 03 | 3 | DEPLOY-04 | T-20-03-02 / T-20-03-04 | Geteilter Payload durchläuft dieselbe Validierung wie der Einfüge-Weg; Inbox wird nach dem Lesen geleert | unit + build-output assertion | `pnpm --filter app exec jest --ci --testPathPattern='shareInbox\|import'` + `grep -q 'share-target' app/dist/sw.js` | ❌ W0 → `app/src/lib/__tests__/shareInbox.test.ts` entsteht in diesem Task (fake-indexeddb ist vorhanden) | ⬜ pending |
| 20-03-04 | 03 | 3 | DEPLOY-03 / DEPLOY-04 / DEPLOY-07 | T-20-03-03 / T-20-03-06 | no-cache für HTML und Worker, nosniff als Auffangregel, kein automatisches Aktivieren | unit + static assertion | `grep`-Gates auf `app/public/_headers` + `pnpm --filter app run build:web && test -f app/dist/_headers` + Gesamtsuite | ❌ W0 → Tests für Update-Hinweis und Installations-Banner entstehen in diesem Task | ⬜ pending |
| 20-04-01 | 04 | 4 | DEPLOY-05 | T-20-04-01 | Bundle-Scan steht im Workflow vor dem Upload | static assertion + build | `awk '/check-claude-key-in-bundle\.sh/{s=NR} /wrangler-action/{w=NR} END{ exit !(s>0 && w>0 && s<w) }' .github/workflows/deploy-web.yml` + `pnpm --filter app run build:web && bash scripts/check-claude-key-in-bundle.sh app/dist` | ✅ | ⬜ pending |
| 20-04-02 | 04 | 4 | DEPLOY-06 | T-20-04-03 / T-20-04-04 | Kein Klartext-Geheimnis in Workflow oder Skripten; zwei unabhängige Keep-alive-Wege | static assertion + PowerShell-Parse | `grep`-Gates auf `supabase-keepalive.yml` + `powershell.exe -NoProfile -Command "…Parser::ParseFile…"` für beide `.ps1` + Secret-Grep | N/A — Infrastrukturdateien | ⬜ pending |
| 20-04-03 | 04 | 4 | DEPLOY-05 | — | N/A | doc assertion | `grep -qi 'Android' README.md && grep -q 'spatenstich.pages.dev' README.md && grep -qi '60 Tagen' README.md` + Umlaut-Prüfung per node | ✅ | ⬜ pending |
| 20-04-04 | 04 | 4 | DEPLOY-05 | T-20-04-02 / T-20-04-06 | Pages-Edit-Token statt kontoweitem Token; Redirect-Ziele festgelegt | manual (human action) | — | N/A | ⬜ pending |
| 20-04-05 | 04 | 4 | DEPLOY-05 / DEPLOY-06 | T-20-04-05 | Cache-Header nach dem Deploy stichprobenartig geprüft | manual (human verify) | — | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Es gibt keine fehlende Testinfrastruktur — Jest, `ts-jest`, `fake-indexeddb` und `@testing-library/react-native` sind installiert und laufen. Die folgenden Testdateien existieren heute noch nicht und entstehen innerhalb des Tasks, der sie braucht (RED-Commit vor GREEN-Commit):

- [ ] `app/src/lib/__tests__/shareInbox.test.ts` — Schreiben, Lesen, Leeren, doppeltes Lesen der Teilen-Inbox (Task 20-03-03)
- [ ] Erweiterung von `app/src/components/__tests__/create-garden-entrypoints.test.tsx` (oder eine parallele Datei) für die drei Home-Buttons im Lokal-Modus (Task 20-02-03)
- [ ] Tests für den Update-Hinweis und das Installations-Banner mit gemockten Browser-Schnittstellen (Task 20-03-04)

Es sind keine drei aufeinanderfolgenden Tasks ohne automatisierte Prüfung: die einzige Kette rein manueller Tasks (20-02-05 → 20-02-06) wird von 20-02-07 mit einem Infrastrukturkommando abgeschlossen; 20-04-04 → 20-04-05 stehen am Phasenende und werden durch die Geräte-Abnahme geschlossen.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| CI-Workflow läuft auf dem Phasen-PR grün durch | DEPLOY-01 | Braucht einen echten GitHub-Actions-Lauf auf einem PR | Draft-PR für `gsd/phase-20-fundament-aufr-umen-pwa-deploy` öffnen, Actions-Lauf abwarten, Link in der SUMMARY |
| Migration 020 ist remote angekommen; Bucket-Ausgang | DEPLOY-02 | Braucht Zugriff auf die verknüpfte Live-Datenbank | `supabase migration list --linked` — `20260910000020` muss in beiden Spalten stehen; Ausgabe auf die notice zu nicht leeren Buckets prüfen |
| Lighthouse meldet „installable" | DEPLOY-03 | Keine Lighthouse-Prüfung in CI (bewusst nicht eingeführt, steht in keiner Festlegung) | Chrome DevTools → Lighthouse → PWA-Prüfung gegen die deployte Adresse |
| Chrome bietet „App installieren" auf beiden Handys; Icon rund maskiert korrekt; Start ohne Browser-Leiste; Statusleiste in Moos | DEPLOY-03 | Echte Geräte, echte Installation | M6 aus Masterplan Kap. 5, Abnahmepunkt 6.1/1 — Task 20-04-05 |
| Zweiter Start im Flugmodus zeigt App-Shell mit letztem Plan | DEPLOY-07 | Flugmodus lässt sich nicht simulieren | Abnahmepunkt 6.1/2 — Task 20-04-05 |
| Teilen aus der Claude-App (`.json`-Datei und Text) öffnet die Import-Vorschau | DEPLOY-04 | Web Share Target ist in jsdom nicht ausführbar und erscheint erst nach der Installation | M6, Abnahmepunkt 6.1/3 — Task 20-04-05 |
| Deploy dauert unter 10 Minuten; Adresse erreichbar; Antwortkopfzeilen melden no-cache | DEPLOY-05 | Beobachtung eines echten Actions-Laufs und einer echten Auslieferung | Task 20-04-05 |
| Keep-alive-Workflow läuft manuell erfolgreich | DEPLOY-06 | Braucht einen echten `workflow_dispatch`-Lauf | Task 20-04-05 |

---

## Validation Sign-Off

- [x] Alle Tasks haben `<automated>`-Verify oder sind ausgewiesene manuelle Checkpoints mit Backstop-Eintrag in `must_haves`
- [x] Jedes `<automated>` hat ein `<fails_when>` mit einem beobachtbaren Fehlersignal
- [x] Sampling-Kontinuität: keine drei aufeinanderfolgenden Tasks ohne automatisierte Prüfung
- [x] Wave-0-Lücken benannt (drei Testdateien entstehen im jeweiligen Task)
- [x] Keine Watch-Mode-Flags
- [x] Feedback-Latenz pro Task-Commit unter 20 s
- [ ] `nyquist_compliant: true` — wird von `/gsd-validate-phase` nach der Ausführung gesetzt

**Approval:** pending
