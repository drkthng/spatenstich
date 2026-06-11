---
phase: 10
slug: aussaatkalender-v1
status: approved
reviewed_at: 2026-06-11
shadcn_initialized: true
preset: "new-york / stone"
created: 2026-06-11
---

# Phase 10 — UI Design Contract: Aussaatkalender v1

> Visueller und interaktiver Vertrag für Phase 10. Erstellt von gsd-ui-researcher,
> geprüft von gsd-ui-checker.
>
> **Sprache:** Alle User-facing Strings auf Deutsch mit UTF-8-Umlauten (ä, ö, ü, ß).
> Technische Bezeichner dürfen Englisch bleiben. Strings gehören in `de.json`.

---

## Design System

| Eigenschaft | Wert |
|-------------|------|
| Tool | react-native-reusables (manuell installiert, Phase 2) |
| Preset | new-york / stone (components.json, `baseColor: "stone"`) |
| Component library | react-native-reusables (Headless-Primitives via NativeWind 4.1.23) |
| Icon library | lucide-react-native |
| Font | System-Default (Expo SDK 53 — kein Custom Font installiert) |
| Styling | NativeWind 4 className-only Pattern — keine variants CSS |

**shadcn Gate:** `components.json` vorhanden (Phase 2). Preset bestätigt: `new-york / stone`.
Keine neuen shadcn-Komponenten in Phase 10 — alle benötigten Primitives (Card, Button, Text,
Badge, InlineBanner) sind bereits im Repo vorhanden.

---

## Spacing Scale

Deklarierte Werte (NativeWind Tailwind-Scale, Vielfache von 4):

| Token | Wert | Verwendung |
|-------|------|------------|
| xs | 4px | Icon-Gaps, inline padding innerhalb Gantt-Legende |
| sm | 8px | Kompakter Element-Abstand (Pflanzenliste Row-Gap, Gantt-Label-Abstand) |
| md | 16px | Standard-Padding (Screen-Horizontal-Padding, Card-Innen-Padding) |
| lg | 24px | Abschnitt-Padding (Wochen-View Sections) |
| xl | 32px | Layout-Gaps (zwischen Wochen-Card und Pflanzenliste) |
| 2xl | 48px | Größere Abschnittsumbrüche (zwischen Kalender-Sektionen) |
| 3xl | 64px | Reserviert für zukünftige Phase-14-Polish |

**Ausnahmen:**
- Touch-Targets: `min-h-[44px] min-w-[44px]` auf allen Pressable-Elementen (iOS HIG) — entspricht 44px, kein 8pt-Vielfaches, aber app-weite Konvention seit Phase 2
- Gantt-Balken-Höhe: 20px (festgelegt in RESEARCH.md Muster 3) — kein Tailwind-Token, direkter `style`-Wert
- Gantt-Monats-Header: 16px Zeilenhöhe (Label, kein Spacing-Token)

---

## Typography

| Rolle | Größe | Gewicht | Zeilenhöhe | NativeWind-Klasse |
|-------|-------|---------|------------|-------------------|
| Body | 14px (text-sm) | 400 (normal) | 1.5 | `text-sm text-stone-800 dark:text-stone-100` |
| Label | 12px (text-xs) | 400 (normal) | 1.4 | `text-xs text-stone-500 dark:text-stone-400` |
| Heading | 18px (text-lg) | 600 (semibold) | 1.25 | `text-lg font-semibold text-stone-700 dark:text-stone-200` |
| Display (KW-Titel) | 20px (text-xl) | 600 (semibold) | 1.2 | `text-xl font-semibold text-stone-900 dark:text-stone-50` |

**Begründung:** Aus bestehenden Screens abgeleitet (index.tsx: `text-lg font-semibold`,
`text-sm`, `text-xs`; InlineBanner.tsx: `text-sm`). Keine neuen Font-Größen — Konsistenz
mit den Phasen 1–9.

**Gantt-spezifisch:**
- Pflanzenname in Gantt-Zeile: `text-sm font-semibold` (14px, 600)
- Monats-Kürzel unter Gantt-Balken: `text-xs` (12px, 400)
- Aktions-Typ-Label in Legende: `text-xs` (12px, 400)

