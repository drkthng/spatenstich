# Spatenstich 🌱

> Persönlicher digitaler Kleingarten-Assistent für deutsche Kleingärtner.

**Status:** MVP in Entwicklung · Saison 2026 · Phase 1 abgeschlossen ✓

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
