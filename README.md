# Spatenstich 🌱

> Persönlicher digitaler Kleingarten-Assistent für deutsche Kleingärtner.

**Status:** MVP in Entwicklung · Saison 2026 · Milestone v2.0 (Phase 20: Fundament, Aufräumen, PWA-Deploy)

**v2.0 ist Web-first:** Spatenstich läuft als installierbare PWA in Chrome (Android-Handy + Desktop-Browser). Ein nativer Build (iOS/Android-Store) ist für v2.0 bewusst deaktiviert und kommt erst wieder ab Phase 29.

---

## Was ist das?

Spatenstich kombiniert manuellen Gartenplan-Editor mit strukturiertem Import aus Claude.ai und jahreszyklischer Aussaat- und Pflanzplanung mit dem Kontext des Bundeskleingartengesetzes und deiner Vereinssatzung.

**Plan erstellen → Kalender und Empfehlungen raus.**

Kein generisches Garten-App-Feature-Bingo. Sondern ein Assistent, der weiß:
- dass Walnussbäume im Kleingarten oft verboten sind
- dass "Mitte Mai nach den Eisheiligen" in München zwei Wochen später ist als in Freiburg
- dass dein Verein maximal 24 m² Laube erlaubt

---

## Features (MVP)

| Feature | Beschreibung | Status |
|---------|--------------|--------|
| **Manueller Plan-Editor** | Interaktiver 2D-Plan mit Drag & Drop von Beeten, Pflanzen, Infrastruktur | 🔜 Geplant |
| **Claude.ai Import** | Strukturierter Import aus externem Claude.ai-Projekt (zero In-App AI) | 🔜 Geplant |
| **Saatgut-Inventar** | Manuelle Erfassung von Sorten und Inventar | 🔜 Geplant |
| **Pflanz-/Aussaatkalender** | Wann was wo pflanzen – auf Basis Inventar, Plan und Klimazone | 🔜 Geplant |
| **Profil & Vereinsregeln** | PLZ → Klimazone, Archetyp, manuelle Vereinsregeln | 🔜 Geplant |

---

## Tech Stack

```
Client (Expo: iOS / Android / Web)
  └── expo-sqlite (Offline-Cache)
        └── Sync-Queue (Operation Log)
              └── Supabase (Frankfurt, EU)
                    ├── Postgres + Auth + Storage
                    ├── Edge Functions
                    └── (future) Weather API
```