---

## Color

| Rolle | Wert | Verwendung |
|-------|------|------------|
| Dominant (60%) | `#F9F7F4` (light) / `#1C1917` (dark) | App-Hintergrund, Screen-Background — aus index.tsx `bg-[#F9F7F4]` |
| Secondary (30%) | `#E7E5E4` stone-200 (light) / `#292524` stone-800 (dark) | Cards (`bg-stone-200 dark:bg-stone-800`), Gantt-Track-Background (`#E5E7EB`), Listenzeilen-Hintergrund |
| Accent (10%) | `#4A7C59` (light) / `#6BAA7E` (dark) | Primär-CTA Button, "Zu Plan hinzufügen"-Button, aktive Filter-Chips |
| Destructive | `#DC2626` (red-600) | Fruchtfolge-Warnung-Border (InlineBanner variant="error"), Konflikt-Banner |

**Accent reserviert für:**
1. Primär-CTA Button ("Zu Plan hinzufügen") — `bg-[#4A7C59]`
2. Aktiver Filter-Chip "Nur meine Pflanzen" — `bg-[#4A7C59]` Hintergrund + weiße Schrift
3. Action-Label in InlineBanner ("Jetzt eingeben" für fehlende PLZ) — `text-[#4A7C59]`

**NIEMALS** für: Gantt-Balken (diese haben eigene Phase-Farben), Border-Dekorationen, Gantt-Legende.

### Gantt-Phasen-Farben (eigenes System, nicht der 60/30/10-Palette)

Diese Farben sind **ausschließlich** für Gantt-Balken und Legende reserviert.

| Phase | Farbe | Hex | NativeWind bg-Klasse |
|-------|-------|-----|----------------------|
| Vorkultur | Violett | `#A78BFA` | `bg-[#A78BFA]` |
| Direktsaat | Grün | `#34D399` | `bg-[#34D399]` |
| Auspflanzen | Blau | `#60A5FA` | `bg-[#60A5FA]` |
| Ernte | Orange | `#FB923C` | `bg-[#FB923C]` |

**Quelle:** RESEARCH.md Muster 3 (`FARBEN`-Objekt — `#a78bfa`, `#34d399`, `#60a5fa`, `#fb923c`).
Diese Farben wurden für Kontrast auf `#E5E7EB` (Gantt-Track-Hintergrund) gewählt und sind
im bestehenden Codebase-Farbsystem noch nicht vergeben — kein Konflikt mit PLAN_COLORS.

### Semantische Farben (Banners — bestehend seit Phase 9)

| Variante | Border | Background |
|----------|--------|------------|
| warning (amber) | `border-amber-500` | `bg-amber-50 dark:bg-amber-950` |
| error (red) | `border-red-600` | `bg-red-50 dark:bg-red-950` |
| success (green) | `border-green-600` | `bg-green-100 dark:bg-green-950` |

---

## Komponenten-Inventar

### Neue Komponenten (Phase 10)

| Komponente | Pfad | Zweck |
|------------|------|-------|
| `KalenderWochenCard` | `app/src/components/kalender/KalenderWochenCard.tsx` | "Diese Woche"-Übersicht: KW-Titel + gruppierte Aktionsliste |
| `GanttStreifen` | `app/src/components/kalender/GanttStreifen.tsx` | 12-Monats horizontale Balken-Reihe (View-Bars, kein SVG) |
| `GanttLegende` | `app/src/components/kalender/GanttLegende.tsx` | Farb-Legende der 4 Phasen-Typen |
| `FruchtfolgeWarnung` | `app/src/components/kalender/FruchtfolgeWarnung.tsx` | Inline-Banner CAL-06 (reuse InlineBanner variant="warning") |
| `PflanzenKalenderZeile` | `app/src/components/kalender/PflanzenKalenderZeile.tsx` | Eine Zeile in der Pflanzenliste (Name + Aktions-Icons + Gantt-Miniatur) |

### Neue Screens (Expo Router Routes)

