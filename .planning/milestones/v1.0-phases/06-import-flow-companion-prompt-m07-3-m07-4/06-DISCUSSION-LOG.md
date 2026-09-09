# Phase 6: Import-Flow + Companion-Prompt - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-09
**Phase:** 06-import-flow-companion-prompt-m07-3-m07-4
**Mode:** --auto (all decisions auto-selected)
**Areas discussed:** Companion-Prompt Scope, Import-Screen Navigation, Preview-UI Gestaltung, Offline-Import Verhalten

---

## Companion-Prompt Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Deutsch, konversationell, fachlich | Natürliche deutsche Sprache mit Gartenfach-Terminologie | ✓ |
| Deutsch, formell-akademisch | Wissenschaftlicher Ton mit Lateinischen Pflanzennamen im Fokus | |
| Englisch mit deutschen Fachbegriffen | Englische Grundsprache, deutsche Gartenbegriffe eingestreut | |

**User's choice:** [auto] Deutsch, konversationell, fachlich (recommended default)
**Notes:** M07-Spec definiert bereits: BKleingG, Saxon RKO, Leipzig, Klimazone 7a, Opus 4.7. Prompt muss JSON-Output-Disziplin erzwingen.

---

## Import-Screen Navigation

| Option | Description | Selected |
|--------|-------------|----------|
| Button auf Home-Screen + eigene Route | Import als Power-User-Feature, nicht Hauptnavigation | ✓ |
| Eigener Tab in Bottom-Navigation | Import prominent in Tab-Bar | |
| Nur über Settings erreichbar | Import als versteckte Funktion | |

**User's choice:** [auto] Button auf Home-Screen + eigene Route (recommended default)
**Notes:** App hat aktuell Stack-Navigation, keine Tabs. Import ist Beschleuniger, nicht Kern-Flow. Home-Screen zeigt bereits "Import-Funktion kommt bald" im Empty-State.

---

## Preview-UI Gestaltung

| Option | Description | Selected |
|--------|-------------|----------|
| Card-basierte Liste mit Toggles | Entity-Cards gruppiert nach Typ, pro Card ein Toggle | ✓ |
| Diff-View gegen aktuellen Plan | Side-by-side Vergleich Import vs. bestehende Daten | |
| Einfache Checkliste | Minimale Textliste mit Checkboxen | |

**User's choice:** [auto] Card-basierte Liste mit Toggles (recommended default)
**Notes:** TrafficLightBadge existiert bereits für Confidence-Chips. Diff-View wäre zu komplex für Phase 6 (Plan-Editor existiert noch nicht). Checkliste zu spartanisch für Confidence-Feedback.

---

## Offline-Import Verhalten

| Option | Description | Selected |
|--------|-------------|----------|
| Lokale SQLite-Drafts + Supabase-Sync | Konsistent mit Phase-3-Outbox-Pattern | ✓ |
| Direkt Supabase, Offline-Queue | Import nur mit Netz, Offline-Queue für spätere Submission | |
| Rein lokal, kein Cloud-Sync | Drafts nur auf dem Gerät | |

**User's choice:** [auto] Lokale SQLite-Drafts + Supabase-Sync (recommended default)
**Notes:** Phase-3-Sync-Architektur ist bereits implementiert. Neue Draft-Entities werden dem bestehenden SyncWorker hinzugefügt.

---

## Claude's Discretion

- Migration-Nummer, Column-Definitionen, Share-Intent Plugin Config, i18n-Strings, Card-Layout Details, Prompt-Feinschliff, complianceFlags-Darstellung

## Deferred Ideas

None — discussion stayed within phase scope.
