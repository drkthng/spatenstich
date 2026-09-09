# Phase 2: Auth, Profile & Vereinsregeln - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-19
**Phase:** 02-auth-profile-vereinsregeln
**Areas discussed:** Onboarding-Struktur, Navigation & Route-Schutz, Vereinsregeln-UX, Local-Modus-Datenspeicherung

---

## Onboarding-Struktur

| Option | Description | Selected |
|--------|-------------|----------|
| Linearer Pflicht-Wizard | Alle 5 Schritte müssen der Reihe nach durchlaufen werden | |
| Wizard mit optionalem Schritt | Auth → PLZ → Archetyp Pflicht, Vereinsregeln optional | |
| Freies Navigieren | Kein Wizard — Nutzer kann Profil in Einstellungen aufbauen, mit Hinweisen welche Features nicht gehen | ✓ |

**User's choice:** Freies Navigieren — "freies navigieren mit Hinweis welche Funktionen nicht gehen wenn man Punkt nicht eingibt"
**Notes:** User wants no forced wizard steps, but contextual inline banners when a feature requires missing data.

| Option | Description | Selected |
|--------|-------------|----------|
| Gleicher Wizard, andere Persistence | Beide Pfade (lokal/Account) durchlaufen gleiche Screens, nur Persistence unterscheidet sich | ✓ |
| Vereinfachter lokaler Wizard | Lokal-Modus zeigt nur PLZ + Archetyp | |

**User's choice:** Gleicher Wizard, andere Persistence

| Option | Description | Selected |
|--------|-------------|----------|
| Auth-Wahl ist Pflicht | Beim ersten Start muss Account oder "lokal nutzen" gewählt werden | ✓ |
| Vollständig optional | App startet im Gast-Modus | |

**User's choice:** Auth-Wahl ist Pflicht

| Option | Description | Selected |
|--------|-------------|----------|
| Inline-Banner im Kontext | Banner erscheint direkt beim Feature das Daten benötigt | ✓ |
| Globaler Profil-Fortschrittsbalken | Checkliste nur im Profil-Screen | |
| Beides kombinieren | Profil-Checkliste + kontextuelle Banner | |

**User's choice:** Inline-Banner im Kontext (Empfohlen)

---

## Navigation & Route-Schutz

| Option | Description | Selected |
|--------|-------------|----------|
| (auth) + (app) Gruppen | Expo Router File-Groups mit Session-Guard im Root-Layout | ✓ |
| Conditional Rendering im Root | Ein Layout-Screen rendert Auth oder App basierend auf Zustand | |

**User's choice:** (auth) + (app) Gruppen (Empfohlen)

| Option | Description | Selected |
|--------|-------------|----------|
| Direkt zum Garten-Plan-Placeholder | Placeholder-Screen "Mein Garten" nach Auth | ✓ |
| Profil/Einstellungen-Screen | User landet im Profil nach Auth | |

**User's choice:** Direkt zum Garten-Plan-Placeholder (Empfohlen)

---

## Vereinsregeln-UX

| Option | Description | Selected |
|--------|-------------|----------|
| Synchron mit Loading-Screen | User wartet ~10-30s nach PDF-Upload, sieht Ergebnis direkt | ✓ |
| Async via pgmq-Queue | Upload queued, Notification wenn fertig | |

**User's choice:** Synchron mit Loading-Screen (Empfohlen)

| Option | Description | Selected |
|--------|-------------|----------|
| Listenansicht — alle auf einmal | Scrollbare Liste mit Toggle + Edit pro Regel | ✓ |
| Einzeln bestätigen (Card-by-Card) | Eine Karte pro Regel, Wizard-Navigation | |

**User's choice:** Listenansicht — alle auf einmal (Empfohlen)

| Option | Description | Selected |
|--------|-------------|----------|
| Vorgefertigte häufige Regeln zum Ankreuzen | ~10-15 Regeln mit Checkboxen und Wert-Eingaben; BKleingG immer aktiv | ✓ |
| Freitext pro Regelkategorie | Formular mit Kategorien, freie Text-Eingabe | |

**User's choice:** Vorgefertigte häufige Regeln zum Ankreuzen (Empfohlen)

| Option | Description | Selected |
|--------|-------------|----------|
| Im Profil-Screen als Statusanzeige | Ampel (grün/gelb/rot) mit aktuellem Nutz/Zier-Anteil | ✓ |
| Nur im Plan-Editor (Phase 5) | Warnung erst implementieren wenn Editor existiert | |

**User's choice:** Im Profil-Screen als Statusanzeige (Empfohlen)

---

## Local-Modus-Datenspeicherung

| Option | Description | Selected |
|--------|-------------|----------|
| Lokal-Modus: StorageAdapter. Account-Modus: Supabase | Saubere Trennung in Phase 2 | ✓ |
| Beide Modes StorageAdapter + Supabase-Sync | Alle Nutzer schreiben in StorageAdapter, Account-Nutzer syncen | |

**User's choice:** Lokal: StorageAdapter, Account: Supabase (Empfohlen)

| Option | Description | Selected |
|--------|-------------|----------|
| Expliziter Button in Profil-Screen | "Account erstellen und Daten übertragen" Button | ✓ |
| Beim Zugriff auf Cloud-Features | Just-in-time Registrierung-Vorschlag | |

**User's choice:** Expliziter Button in Profil-Screen (Empfohlen)

---

## Claude's Discretion

- Haftungsausschluss (NFR-07): Zeitpunkt und Design der Anzeige
- PDF-Upload-Verfügbarkeit im Lokal-Modus: UX für Redirect zur Checkliste
- Loading-Screen-Design für PDF-Extraktion
- Inline-Banner-Design (Icon, Farbe, Dismiss-Verhalten)

## Deferred Ideas

- **Multi-User / gemeinsamer Garten:** User möchte App mit Partnerin teilen — notiert für Post-MVP Phase.