| Screen | Pfad | Zweck |
|--------|------|-------|
| Wochen-View | `app/app/(app)/kalender/index.tsx` | Haupt-Kalender-Screen: KW-Card + Pflanzenliste + Filter |
| Pflanzen-Detail | `app/app/(app)/kalender/[slug].tsx` | Gantt-Detail + Phase-8-Infos + "Auf welchem Beet?" |

### Wiederverwendete bestehende Komponenten

| Komponente | Pfad | Verwendung in Phase 10 |
|------------|------|------------------------|
| `InlineBanner` | `app/src/components/InlineBanner.tsx` | PLZ-fehlend-Warnung, CAL-06 Fruchtfolge-Warnung |
| `Card`, `CardHeader`, `CardContent` | `app/src/components/ui/card.tsx` | KalenderWochenCard-Wrapper, PflanzenDetailView-Abschnitte |
| `Button` | `app/src/components/ui/button.tsx` | "Zu Plan hinzufügen" (default), Filter-Toggle (outline), Zurück (ghost) |
| `Badge` | `app/src/components/ui/badge.tsx` | Aktions-Typ-Label (Vorkultur/Direktsaat/Auspflanzen/Ernte) in Wochenansicht |

---

## Screen-Anatomien

### Screen 1: Wochen-View (`/(app)/kalender/`)

