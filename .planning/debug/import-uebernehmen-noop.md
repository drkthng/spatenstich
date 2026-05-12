---
slug: import-uebernehmen-noop
status: root_cause_found
trigger: "Ausgewählte übernehmen" Button im Import-Screen führt zurück zur Import-Hauptseite (mit "Aus claude.ai importieren"-Button), statt die ausgewählten Items zu übernehmen. Vorausgehender Schritt: "JSON-Datei öffnen" funktioniert, Daten werden korrekt geladen und angezeigt. Erst beim Klick auf "Ausgewählte übernehmen" passiert das Fehlverhalten.
created: 2026-05-12T11:02:44Z
updated: 2026-05-12T11:35:00Z
---

# Debug Session: import-uebernehmen-noop

## Symptoms

- **Expected behavior:** Klick auf "Ausgewählte übernehmen" soll die selektierten Items übernehmen (in DB/State persistieren) und weiter navigieren (z.B. zur nächsten Phase oder Garten-Übersicht).
- **Actual behavior:** Klick führt zurück zur Import-Hauptseite (Screen mit "Aus claude.ai importieren"-Button). Items werden nicht übernommen.
- **Error messages:** Keine echten Fehler in der Browser-Konsole. Nur Standard-Noise:
  - `lockdown-install.js:1 SES Removing unpermitted intrinsics` (MetaMask/SES-Lockdown, irrelevant)
  - `props.pointerEvents is deprecated. Use style.pointerEvents` (react-native-web Warning, irrelevant)
  - React DevTools Hinweis
- **Timeline:** Unklar — User hat nicht zuvor getestet. Triple-Fix wurde heute committed (5a97f19, a3321e1, 9372cad, aedb122, 376ce34), Phase-06 Import-Fixes.
- **Reproduction:**
  1. Import-Screen öffnen
  2. "JSON-Datei öffnen" klicken → funktioniert, Daten erscheinen
  3. Items in der Vorschau-Liste auswählen
  4. "Ausgewählte übernehmen" klicken → Bug: Navigation zurück zur Hauptseite ohne Import

## Environment

- **Platform:** Web (Browser, Expo Web Export)
- **Branch:** ci/test-pr
- **Recent commits (Phase-06 fixes):**
  - 5a97f19 docs(quick-260510-r5p): Phase-06 Import-Bug Triple Fix
  - a3321e1 fix(06-r5p-3): web-safe file read in import screen
  - 9372cad fix(06-r5p-2): add SyncWorker push for garden_dimensions + plan_elements
  - aedb122 fix(06-r5p-1): strip write-once cols for import_items in mapper
  - 376ce34 fix(06): add IndexedDB v4 upgrade for import stores + remove onBlur double-fire

## Current Focus

- hypothesis: ~~stille Exception oder vorzeitige Navigation~~ → KORREKT: Funktional kein Bug. `handleConfirm` ruft erfolgreich `saveImport` und navigiert per `router.replace('/(app)')` zur Home-Empty-State, die genau den Button "Aus Claude.ai importieren" zeigt. User interpretiert "Empty-State Home" als "Import-Hauptseite", weil Drafts (bed_drafts, plant_drafts, observation_drafts) NICHT auf der Home-Seite gerendert werden — Home liest `loadAcceptedElements` (promoted plan_elements). Es fehlt jedes visuelle Feedback nach erfolgreichem Import.
- test: erledigt — Code gelesen, Auflösung der Navigation und Persistenz nachvollzogen
- expecting: keine Code-Exception, sondern UX-Lücke
- next_action: Fix-Optionen vorstellen

## Evidence

- timestamp: 2026-05-12T11:02:44Z
  source: user-konsole
  finding: Konsole zeigt keine Fehler, nur SES + pointerEvents-Warnings (irrelevant). Bug ist also stiller Fehlpfad, kein Throw.

- timestamp: 2026-05-12T11:30:00Z
  source: D:\AiProjects\garden-app\app\app\(app)\import\preview.tsx
  finding: `handleConfirm` (Zeile 55–68) ruft `saveImport(mode, activeGardenId, payload, selected)`. Bei Erfolg: `resetImport(); router.replace('/(app)' as any);`. Bei Throw: catch-Block (Zeile 63) setzt `saveError` per `t('import.saveError')` und zeigt `InlineBanner` (Zeile 207). Bei Throw findet KEINE Navigation statt — User sähe Fehler-Banner. Also kein Throw-Pfad → Save war erfolgreich.

