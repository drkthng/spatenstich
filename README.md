# Spatenstich 🌱

> Persönlicher digitaler Kleingarten-Assistent für deutsche Kleingärtner.

**Status:** MVP in Entwicklung · Saison 2026 · Phase 1 abgeschlossen ✓

---

## Was ist das?

Spatenstich übersetzt deine reale Parzelle per Foto in einen interaktiven 2D-Plan und kombiniert jahreszyklische Aussaat- und Pflanzplanung mit dem Kontext des Bundeskleingartengesetzes und deiner Vereinssatzung.

**Foto rein → Plan, Kalender und Empfehlungen raus.**

Kein generisches Garten-App-Feature-Bingo. Sondern ein Assistent, der weiß:
- dass Walnussbäume im Kleingarten oft verboten sind
- dass "Mitte Mai nach den Eisheiligen" in München zwei Wochen später ist als in Freiburg
- dass dein Verein maximal 24 m² Laube erlaubt

---

## Features (MVP)

| Feature | Beschreibung | Status |
|---------|--------------|--------|
| **Garten-Erfassung per Foto** | Fotos fotografieren → Claude Vision analysiert → schematischer 2D-Plan | 🔜 Geplant |
| **Interaktiver Plan-Editor** | Drag & Drop von Beeten, Pflanzen, Infrastruktur auf dem Plan | 🔜 Geplant |
| **Saatgut-Inventar** | Samentüten fotografieren → automatische Erkennung der Sorte | 🔜 Geplant |
| **Pflanz-/Aussaatkalender** | Wann was wo pflanzen – auf Basis Inventar, Plan und Klimazone | 🔜 Geplant |
| **Profil & Vereinsregeln** | PLZ → Klimazone, Archetyp, PDF-Upload Vereinssatzung | 🔜 Geplant |

---

## Tech Stack

```
Client (Expo: iOS / Android / Web)
  └── expo-sqlite (Offline-Cache)
        └── Sync-Queue (Operation Log)
              └── Supabase (Frankfurt, EU)
                    ├── Postgres + Auth + Storage
                    ├── Edge Functions
                    │     ├── Claude API (Vision + Text)
                    │     └── Pl@ntNet API
                    └── (future) Weather API
```

- **Frontend:** [Expo](https://expo.dev) (React Native) mit Web-Export · TypeScript
- **Backend:** [Supabase](https://supabase.com) (Frankfurt) · Postgres · Edge Functions
- **KI:** [Claude API](https://anthropic.com) (Vision, Text) · [Pl@ntNet API](https://plantnet.org)
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
│   ├── functions/    # Claude/Pl@ntNet Integrations
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
- **Woche 3:** Saatgut-Inventar (Foto + Liste, Claude-Integration)
- **Woche 4:** Garten-Erfassung (Fotos, Maße, Claude-Analyse)
- **Woche 5:** 2D-Plan-Editor (Canvas, Drag & Drop)
- **Woche 6:** Erfassung → Plan-Rendering + Vereinsregeln
- **Woche 7:** Pflanzkalender aus Inventar + Plan
- **Woche 8:** Polish, Offline-Sync, Dogfooding
- **Ziel:** MVP-stabil Ende Juni 2026

---

## Rechtliches

- **Lizenz:** [AGPL-3.0](LICENSE)
- **Haftungsausschluss:** Die App gibt Empfehlungen ohne Gewähr. BKleingG-Compliance und Vereinsregelkonformität liegen in der Verantwortung des Nutzers.
- **Pl@ntNet API:** Nichtkommerzielle Nutzung frei. Bei kommerzieller Nutzung separate Vereinbarung erforderlich.
- **Datenschutz:** EU-Hosting (Supabase Frankfurt). Fotos verschlüsselt at-rest. DSGVO-konform.

---

## Mitmachen

MVP wird zunächst für den persönlichen Gebrauch entwickelt. Issues und Feedback willkommen — Stars auch. 🌻
