# Phase 5: AI-Removal + Import-Schema - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-09
**Phase:** 05-ai-removal-import-schema
**Areas discussed:** Vereinsregeln-Edge-Function, DB-Tabellen & Migrationen, Import-Schema Feinheiten, Capture-Screens Ersatz

---

## Vereinsregeln-Edge-Function

| Option | Description | Selected |
|--------|-------------|----------|
| Jetzt komplett entfernen | Edge Function + Client-Lib + Deno-Deps löschen. Phase 10 baut bei Bedarf neue manuelle Lösung. | |
| Code behalten, Anthropic-Import entfernen | Edge Function als Skeleton ohne AI-Calls behalten. | |
| Nur Feature-Flag reicht | Code bereits per Flag aus — nicht anfassen bis Phase 10. | |

**User's initial question:** Braucht man für PDF-Einlesen auch pay-per-token? Oder kann Max-Subscription genutzt werden? Falls nicht, entweder manuell oder über Import von txt/md Files.

**Clarification provided:** Max-Abo gilt nur für claude.ai Chat, nicht für API-Calls. Die Edge Function nutzt die API (pay-per-token). Alternative: Vereinssatzungs-PDF im Claude.ai-Chat hochladen und Regeln dort extrahieren lassen, Ergebnis als JSON per Import-Bridge importieren (gleiches Pattern wie Gartenanalyse).

**Follow-up decision:**

| Option | Description | Selected |
|--------|-------------|----------|
| Ja, jetzt entfernen | Edge Function + Client-Lib löschen. Phase 10 nutzt Claude.ai-Import. | ✓ |
| Später entscheiden | Auf Phase 10 verschieben. | |

**User's choice:** Jetzt komplett entfernen. Phase 10 nutzt Claude.ai-Import.

---

## DB-Tabellen & Migrationen

| Option | Description | Selected |
|--------|-------------|----------|
| Per Migration löschen | DROP TABLE ai_jobs, ai_results + pgmq-Queue. Sauberer Stand. | ✓ |
| Tabellen behalten, nur leeren | TRUNCATE statt DROP. | |
| Nur Code entfernen, Tabellen ignorieren | Kein Schema-Änderung. | |

**User's choice:** Per Migration löschen
**Notes:** Phase 4 war nie human-verified, kein Datenverlust.

---

## Import-Schema Feinheiten

### complianceFlags

| Option | Description | Selected |
|--------|-------------|----------|
| Im Schema behalten | Optional, vorwärtskompatibel. Claude.ai kann sie schon emittieren. | ✓ |
| Aus v1-Schema entfernen | Erst in v1.1 einführen. | |
| Optional markieren | Im Schema als optional deklarieren. | |

**User's choice:** Im Schema behalten

### freeFormNotes

| Option | Description | Selected |
|--------|-------------|----------|
| Plain string | Markdown erlaubt, nicht validiert. Maximal flexibel. | ✓ |
| Strukturiertes Format | Array mit Kategorie-Tags. | |

**User's choice:** Plain string

### Schema-Versionierung

| Option | Description | Selected |
|--------|-------------|----------|
| Neue Version = neues Schema | v1 bleibt stabil. v2 als neues File. App kann beide akzeptieren. | ✓ |
| Additive Evolution | v1 nur erweitern, nie brechen. | |
| Claude entscheidet | Nicht kritisch, erst relevant wenn v2 nötig. | |

**User's choice:** Neue Version = neues Schema

---

## Capture-Screens Ersatz

| Option | Description | Selected |
|--------|-------------|----------|
| Komplett entfernen | Route und alle Screens löschen. Kein Capture-Button auf Home. | ✓ |
| Platzhalter-Screen | "Demnächst: Gartenplan-Editor" anzeigen. | |
| Redirect auf Home | Route leitet auf Home um. | |

**User's choice:** Komplett entfernen
**Notes:** Phase 6 fügt Import-Screen hinzu, Phase 7 den Editor. Kein Zwischenlösung nötig bei 2 Nutzern.

---

## Claude's Discretion

- Migration-Reihenfolge und Abhängigkeiten zwischen DROP-Statements
- Ob gardenPlanRepo.ts teilweise erhalten bleibt oder komplett gelöscht wird
- Cleanup von i18n-Strings für Capture-Flow
- Bereinigung von Navigation/Routing nach Screen-Entfernung

## Deferred Ideas

None — discussion stayed within phase scope.