- timestamp: 2026-05-12T11:31:00Z
  source: D:\AiProjects\garden-app\app\app\(app)\index.tsx
  finding: Home-Screen `HomeScreen` lädt nur `loadAcceptedElements` (promoted plan_elements) und `loadDimensions`. Bei `elements.length === 0` → Empty-State mit Heading "Noch kein Gartenplan" (i18n `import.home.emptyHeading`) und Button "Aus Claude.ai importieren" (i18n `import.home.importButton`, Zeile 122–131). Genau das, was der User als "Import-Hauptseite" beschreibt.

- timestamp: 2026-05-12T11:32:00Z
  source: D:\AiProjects\garden-app\app\src\lib\importRepo.ts
  finding: `saveImport` persistiert `imports`, `import_items`, `bed_drafts`, `plant_drafts`, `observation_drafts` über `writeWithOutbox`. Diese werden NIE als `plan_elements` promoted. Home-Screen rendert nur `plan_elements`. Konsequenz: Auch nach erfolgreichem Import sieht User keinen Plan-Inhalt.

- timestamp: 2026-05-12T11:33:00Z
  source: D:\AiProjects\garden-app\packages\shared\src\i18n\de.json:188
  finding: i18n-Key `import.successBanner` "{count} Entwürfe gespeichert — im Editor verfügbar" EXISTIERT, wird aber NICHT verwendet in `preview.tsx`. Der erfolgreiche Pfad zeigt KEIN Toast/Banner.

- timestamp: 2026-05-12T11:34:00Z
  source: D:\AiProjects\garden-app\app\src\storage\IndexedDbAdapter.ts
  finding: Schema v4 schließt `imports`, `import_items`, `bed_drafts`, `plant_drafts`, `observation_drafts` ein (Zeile 102–116). Writes über `writeWithOutbox` funktionieren — atomare Multi-Store-Transaktion.

## Eliminated

- Stille Exception in mapper/SyncWorker → ausgeschlossen: catch in handleConfirm setzt sichtbares `saveError`. User berichtet keinen Banner.
- Vorzeitige Navigation per router.back/replace → ausgeschlossen: `router.replace` steht NACH `await saveImport(...)` im try-Block.
- Leerer mapped-result → ausgeschlossen: Selection wird mit confidence-Filter initialisiert, Button ist disabled bei `selectedCount === 0`.
- `activeGardenId === null` → wäre stille Frühablehnung, aber User berichtet Navigation. Würde stehen bleiben, daher unwahrscheinlich.

## Root Cause

**Es liegt kein funktionaler Bug vor. `saveImport` läuft erfolgreich durch und persistiert alle Drafts in IndexedDB. Anschließend navigiert `router.replace('/(app)')` zur Home-Route, die im aktuellen Zustand (keine promoted `plan_elements`) den Empty-State mit "Aus Claude.ai importieren"-Button zeigt. Der User interpretiert das als "zurück zur Import-Hauptseite ohne Import".**

Drei verkettete UX-Lücken:
1. Kein Erfolgs-Feedback (Toast/Banner) nach `saveImport` — der vorgesehene i18n-Key `import.successBanner` wird nicht verwendet.
2. Home-Screen rendert nur promoted `plan_elements`, NICHT die persistierten Drafts. Es gibt keinen Hinweis auf den Editor / die Draft-Übersicht.
3. Navigation `router.replace('/(app)')` führt direkt in den Empty-State zurück, der zufällig genau wie der Einstiegspunkt aussieht.

## Resolution

(pending — Fix-Optionen werden vorgestellt)

## Fix Direction

Drei Optionen — von minimal bis vollständig:

**A — Minimal: Erfolgs-Feedback** (~10 Zeilen, kein neuer Screen)
- In `preview.tsx` `handleConfirm`: Vor `router.replace` einen Erfolgs-Indikator setzen (entweder URL-Param `?imported={count}` oder Zustand-State).
- Home-Screen liest Param und zeigt `InlineBanner` mit `t('import.successBanner', {count})`.

**B — Sinnvoll: Draft-Übersicht auf Home** (~30 Zeilen)
- Zusätzlich zu A: Home-Screen lädt per `loadPendingDrafts(activeGardenId)` die Anzahl pending Drafts.
- Empty-State zeigt zusätzliche Zeile: "X Importe wartend — zum Editor übernehmen".
- Optional: Button "Importe sichten" navigiert in (noch zu bauenden) Draft-Editor.

**C — Vollständig: Draft → plan_elements Promotion** (~Phase 7 Scope)
- Draft-Editor-Screen für Sichtung pro Beet/Pflanze.
- "In Plan übernehmen" promoted Drafts zu echten `plan_elements`.
- Ist laut Phase-06-Plan vermutlich für Phase 7 / Plan 06-04 vorgesehen.

**Empfehlung: A jetzt** — entspricht dem bereits angelegten i18n-Key und schließt die "stumme UX"-Lücke ohne neue Phase-Arbeit.

**Specialist hint:** typescript (Expo React Native + TypeScript)