```
┌──────────────────────────────────────────┐
│ Header: "Aussaatkalender" [KW 24 · 2026] │  ← text-lg font-semibold + KW-Label text-xs
├──────────────────────────────────────────┤
│ [InlineBanner] wenn klimazone == null:   │  ← variant="warning", action → /(app)/profile/plz
│  "PLZ noch nicht gesetzt — Klimazone     │
│   unbekannt. Jetzt eingeben"             │
├──────────────────────────────────────────┤
│  [Filter-Chip] "Nur meine Pflanzen" [X]  │  ← aktiv = bg-[#4A7C59] text-white
│                                          │     inaktiv = outline border-stone-300
├──────────────────────────────────────────┤
│  KalenderWochenCard:                     │
│  ┌────────────────────────────────────┐  │
│  │ "Diese Woche"        KW 24 · 2026  │  │  ← text-xl font-semibold / text-xs text-stone-400
│  │ ─────────────────────────────────  │  │
│  │ [Vorkultur-Badge] Tomate           │  │  ← Badge bg-[#A78BFA] + Pflanzename text-sm
│  │ [Vorkultur-Badge] Paprika          │  │
│  │ [Direktsaat-Badge] Möhre           │  │  ← Badge bg-[#34D399]
│  │ [Auspflanzen-Badge] Zucchini       │  │  ← Badge bg-[#60A5FA]
│  │ [Ernte-Badge] Spinat               │  │  ← Badge bg-[#FB923C]
│  │                                    │  │
│  │ → Tippe auf eine Pflanze für       │  │  ← text-xs text-stone-400 (nur wenn ≥1 Pflanze)
│  │   Details und Gantt-Ansicht        │  │
│  └────────────────────────────────────┘  │
│                                          │
│  Alle Pflanzen (Jahresübersicht):        │  ← text-sm font-semibold text-stone-600
│  ┌────────────────────────────────────┐  │
│  │ Tomate     ████░░░░█████░░░░░░░░░░ │  │  ← PflanzenKalenderZeile (Gantt-Miniatur 8px hoch)
│  │ Möhre      ░░░░░████████░░░████░░░ │  │
│  │ Zucchini   ░░░░░░░░██████░░░░███░░ │  │
│  │ ...                                │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

**Scroll-Verhalten:** Gesamter Screen scrollbar (ScrollView vertikal).
Jede PflanzenKalenderZeile ist pressable → navigiert zu `/(app)/kalender/[slug]`.

### Screen 2: Pflanzen-Detail (`/(app)/kalender/[slug]`)

```
┌──────────────────────────────────────────┐
│ ← Zurück   "Tomate"                      │  ← Stack-Header mit Zurück-Button
├──────────────────────────────────────────┤
│  Klimazone: 4 (Berlin/Mittelfeld)        │  ← text-xs text-stone-400
│                                          │
│  [GanttStreifen — vollbreite 12-Monate]  │
│  Jan Feb Mrz Apr Mai Jun Jul Aug Sep ...  │  ← text-xs Monats-Kürzel (3-Buchstaben)
│  ░░░████░░░░░░░░░░░░░████████░░░░░░░░    │  ← farbige View-Bars (20px hoch)
│                                          │
│  [GanttLegende]                          │
│  ● Vorkultur  ● Direktsaat               │
│  ● Auspflanzen ● Ernte                   │
├──────────────────────────────────────────┤
│  Pflanzen-Infos (Phase 8):               │
│  Mindestabstand: 60 cm                   │  ← text-sm
│  Sonnenbedarf: voll                      │
│  Familie: Solanaceae                     │
│  [FruchtfolgeWarnung wenn Konflikt]      │
├──────────────────────────────────────────┤
│  Auf welchem Beet?                       │  ← text-sm font-semibold
│  • Beet "Südseite" (Beet 1)             │
│  • (Noch nicht im Plan)                  │  ← wenn keine PiP-Treffer
│                                          │
│  [Button: "Zu Plan hinzufügen"]          │  ← variant="default" bg-[#4A7C59]
│  [Button: "Plan öffnen"]                 │  ← variant="outline"
└──────────────────────────────────────────┘
```

---

## Interaktions-Kontrakte

### Wochen-View Interaktionen

| Aktion | Element | Reaktion |
|--------|---------|----------|
| Tippen auf Pflanzename in KalenderWochenCard | Pressable Row | Navigate zu `/(app)/kalender/[slug]` |
| Tippen auf PflanzenKalenderZeile | Pressable Row | Navigate zu `/(app)/kalender/[slug]` |
| Tippen auf Filter-Chip "Nur meine Pflanzen" | Pressable Chip | Toggle: aktiv (bg-[#4A7C59]) ↔ inaktiv (outline) |
| Filter inaktiv + keine Pflanzen im Plan | — | Banner: "Keine Pflanzen im Plan. Füge Pflanzen im Plan-Editor hinzu." |
| klimazone == null | — | InlineBanner warning mit Action "Jetzt eingeben" → /(app)/profile/plz |

### Pflanzen-Detail Interaktionen

| Aktion | Element | Reaktion |
|--------|---------|----------|
| "Zu Plan hinzufügen" (CAL-04/05) | Button default | `nextFreeBedSlot()` + `writePlanElement()` → Toast/Banner "Tomate hinzugefügt" |
| "Plan öffnen" | Button outline | Navigate zu `/(app)/plan` |
| Zurück-Button | Stack-Header | Pop zurück zu Wochen-View |
| Beet-Name tippen in "Auf welchem Beet?" | Pressable Row | Navigate zu `/(app)/plan` (öffnet Editor, kein Deep-Link zu Beet-Selektion in Phase 10) |

### Loading States

| Zustand | Darstellung |
|---------|-------------|
| Pflanzen laden (usePlants cold-start) | `text-stone-500 "Lädt…"` zentriert im Screen — identisch zu bestehenden Screens |
| "Zu Plan hinzufügen" in Bearbeitung | Button disabled + opacity-50 — Button.tsx Konvention |
| Keine Pflanzen im Plan (Filter aktiv) | Empty State (siehe Copywriting) |
| Leere KalenderWochenCard (keine Aktionen diese Woche) | Leer-Zustand innerhalb Card (keine Pflicht zum Aktionshaben) |

### Touch-Target-Mindestmaße

Alle Pressable-Elemente: `min-h-[44px]` — app-weite Konvention (iOS HIG, seit Phase 2).
Ausnahme: PflanzenKalenderZeile gesamt ist pressable und überschreitet 44px durch Inhalt — kein explizites min-h nötig.

---

## Copywriting Contract

Alle Strings gehen in `packages/shared/src/i18n/de.json` unter dem Key `kalender.*`.

| Element | String-Key | Deutscher Text |
|---------|------------|----------------|
| Screen-Titel | `kalender.title` | Aussaatkalender |
| KW-Label (Wochen-View) | `kalender.kwLabel` | KW {kw} · {year} |
| "Diese Woche" Card-Header | `kalender.dieseWoche` | Diese Woche |
| Pflanzenliste Abschnitts-Titel | `kalender.jahresuebersicht` | Alle Pflanzen (Jahresübersicht) |
| Filter-Chip aktiv | `kalender.filterMeinePflanzen` | Nur meine Pflanzen |
| Detail-Screen Klimazone-Label | `kalender.klimazoneLabel` | Klimazone: {zone} ({name}) |
| Detail-Screen Abschnitt Beet | `kalender.aufWelchemBeet` | Auf welchem Beet? |
| CTA "Zu Plan hinzufügen" | `kalender.zuPlanHinzufuegen` | Zu Plan hinzufügen |
| CTA "Plan öffnen" | `kalender.planOeffnen` | Plan öffnen |
| Erfolgs-Meldung Hinzufügen | `kalender.hinzugefuegtBanner` | {name} wurde dem Plan hinzugefügt |
| Mindestabstand-Label | `kalender.detail.mindestabstand` | Mindestabstand: {cm} cm |
| Sonnenbedarf-Label | `kalender.detail.sonnenbedarf` | Sonnenbedarf: {value} |
| Familie-Label | `kalender.detail.familie` | Familie: {family} |
| "Noch nicht im Plan" | `kalender.nochNichtImPlan` | Noch nicht im Plan |
| Gantt-Legende Vorkultur | `kalender.legende.vorkultur` | Vorkultur |
| Gantt-Legende Direktsaat | `kalender.legende.direktsaat` | Direktsaat |
| Gantt-Legende Auspflanzen | `kalender.legende.auspflanzen` | Auspflanzen |
| Gantt-Legende Ernte | `kalender.legende.ernte` | Ernte |

### Primary CTA

**"Zu Plan hinzufügen"** (Button default, bg-[#4A7C59])

Erscheint in Pflanzen-Detail-View. Aufruf nur wenn `elements.some(e => e.elementType === 'Beet')`.
Wenn kein Beet im Plan: Button wird durch InlineBanner ersetzt:
"Noch kein Beet im Plan — lege zuerst ein Beet im Plan-Editor an."

### Empty States

| Situation | Heading | Body | Next Step |
|-----------|---------|------|-----------|
| Keine Aktionen diese KW (alle Pflanzen) | (KalenderWochenCard bleibt sichtbar, aber Aktionsliste zeigt Leer-Zustand) | "Diese Woche keine Aussaat- oder Ernteaktionen." | — |
| Filter "Nur meine Pflanzen" aktiv, 0 Pflanzen im Plan mit Slug | "Keine Pflanzen im Plan" | "Füge Pflanzen im Plan-Editor hinzu, um deinen persönlichen Kalender zu sehen." | Button outline "Plan öffnen" → `/(app)/plan` |
| Filter "Nur meine Pflanzen" aktiv, Pflanzen im Plan ohne plantSlug | "X Pflanzen ohne Kalender-Daten" | "Diese Pflanzen wurden vor Phase 9 angelegt und haben keine Kalender-Verknüpfung." | — (informativer Hinweis, kein CTA) |
| klimazone == null | — | InlineBanner warning: "PLZ noch nicht gesetzt — Klimazone unbekannt. Jetzt eingeben" | Action "Jetzt eingeben" → `/(app)/profile/plz` |
| Keine Beete im Plan (CAL-04 Guard) | — | InlineBanner warning in Detail-Screen: "Noch kein Beet im Plan — lege zuerst ein Beet im Plan-Editor an." | — (kein "Zu Plan hinzufügen" Button) |

### Error States

| Fehler | Darstellung | Lösungsweg |
|--------|-------------|------------|
| usePlants() Fehler | InlineBanner variant="error": "Pflanzen konnten nicht geladen werden. Bitte Verbindung prüfen und erneut versuchen." | Kein Retry-Button in Phase 10 — TanStack Query retries automatisch |
| "Zu Plan hinzufügen" fehlgeschlagen | InlineBanner variant="error": "Hinzufügen fehlgeschlagen. Versuche es erneut." | Button bleibt aktiv (kein Disabled-State nach Fehler) |
| klimazone ungültig (< 1 oder > 7) | Engine-seitiger Guard: fallback auf Zone 4. Kein UI-Error — transparente Korrektur. | — |

### Destruktive Aktionen

**Phase 10 hat keine destruktiven Aktionen.**

"Zu Plan hinzufügen" (CAL-05) fügt hinzu und ist via Undo rückgängig machbar (editorStore Undo-Stack). Kein Confirmation Dialog erforderlich.

---

## i18n-Konventionen

- Alle neuen Strings in `packages/shared/src/i18n/de.json` unter dem Key `"kalender": { ... }`
- Template-Variablen: `{kw}`, `{year}`, `{name}`, `{zone}`, `{cm}` (einfache geschweifte Klammern — bestehende de.json-Konvention aus `audit.*` und `garden.invite.*`)
- Monats-Kürzel (3 Buchstaben) für Gantt-Header: `"Jan", "Feb", "Mrz", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"`
- Aktionstyp-Labels für Badge: `"Vorkultur", "Direktsaat", "Auspflanzen", "Ernte"` (identisch mit AktionsTyp aus kalenderEngine.ts)

---

## Gantt-Rendering-Kontrakt

**Rendering-Ansatz:** `View`-Balken mit `position: absolute` + Prozent-Werten — kein SVG, kein Skia.
(Entscheidung aus RESEARCH.md Muster 3 + Anti-Muster)

**Track-Hintergrund:** `#E5E7EB` (Tailwind gray-200), `borderRadius: 4`, `height: 20px`

**Balken-Rendering:**
```
left  = ((startKw - 1) / TOTAL_KW) * 100  // in %
width = ((endKw - startKw + 1) / TOTAL_KW) * 100  // in %
```

**TOTAL_KW:** 52 (Standard). KW 53 wird auf KW 52 geclampt (`Math.min(kw, 52)`).
Begründung: Fallstrick 4 aus RESEARCH.md — simpler als optionalen 53. Slot rendern.

**Miniatur-Gantt** (PflanzenKalenderZeile in Wochen-View): Identisches Rendering, aber
`height: 8px` statt 20px. Keine Monats-Labels. Nur als visueller Scan-Indikator.

**Monats-Header unter Gantt (Detail-View):**
- 12 gleichmäßig verteilte Labels: `flex-row justify-between`
- Schrift: `text-xs text-stone-400` (12px, 400, 1.4)
- Kürzel: Jan / Feb / Mrz / Apr / Mai / Jun / Jul / Aug / Sep / Okt / Nov / Dez

**GanttLegende (Detail-View):**
- Layout: `flex-row flex-wrap gap-x-3 gap-y-1`
- Pro Eintrag: kleiner gefüllter Kreis (`width: 10, height: 10, borderRadius: 5`) + Label `text-xs`
- Reihenfolge: Vorkultur (violett) → Direktsaat (grün) → Auspflanzen (blau) → Ernte (orange)

---

## Filter-Chip-Kontrakt

| State | Darstellung |
|-------|-------------|
| Inaktiv | `border border-stone-300 dark:border-stone-700 bg-transparent rounded-full px-3 py-1 text-xs text-stone-700` |
| Aktiv | `bg-[#4A7C59] rounded-full px-3 py-1 text-xs text-white font-semibold` |

**Default-Zustand beim Öffnen des Screens:**
- Wenn ≥ 1 Pflanze im Plan mit `provenance.plantSlug`: Filter standardmäßig AKTIV
- Wenn 0 Pflanzen mit Slug: Filter standardmäßig INAKTIV (zeigt alle Pflanzen der DB)

**Begründung:** RESEARCH.md Offene Frage 3 — autonome Entscheidung per `<autonomous_mode>`.
"Nur meine Pflanzen" als Default macht den Kalender sofort relevant; Fallback auf alle
verhindert Empty-State für Neu-User ohne Plan.

---

## Accessibility-Kontrakt

| Element | Anforderung |
|---------|-------------|
| Alle Pressable-Elemente | `accessibilityRole="button"` (bestehende Konvention) |
| PflanzenKalenderZeile | `accessibilityLabel="Pflanzenname, Kalenderdetails öffnen"` |
| GanttStreifen | `accessibilityLabel="Gantt-Diagramm für Tomate: Vorkultur KW X bis Y, Ernte KW A bis B"` (screen-reader Text) |
| Filter-Chip | `accessibilityRole="checkbox"` + `accessibilityState={{ checked: isActive }}` |
| "Zu Plan hinzufügen" Button | `accessibilityRole="button"` + `accessibilityLabel="Tomate zu Plan hinzufügen"` |
| InlineBanner Schließen-Button | `accessibilityLabel="Hinweis schließen"` — aus bestehender InlineBanner.tsx |

---

## Navigation-Kontrakt

**Neuer Stack-Screen (kein neuer Tab):** Entscheidung aus RESEARCH.md "Stand der Technik".
Der Kalender wird als Stack-Route eingebunden:

```
/(app)/
├── index.tsx                 (Home Screen — bestehend)
├── plan/index.tsx            (Plan-Editor — bestehend)
├── kalender/
│   ├── index.tsx             (Wochen-View — NEU)
│   └── [slug].tsx            (Pflanzen-Detail — NEU)
└── ...
```

**Einstieg:** Home Screen erhält einen neuen Button "Zum Kalender" (variant="outline"):
```
[Button outline: "Zum Kalender"] → router.push('/(app)/kalender')
```
Platzierung im Home Screen: unterhalb der bestehenden "Plan öffnen" / "Aus Claude.ai importieren" Buttons.

**Stack-Header für kalender/index.tsx:**
```tsx
<Stack.Screen options={{ headerTitle: t('kalender.title') }} />
```

**Stack-Header für kalender/[slug].tsx:**
```tsx
<Stack.Screen options={{ headerTitle: pflanzeName }} />
```

---

## Registry Safety

| Registry | Blocks verwendet | Safety Gate |
|----------|------------------|-------------|
| shadcn official | keine neuen | nicht erforderlich |
| Drittanbieter | keine | nicht anwendbar |

**Keine neuen npm-Pakete** in Phase 10 (RESEARCH.md bestätigt: alle Abhängigkeiten vorhanden).
Registry-Vetting-Gate: nicht erforderlich.

---

## Entscheidungs-Log (Autonomous Mode)

| # | Frage (aus RESEARCH.md Offene Fragen) | Entscheidung | Begründung |
|---|--------------------------------------|--------------|------------|
| 1 | CAL-04/05 Platzierungsvorschlag — interaktives Drag oder einfacher Button? | Einfacher Button "Zu Plan hinzufügen" mit `nextFreeBedSlot()`-Auto-Koordinaten | Phase 10 MVP; interaktives Drag → Phase 12 (Task-Generator). Simpler Pfad ausreichend für User-Ziel. |
| 2 | Filter "Nur meine Pflanzen" — Default AN oder AUS? | Default AN wenn ≥1 Pflanze mit plantSlug im Plan, sonst AUS | Maximale Relevanz für aktive Nutzer; kein Empty-State für Neu-User. |
| 3 | Kalender als Home-Card oder eigener Tab? | Eigener Stack-Screen + Button auf Home-Screen | RESEARCH.md: bestehende App nutzt Stack-Navigator, kein Tab. Tab-Addition wäre Architektur-Änderung. |
| 4 | KW 53 im Gantt | Clampen auf KW 52 | Einfacher als optionalen Slot. Fallstrick 4 aus RESEARCH.md adressiert. |
| 5 | Monats-Kürzel Länge | 3-Buchstaben-Kürzel ("Mrz" statt "März") | Platzsparend auf kleinen Screens (iPhone SE); konsistent mit deutschen Kalender-Konventionen. |
| 6 | "Auf welchem Beet?" — Deep-Link zu Beet-Selektion? | Nein, nur "Plan öffnen" ohne Deep-Link | Deep-Link zu Beet-Selektion erfordert Editor-Infrastruktur die Phase 10 nicht liefert. |

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
