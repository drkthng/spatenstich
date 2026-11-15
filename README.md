# Spatenstich

> Ein Kleingarten, zwei Personen, ein genauer Plan, und eine App, die daraus sagt, was heute zu tun ist.

**Stand:** v3.0 „Garten mit KI“ ist gebaut und ausgeliefert unter `https://spatenstich.pages.dev`. Die Abnahme auf den beiden Handys und am Desktop steht aus (`docs/test-plans/v3-abnahme.md`); danach folgt der Tag `v3.0.0`. Ziel: nutzbar zum Start der Vorkultur Ende Februar 2027.

Spatenstich ist eine private, nicht kommerzielle App für einen Kleingarten in Deutschland. Sie läuft als installierbare Web-App in Chrome auf Android und im Desktop-Browser. Eine App aus dem Play Store gibt es nicht.

---

## Was die App kann

| Bereich | Was er tut |
|---|---|
| **Plan** | Maßstäblicher 2D-Plan der Parzelle. Beete, Pflanzen und Anlagen setzen, verschieben, in der Größe ändern, drehen, benennen; freie Umrisse; Einrasten an Raster und Nachbarn; Rückgängig. Derselbe Editor für Finger und Maus. |
| **Gemeinsamer Garten** | Zwei Konten pflegen denselben Garten. Änderungen kommen in Sekunden beim anderen an; wer offline war, gleicht später ab, die spätere Bearbeitung gilt. |
| **Heute** | Aufgabenliste aus Plan, Kalender, Jahreszeit und Wettervorhersage, mit Zeitbudget („Ich habe 30 Minuten“). Entsteht auf dem Gerät und geht ohne Netz; mit Netz bringt die KI sie in eine sinnvolle Reihenfolge. Abhaken sieht auch der andere. |
| **Kalender** | Vorziehen, Säen, Auspflanzen und Ernten für rund 90 Pflanzen, nach Klimazone der Postleitzahl. Suche, „In eurem Plan“, „Alle Pflanzen“, Markierung für heute. |
| **Foto-Abgleich** | Fotos vom Garten werden mit dem Plan verglichen. Heraus kommen Befunde (Größe, Lage, Fehlendes, neue Pflanzen, Schädlinge), die einzeln angenommen oder abgelehnt werden. Ohne Bestätigung ändert sich am Plan nichts. |
| **KI-Budget** | Jede KI-Anfrage steht mit Kosten im Verbrauchsbuch des Gartens. Eine Monatsgrenze (Vorgabe 100 $) sperrt weitere Anfragen, alles andere geht weiter. |
| **Import aus Claude.ai** | Zweiter Weg ohne Kosten in der App: Ergebnis aus einem eigenen Claude.ai-Projekt einfügen oder teilen, sichten, übernehmen. |
| **Ohne Netz** | Die App startet und zeigt den letzten Plan und die Aufgabenliste. Abgleich, Foto-Abgleich und KI-Sortierung brauchen eine Verbindung. |

---

## Was mit Daten geschieht

- Konto und Garten liegen bei Supabase auf Servern in Frankfurt am Main.
- Fotos verlassen das Gerät nur für einen Foto-Abgleich. Sie gehen über eine eigene Server-Funktion an die Claude-API von Anthropic (USA) und werden von Spatenstich nicht gespeichert; gespeichert werden nur die Befunde.
- Der API-Schlüssel liegt ausschließlich als Geheimnis auf dem Server. Er steht in keinem Gerät, keinem Bundle und nicht in diesem Repository; die CI prüft das bei jedem Lauf.
- Der vollständige Text steht in der App unter „Mehr“, „Datenschutz“ und ist auch vor dem Anmelden lesbar (`/datenschutz`).

---

## Technik

```
Browser (Android Chrome, Desktop)            Supabase (Frankfurt)
  Expo / React Native Web, als PWA             Postgres mit Zeilenrechten
  Plan-Editor: SVG, Pointer-Events             Auth, Realtime
  IndexedDB (letzter Stand, Warteschlange) ──► Edge Function `ai`      ──► Claude-API (Anthropic)
  Service Worker (Start ohne Netz)             Edge Function `weather` ──► Open-Meteo, Zippopotam
```