- **Frontend:** [Expo](https://expo.dev) (React Native) mit Web-Export · TypeScript
- **Backend:** [Supabase](https://supabase.com) (Frankfurt) · Postgres · Edge Functions
- **Monorepo:** pnpm workspaces (`app/`, `supabase/`, `packages/shared`)
- **Lizenz:** AGPL-3.0

---

## Lokale Entwicklung

> Voraussetzungen: Node 20+, pnpm 9+, Expo CLI, Supabase CLI

```bash
# Repo klonen
git clone https://github.com/drkthng/spatenstich.git
cd spatenstich

# Abhängigkeiten installieren
pnpm install

# Supabase lokal starten
supabase start

# App starten (iOS Simulator / Android / Web)
pnpm --filter app start
```

Umgebungsvariablen: siehe `.env.example` (folgt im Setup-Schritt)

---

## Installation auf dem Android-Handy (Chrome)

Spatenstich ist eine installierbare PWA — kein Play-Store-Download nötig.

1. Öffne `https://spatenstich.pages.dev` in Chrome auf deinem Android-Handy.
2. Tippe oben rechts auf das Menü ⋮ und wähle **„App installieren"** (alternativ zeigt die App selbst nach dem Laden ein Installations-Banner mit demselben Weg — beide führen zum gleichen Ergebnis).
3. Bestätige die Installation. Chrome legt ein Icon auf deinem Startbildschirm an.
4. Öffne die App über das neue Icon — sie startet jetzt ohne Browser-Adressleiste, wie eine native App.
5. Melde dich in der installierten App einmal mit deinem Konto an. Danach bleibt die Sitzung erhalten, auch offline.

---

## Import aus der Claude-App per Teilen

Nach der Installation (siehe oben) taucht **„Spatenstich"** im Android-Teilen-Menü auf — vorher nicht, das ist eine Chrome-Voraussetzung für installierte PWAs.

- **Was geteilt werden kann:** entweder eine `.json`-Datei mit einem strukturierten Analyse-Ergebnis aus deinem Claude-Projekt, oder ein kopierter Text (z. B. wenn du das JSON direkt aus dem Chat kopierst).
- **Wie es funktioniert:** In der Claude-App auf „Teilen" tippen, „Spatenstich" aus der Liste wählen. Die App öffnet sich direkt in der **Import-Vorschau** mit dem geteilten Payload — du musst nichts manuell einfügen.
- Falls du nicht angemeldet bist, wenn ein Teilen-Versuch ankommt: Spatenstich merkt sich das Ziel und bringt dich nach dem Login automatisch dorthin zurück.

---

## Claude-Projekt einrichten

Für die KI-gestützte Analyse (optional, die App selbst macht keine KI-Aufrufe) richtest du ein eigenes Projekt in Claude.ai ein:

1. Bei [claude.ai](https://claude.ai) anmelden (funktioniert sowohl mit einem kostenlosen als auch mit einem bezahlten Konto).
2. Ein neues Projekt anlegen, z. B. „Spatenstich Garden".
3. In der Spatenstich-App unter **„Mehr → Claude-Projekt einrichten"** findest du den Prompt und das Import-Schema zum Kopieren — beides in das Claude-Projekt (Anweisungen bzw. Projektwissen) einfügen.
4. Danach kannst du Fotos oder Beschreibungen deines Kleingartens im Claude-Chat analysieren lassen und das Ergebnis per Teilen (siehe oben) oder Zwischenablage in die App importieren.

---

## Betrieb

- **Deploy:** Jeder Merge nach `master` löst automatisch einen Deploy nach Cloudflare Pages aus (`https://spatenstich.pages.dev`).
- **Rollback:** Über das Cloudflare-Dashboard (Workers & Pages → spatenstich → Deployments → „Rollback") lässt sich jederzeit auf einen früheren Stand zurückspringen.
- **Supabase-Keep-alive:** Der GitHub-Zeitplan (`supabase-keepalive.yml`) pausiert nach **60 Tagen ohne Repo-Aktivität** — das ist dokumentiertes GitHub-Verhalten, nicht spatenstich-spezifisch. Deshalb läuft zusätzlich ein täglicher Ping über den Windows Task Scheduler auf dem 24/7-PC (`scripts/keepalive.ps1`) als unabhängiger zweiter Weg.
- **Backup:** `scripts/backup-supabase.ps1` erstellt ein komprimiertes `pg_dump`-Backup mit 30-Tage-Rotation. Wird vor jeder destruktiven Migration gebraucht (z. B. Migration 021 in Phase 21) — vorher einmal manuell ausführen und das Datenbank-Passwort im Windows Credential Manager hinterlegen.

---

## Projektstruktur

```
spatenstich/
├── app/              # Expo React Native App
├── supabase/         # Migrations, Edge Functions, Seed
│   └── migrations/
├── packages/
│   └── shared/       # Typen, Sorten-DB, Klimazonen-Lookup
└── .planning/        # GSD Planung (PROJECT.md, ROADMAP.md, ...)
```

---

## Roadmap

Die detaillierte Planung liegt in [`.planning/ROADMAP.md`](.planning/ROADMAP.md) (wird nach Initialisierung erstellt).

**Grobe Meilensteine:**

- **Woche 1:** Setup, Auth, Onboarding (PLZ, Archetyp)
- **Woche 2:** Sorten-DB (100 Pflanzen), Klimazonen-Lookup
- **Woche 3:** Saatgut-Inventar (manuelle Erfassung)
- **Woche 4:** 2D-Plan-Editor (Canvas, Drag & Drop)
- **Woche 5:** Claude.ai Import-Bridge
- **Woche 6:** Plan-Rendering + Vereinsregeln
- **Woche 7:** Pflanzkalender aus Inventar + Plan
- **Woche 8:** Polish, Offline-Sync, Dogfooding
- **Ziel:** MVP-stabil Ende Juni 2026

---

## Rechtliches

- **Lizenz:** [AGPL-3.0](LICENSE)
- **Haftungsausschluss:** Die App gibt Empfehlungen ohne Gewähr. BKleingG-Compliance und Vereinsregelkonformität liegen in der Verantwortung des Nutzers.
- **Datenschutz:** EU-Hosting (Supabase Frankfurt). Fotos verschlüsselt at-rest. DSGVO-konform.

---

## Mitmachen

MVP wird zunächst für den persönlichen Gebrauch entwickelt. Issues und Feedback willkommen — Stars auch. 🌻