- **App:** [Expo](https://expo.dev) mit Web-Export, TypeScript, NativeWind, Zustand, TanStack Query
- **Backend:** [Supabase](https://supabase.com): Postgres, Auth, Realtime, Edge Functions (Deno)
- **KI:** offizielles Anthropic-SDK, nur in der Edge Function `ai`; Standardmodell `claude-opus-5-5`
- **Auslieferung:** Cloudflare Pages, bei jedem Push auf `master` nach bestandenen Prüfungen
- **Monorepo:** pnpm workspaces (`app/`, `supabase/`, `packages/shared`)

---

## Lokale Entwicklung

Voraussetzungen: Node 22, pnpm 10, für das Backend die Supabase CLI.

```bash
git clone https://github.com/drkthng/spatenstich.git
cd spatenstich
pnpm install

# Adresse und öffentlichen Schlüssel des Supabase-Projekts eintragen
cp app/.env.example app/.env

pnpm --filter app web        # Entwicklungsserver auf Port 8095
```

Prüfungen, wie sie auch die CI fährt:

```bash
pnpm typecheck
pnpm lint
pnpm test                    # App und gemeinsames Paket
pnpm --filter app run build:web
```

Einige Tests bewachen Regeln der Gestaltung und der Sprache und schlagen bei Rückfällen fehl: nur Farben aus den Tokens (`designTokens.guard`), ein Icon-Satz ohne Emoji und Zeichen als Knöpfe (`iconSet.guard`), alle Texte in `packages/shared/src/i18n/de.json` und ohne Fachwörter (`plainText.guard`), Kontrast, Linienstärke und Größe der Bedienflächen (`readability.guard`).

---

## Installation auf dem Android-Handy

1. `https://spatenstich.pages.dev` in Chrome öffnen.
2. Im Menü „App installieren“ wählen (die App bietet es nach dem Laden auch selbst an).
3. Die App über das neue Symbol auf dem Startbildschirm öffnen und einmal anmelden. Danach bleibt die Anmeldung erhalten, auch ohne Netz.

Wer eingeladen wurde, gibt den Einladungscode gleich bei der Registrierung ein und landet im gemeinsamen Garten.

---

## Import aus Claude.ai

Für den Weg ohne KI-Kosten in der App richtet jede Person ein eigenes Projekt in [claude.ai](https://claude.ai) ein:

1. Ein Projekt anlegen und den Text aus `prompts/garden-project-system-prompt.md` als Anweisung einfügen, die Vorlage `schemas/spatenstich-import.v1.json` als Projektwissen.
2. Fotos oder Beschreibungen im Chat auswerten lassen. Das Projekt antwortet mit einem Ergebnisblock.
3. Den Block kopieren und in der App unter „Mehr“, „Aus Claude.ai importieren“ einfügen, oder aus der Claude-App mit „Teilen“ an Spatenstich schicken (Spatenstich erscheint im Teilen-Menü, sobald die App installiert ist).
4. In der Vorschau entscheiden, was in den Plan kommt.

---

## Betrieb

- **Auslieferung:** Jeder Push auf `master` läuft durch Geheimnis-Prüfung, Typprüfung, Lint und Tests und wird danach auf Cloudflare Pages ausgeliefert. Welche Ausgabe läuft, steht in der App unter „Mehr“ ganz unten (Version und Build).
- **Zurück auf einen früheren Stand:** Cloudflare-Dashboard, Workers & Pages, spatenstich, Deployments, „Rollback“.
- **Impressum:** Name und Anschrift des Betreibers stehen nicht in diesem öffentlichen Repository. Der Deploy liest sie aus der Repository-Variable `EXPO_PUBLIC_IMPRINT` (Zeilen mit `|` getrennt). Fehlt sie, sagt die Seite „Impressum“ das.
- **KI-Zugang:** Einrichtung des Schlüssels, Grenzen, Verbrauchsbuch und die Schlüssel-Prüfung in der CI: `docs/betrieb/ki-zugang.md`.
- **Aufgaben und Wetter:** Regeln der Aufgabenliste und die Wetterquelle: `docs/betrieb/aufgaben-und-wetter.md`.
- **Backend wach halten:** Ein GitHub-Zeitplan (`supabase-keepalive.yml`) fragt das Backend regelmäßig ab und legt bei einem Ausfall ein Issue an. Der Zeitplan pausiert nach 60 Tagen ohne Aktivität im Repository. Vorgeschichte: `docs/betrieb/2026-10-backend-ausfall.md`.
- **Backup:** `scripts/backup-supabase.ps1` erstellt ein komprimiertes Backup der Datenbank mit 30 Tagen Aufbewahrung.

---

## Aufbau des Repositorys

```
spatenstich/
├── app/              Expo-App (Bildschirme in app/app, Logik und Komponenten in app/src)
├── packages/shared/  Typen, Pflanzenkatalog, Klimazonen, Kalenderlogik, deutsche Texte
├── supabase/         Migrationen und Edge Functions (ai, weather)
├── prompts/          Anweisung für das Claude.ai-Projekt (Import)
├── schemas/          Vorlage für den Import
├── scripts/          Prüfungen und Werkzeuge für Betrieb und Build
├── docs/             Betrieb, Spezifikationen, Prüflisten
└── .planning/        Planung (PROJECT.md, ROADMAP.md, REQUIREMENTS.md)
```

---

## Rechtliches

- **Lizenz:** AGPL-3.0
- **Haftungsausschluss:** Kalenderzeiten, Aufgaben und Befunde der KI sind Empfehlungen ohne Gewähr. Ob ein Garten die Regeln des Bundeskleingartengesetzes und des Vereins einhält, bleibt Verantwortung der Nutzer.
- **Pflanzendaten:** Quellen und Lizenzen in `packages/shared/src/data/LICENSES.md`.
