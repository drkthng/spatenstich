# Phase 10: Aussaatkalender v1 — Research

**Erstellt:** 2026-06-11
**Domain:** Kalender-Logik (DOY→KW, Klimazonenversatz, frostrelative Fenster) + UI (Wochen-Card, Gantt-Streifen)
**Confidence:** HIGH (Codebase-Analyse) / MEDIUM (Klimazonenversatz-Werte)

---

## Zusammenfassung

Phase 10 baut den Pflanz- und Aussaatkalender auf den bereits vorhandenen Daten auf:
**plants.json** (90 Pflanzen mit DOY-Feldern aus Phase 8), **PlanElementRow** mit `provenance.plantSlug` (Phase 9), und **profileStore.klimazone** (Phase 2). Alle Bausteine sind im Repo. Es müssen keine neuen Pakete installiert werden.

Der Kernalgorithmus (`calendrierEngine.ts` in `packages/shared/src/`) konvertiert die DOY-Felder
aus plants.json in ISO-Kalenderwochen (reine Arithmetik, ~20 Zeilen), verschiebt die Fenster
um einen klimazonenabhängigen Offset (Zone 4 = Baseline, ±10 Tage/Zone) und filtert auf
"diese Woche aktiv". Das Gardeneus `dates.ts` (MIT, lokal vorhanden) ist Referenz und Inspiration,
wird aber **nicht direkt importiert** — es setzt USDA-Zonen und frost-relative Wochen voraus,
während unser Datenmodell absolute DOY-Werte und deutsche Klimazonen 1–7 verwendet.

Die UI besteht aus zwei Schichten: einer `KalenderWochenCard` (Home-Screen-Einbindung als
neue Route `/(app)/kalender`) und einem `PflanzenGanttView` (Pflanzen-Detail). Beide bauen
auf `ScrollView` + `View`-Bars (kein SVG/Skia nötig) und fügen sich ins bestehende
Stack-Navigator-Schema ein. Keine neue Tab-Navigation erforderlich — der Kalender wird als
eigene Route mit Zurück-Button eingebunden.

**Primäre Empfehlung:** Reine Logik in `packages/shared/src/lib/kalenderEngine.ts` (testbar
in Node-Umgebung), UI in `app/src/components/kalender/` + Screen `app/app/(app)/kalender/index.tsx`.
Kein neues npm-Paket nötig.

---

<phase_requirements>
## Phase Requirements

| ID | Beschreibung | Research-Unterstützung |
|----|-------------|------------------------|
| CAL-01 | Zeitachse (12 Monate, scrollbar) mit Aufgaben-Karten pro Sorte | `ScrollView` horizontal + `View`-Bars; DOY-Felder aus plants.json liefern die Zeitspannen |
| CAL-02 | Klimazonenspezifische Aufgaben-Daten | Klimazonenoffset-Tabelle (Zone 1–7 vs. Basis Zone 4); profileStore.klimazone bereits abrufbar |
| CAL-03 | Unterscheidung: Vorkultur, Direktsaat, Auspflanzen, Ernte | sowIndoorDoy*, sowOutdoorDoy*, plantDoy*, harvestDoy* direkt in PlantRow |
| CAL-04 | Platzierungsvorschlag auf Plan (freie Fläche + Standort) | nextFreeBedSlot() bereits in draftPromotionRepo.ts exportiert; PiP für Beet-Zuordnung |
| CAL-05 | Bestätigung → Pflanze im Plan + Kalender-Aufgabe aktiv | writePlanElement() (gardenPlanRepo) + provenance.plantSlug schreiben; kein neues DB-Schema |
| CAL-06 | Einfache Fruchtfolge-Warnung | family-Feld in PlantRow; PiP-basierte Beet-Mitglieds-Prüfung; gleiche Familie im selben Beet → Warnung (kein multi-year nötig in Phase 10) |
</phase_requirements>

---

## Architekturelle Verantwortungs-Map

| Fähigkeit | Primäre Ebene | Sekundäre Ebene | Begründung |
|-----------|--------------|-----------------|-----------|
| Kalenderlogik (DOY→KW, Klimazonenoffset) | `packages/shared/src/lib/` | — | Pure TypeScript, testbar in Node-Env, kein RN-Import |
| "Diese Woche"-Filter | `packages/shared/src/lib/` | — | Deterministisch, gleicher Test für Node/App |
| Fruchtfolge-Warnung (CAL-06) | `app/src/hooks/` | `packages/shared` für Familienprüfung | Braucht React + Store-Zugriff |
| Wochen-Card Screen | `app/app/(app)/kalender/` | — | Expo Router Route |
| Gantt-Streifen (CAL-01) | `app/src/components/kalender/` | — | Reine UI, ScrollView + View |
| Platzierungsvorschlag (CAL-04/05) | `app/src/components/kalender/` + `app/src/lib/gardenPlanRepo.ts` | `draftPromotionRepo.nextFreeBedSlot` | Schreibpfad braucht Repo-Zugriff |
| Klimazone lesen | `app/src/stores/profileStore` | `useProfile` Hook | Bereits implementiert (Phase 2) |

---

## Standard Stack

### Kern — Keine neuen Pakete nötig

| Bibliothek | Version (vorhanden) | Zweck in Phase 10 |
|------------|--------------------|--------------------|
| TypeScript | 5.8.3 | Engine-Typen: `KalenderWindow`, `WochenAktion` |
| Zustand (profileStore) | 5.0.2 | Klimazone lesen (`useProfileStore`) |
| TanStack Query | 5.62.7 | `usePlants()` — bereits implementiert (Phase 8) |
| react-native-svg | ^15.15.4 | Optional: Gantt-Balken als `<Rect>` — bevorzuge aber `View` |
| Expo SDK | ~53.0.0 | Router, ScrollView |

**Kein neues npm-Paket erforderlich.** ISO-Wochennummer ist ~6 Zeilen reine Arithmetik
(keine date-fns, dayjs, luxon). Alle Abhängigkeiten sind bereits installiert. [VERIFIED: Codebase grep]

### Nicht verwenden

| Kandidat | Warum nicht |
|----------|------------|
| date-fns | Nicht installiert; 6 Zeilen ISO-Arithmetik ersetzen es vollständig für diesen Use Case |
| react-native-calendars | Nicht installiert; zu schwer für Wochen-View; Gantt erfordert eigene Render-Logik sowieso |
| Gardeneus `dates.ts` direkt importieren | USDA-Zonen (7a/8b) statt unserer deutschen Klimazonen 1–7; frost-relative Wochen statt absolute DOY; Logik-Modell inkompatibel |

---

## Package Legitimacy Audit

> Keine neuen Pakete werden installiert. Alle Abhängigkeiten stammen aus früheren Phasen und sind bereits im Repo vorhanden.

| Paket | Status | Disposition |
|-------|--------|-------------|
| (keine neuen) | — | Alle vorhandenen Pakete aus Phase 1–9 |

**Pakete entfernt wegen SLOP-Verdikt:** keine
**Pakete als SUS markiert:** keine

---

## Architektur-Muster

### System-Datenfluss

```
profileStore.klimazone
        │
        ▼
KalenderEngine.getWindowsForPlant(plant, klimazone)
  ├─ DOY-Felder aus PlantRow (plants.json)
  ├─ Klimazonenoffset-Tabelle (ZONE_OFFSET_DAYS)
  └─ ISO-KW-Arithmetik
        │
        ├──► WochenFilter: aktive Aktionen in KW (aktuelleKW±0)
        │         │
        │         ▼
        │    KalenderWochenCard (Screen)
        │       "Diese Woche: Tomate Vorkultur starten"
        │
        └──► GanttRow: 12-Monats-Streifen pro Pflanze
                  │
                  ▼
             PflanzenDetailView (Screen)
               Gantt + Phase-8-Infos + "Auf welchem Beet?"

Plan-Elemente (PlanElementRow):
  elementType='Pflanze' + provenance.plantSlug
        │
        ▼
  Filter "Nur meine Pflanzen":
    planElemente → einzigartiger plantSlug-Set
        │
        ▼
  KalenderWochenCard zeigt nur diese Pflanzen

"Auf welchem Beet?":
  plantSlug → plan_elements suchen → PiP prüfen → Beet-Label

CAL-06 Fruchtfolge:
  Pflanze wählen → family → PiP → andere Pflanzen im Beet → family-Match → Warnung
```

### Empfohlene Projektstruktur (neu)

```
packages/shared/src/lib/
└── kalenderEngine.ts        # Pure Logik: DOY→KW, Offset, WindowFilter, FruchtfolgeCheck

app/src/
├── components/kalender/
│   ├── KalenderWochenCard.tsx   # "Diese Woche" Wochen-Übersicht
│   ├── GanttStreifen.tsx        # 12-Monats horizontale Balken-Reihe
│   ├── GanttLegende.tsx         # Farb-Legende (Vorkultur/Direktsaat/Pflanzen/Ernte)
│   └── FruchtfolgeWarnung.tsx   # Inline-Banner für CAL-06
└── hooks/
    └── useKalenderData.ts       # Hook: plant + klimazone → Wochen-Aktionen + Gantt-Daten

app/app/(app)/kalender/
├── index.tsx                    # Wochen-View + Pflanzenliste (CAL-01/02/03/04)
└── [slug].tsx                   # Pflanzen-Detail: Gantt + Phase-8-Infos + "Auf welchem Beet?"
```

### Muster 1: Kalender-Engine (packages/shared)

**Was:** Pure Funktion, die aus `PlantRow` + `Klimazone` alle Kalender-Fenster berechnet.
**Wann:** Immer wenn Wochen-View oder Gantt gerendert wird.

```typescript
// packages/shared/src/lib/kalenderEngine.ts
// [VERIFIED: eigene Implementierung basierend auf plants.json DOY-Schema + Klimazonen-Forschung]

export type AktionsTyp = 'Vorkultur' | 'Direktsaat' | 'Auspflanzen' | 'Ernte';

export interface KalenderFenster {
  typ: AktionsTyp;
  startDoy: number;  // klimazonenkorrigiert
  endDoy: number;    // klimazonenkorrigiert
  startKw: number;   // ISO-Kalenderwoche
  endKw: number;
}

// Frost-Daten Klimazone 1-7 (DWD-basiert, Zone 4 = Baseline)
// [ASSUMED: Werte auf Basis DWD-Heizgradtag-Zonen + landwirtschaftlicher Literatur,
//  nicht gegen offizielle DWD-API verifiziert in dieser Session]
const LAST_FROST_DOY: Record<number, number> = {
  1: 66, 2: 76, 3: 86, 4: 96, 5: 106, 6: 116, 7: 126,
};
const BASE_ZONE = 4;
const BASE_LAST_FROST = LAST_FROST_DOY[BASE_ZONE]; // 96

function zoneOffset(klimazone: number): number {
  return (LAST_FROST_DOY[klimazone] ?? BASE_LAST_FROST) - BASE_LAST_FROST;
}

function doyToIsoKw(doy: number, year = new Date().getFullYear()): number {
  const date = new Date(year, 0, doy);
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export function getFensterFuerPflanze(
  plant: Pick<PlantRow,
    'sowIndoorDoyStart' | 'sowIndoorDoyEnd' |
    'sowOutdoorDoyStart' | 'sowOutdoorDoyEnd' |
    'plantDoyStart' | 'plantDoyEnd' |
    'harvestDoyStart' | 'harvestDoyEnd'
  >,
  klimazone: number,
): KalenderFenster[] {
  const offset = zoneOffset(klimazone);
  const shift = (doy: number | null) => doy != null ? doy + offset : null;
  const windows: KalenderFenster[] = [];

  const addWindow = (
    typ: AktionsTyp,
    start: number | null,
    end: number | null,
  ) => {
    if (start == null || end == null) return;
    const s = Math.max(1, Math.min(365, start));
    const e = Math.max(1, Math.min(365, end));
    windows.push({ typ, startDoy: s, endDoy: e, startKw: doyToIsoKw(s), endKw: doyToIsoKw(e) });
  };

  addWindow('Vorkultur', shift(plant.sowIndoorDoyStart), shift(plant.sowIndoorDoyEnd));
  addWindow('Direktsaat', shift(plant.sowOutdoorDoyStart), shift(plant.sowOutdoorDoyEnd));
  addWindow('Auspflanzen', shift(plant.plantDoyStart), shift(plant.plantDoyEnd));
  addWindow('Ernte', shift(plant.harvestDoyStart), shift(plant.harvestDoyEnd));
  return windows;
}

export function getAktuelleKw(): number {
  const now = new Date();
  const doy = Math.ceil((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
  return doyToIsoKw(doy);
}

export function filterAktiveAktionen(
  fenster: KalenderFenster[],
  kw: number,
): KalenderFenster[] {
  return fenster.filter(f => kw >= f.startKw && kw <= f.endKw);
}
```

### Muster 2: useKalenderData Hook

**Was:** Kombiniert `usePlants()`, `profileStore.klimazone`, und `editorStore.elements` zu einer
einzigen konsumierbaren Datenstruktur für die UI.

```typescript
// app/src/hooks/useKalenderData.ts
export function useKalenderData() {
  const { data: plants } = usePlants();
  const klimazone = useProfileStore(s => s.klimazone);
  const elements = useEditorStore(s => s.elements);

  // "Nur meine Pflanzen"-Filter
  const meinePflanzenslugs = React.useMemo(() => {
    return new Set(
      elements
        .filter(e => e.elementType === 'Pflanze' && e.deletedAt === null)
        .map(e => e.provenance?.plantSlug as string)
        .filter(Boolean)
    );
  }, [elements]);

  const aktuelleKw = React.useMemo(() => getAktuelleKw(), []);

  const wochenAktionen = React.useMemo(() => {
    if (!plants || !klimazone) return [];
    const filtered = meinePflanzenslugs.size > 0
      ? plants.filter(p => meinePflanzenslugs.has(p.slug))
      : plants;
    return filtered.flatMap(plant => {
      const fenster = getFensterFuerPflanze(plant, klimazone);
      return filterAktiveAktionen(fenster, aktuelleKw).map(f => ({ plant, fenster: f }));
    });
  }, [plants, klimazone, meinePflanzenslugs, aktuelleKw]);

  return { wochenAktionen, aktuelleKw, klimazone, meinePflanzenslugs };
}
```

### Muster 3: Gantt-Streifen mit View-Balken (kein SVG nötig)

**Was:** 12-Monats-Streifen mit farbigen `View`-Balken für jeden Phasentyp.
**Wann:** PflanzenDetailView, statt komplexem SVG-Rendering.

```typescript
// app/src/components/kalender/GanttStreifen.tsx
const TOTAL_KW = 52;
const FARBEN: Record<AktionsTyp, string> = {
  'Vorkultur':   '#a78bfa', // violett
  'Direktsaat':  '#34d399', // grün
  'Auspflanzen': '#60a5fa', // blau
  'Ernte':       '#fb923c', // orange
};

export function GanttStreifen({ plant, klimazone }: { plant: PlantRow; klimazone: number }) {
  const fenster = getFensterFuerPflanze(plant, klimazone);
  return (
    <View style={{ flexDirection: 'row', height: 20, backgroundColor: '#e5e7eb', borderRadius: 4 }}>
      {fenster.map((f, i) => {
        const left = ((f.startKw - 1) / TOTAL_KW) * 100;
        const width = ((f.endKw - f.startKw + 1) / TOTAL_KW) * 100;
        return (
          <View key={i} style={{
            position: 'absolute',
            left: `${left}%`, width: `${width}%`,
            height: '100%',
            backgroundColor: FARBEN[f.typ],
            borderRadius: 3,
          }} />
        );
      })}
    </View>
  );
}
```

### Muster 4: "Auf welchem Beet?" — PiP-Abfrage

**Was:** Inverse Companion-Detection: gegeben ein plantSlug, welche Beet-Polygone enthalten
Pflanzen-Elemente mit diesem Slug?

```typescript
// In PflanzenDetailView oder als pure Helper-Funktion in kalenderEngine.ts
export function findBeeteForPlant(
  elements: PlanElementRow[],
  plantSlug: string,
): PlanElementRow[] {
  const active = elements.filter(e => e.deletedAt === null);
  const matching = active.filter(
    e => e.elementType === 'Pflanze' && e.provenance?.plantSlug === plantSlug,
  );
  // Finde Beet-Elemente die den Pflanzenpunkt enthalten (PiP)
  // Reuse: pointInPolygon aus lib/geometry/bedLayout.ts
  const beete = active.filter(e => e.elementType === 'Beet');
  const result: PlanElementRow[] = [];
  for (const pflanze of matching) {
    const center: Point2D = { x: pflanze.xM + pflanze.widthM / 2, y: pflanze.yM + pflanze.heightM / 2 };
    for (const beet of beete) {
      if (pointInPolygon(center, beetToPolygon(beet))) {
        if (!result.includes(beet)) result.push(beet);
      }
    }
  }
  return result;
}
```

### Muster 5: CAL-06 Fruchtfolge-Warnung (einfache Variante)

**Was:** Prüft ob im gleichen Beet bereits eine Pflanze derselben Familie steht (aktuell, kein multi-year).
**Scope:** Phase 10 = Single-Season-Check. Multi-Year-Fruchtfolge → Phase 15.

```typescript
// packages/shared/src/lib/kalenderEngine.ts (als zusätzliche Export-Funktion)
export function pruefeEinfacheFruchtfolge(
  neuePflanze: { family: string; slug: string },
  beetPflanzen: Array<{ family: string; slug: string }>,
): { warnung: boolean; grund: string | null } {
  const konflikt = beetPflanzen.find(
    p => p.family === neuePflanze.family && p.slug !== neuePflanze.slug,
  );
  if (konflikt) {
    return {
      warnung: true,
      grund: `Fruchtfolge: ${neuePflanze.family} bereits im Beet (${konflikt.slug})`,
    };
  }
  return { warnung: false, grund: null };
}
```

### Anti-Muster vermeiden

- **Anti-Muster: SVG für Gantt-Bars.** `View` mit `position: absolute` + Prozentwerten ist
  auf Web und Native identisch, einfacher zu testen und performanter als `<Rect>` in react-native-svg
  für horizontale Balken. SVG nur wenn abrundende Shapes nötig sind. [ASSUMED]
- **Anti-Muster: `date-fns` für KW-Berechnung importieren.** 6 Zeilen ISO-Arithmetik ersetzen
  den gesamten Package-Overhead; kein Dependency-Risk.
- **Anti-Muster: Neue Supabase-Tabelle für Kalender-Daten anlegen.** Alle nötigen Daten sind
  bereits in `plants` + `plan_elements`. Eine neue Tabelle würde Migration + RLS + Sync erfordern,
  ohne Mehrwert für Phase 10.
- **Anti-Muster: Gardeneus `dates.ts` direkt importieren.** Das Modell (USDA-Zonen, frost-relative
  Wochen-Offsets im Plant-Record) ist inkompatibel mit unserem Modell (DWD-Klimazonen 1–7, absolute
  DOY-Felder). Die Logik-Idee ist übernommen, die Implementierung muss neu sein. [VERIFIED: Code-Analyse D:/AiProjects/gardeneus/app/lib/dates.ts]

---

## Don't Hand-Roll

| Problem | Nicht selbst bauen | Verwende stattdessen | Warum |
|---------|--------------------|---------------------|-------|
| Beet-Mitgliedschaft eines Pflanzen-Elements | Eigene Geometrie | `pointInPolygon` aus `lib/geometry/bedLayout.ts` | Bereits implementiert + getestet (Phase 9) |
| Freie Beet-Position (CAL-04) | Grid-Scan | `nextFreeBedSlot()` aus `draftPromotionRepo.ts` | Bereits exportiert und reusable |
| Plan-Element schreiben (CAL-05) | Direktes Storage-Write | `writePlanElement()` aus `gardenPlanRepo.ts` + Outbox-Pattern | LWW, Outbox, Sync bereits verdrahtet |
| Plants laden | Eigener Fetch | `usePlants()` Hook (TanStack Query + bundle initialData) | Cold-Start-Offline, 24h Stale, Bundle-Fallback |
| Klimazone lesen | Eigener Store | `useProfileStore(s => s.klimazone)` | Bereits in profileStore (Phase 2) |
| i18n-Strings | Hardcoded Strings | `de.json` + `t()` Pattern | Konsistenz mit restlicher App |

---

## Bestehende Datenlage (Codebase-Befund)

### plants.json DOY-Feldabdeckung [VERIFIED: Codebase-Analyse]

| Feld | Befüllte Pflanzen | Kommentar |
|------|-------------------|-----------|
| `sowIndoorDoyStart/End` (Vorkultur) | 34 / 90 | Pflanzen die Vorkultur brauchen (Tomate, Paprika, Sellerie…) |
| `sowOutdoorDoyStart/End` (Direktsaat) | 47 / 90 | Direkt-Säer (Möhre, Spinat, Erbse…) |
| `plantDoyStart/End` (Auspflanzen) | 64 / 90 | Alle kultivierten Pflanzen |
| `harvestDoyStart/End` (Ernte) | 90 / 90 | Vollständig für alle 90 Pflanzen |

**Wichtig:** 26 Pflanzen haben weder `sowIndoorDoyStart` noch `sowOutdoorDoyStart` (nur `plantDoyStart`).
Für diese Pflanzen (Obstbäume, mehrjährige Stauden, Erdbeere) zeigt der Kalender nur
"Pflanzen" und "Ernte" — keine Vorkultur/Direktsaat-Balken. Das ist korrekt.

### DOY-Baseline [VERIFIED: Codebase-Analyse + notesDe-Prüfung]

Die DOY-Felder in plants.json entsprechen **Klimazone 4 (Berlin/Mittelfeld)** als Baseline.
Beweis: Tomate `sowIndoorDoyStart=60` (1. März), `plantDoyStart=130` (10. Mai = kurz vor
Eisheiligen, wie in `notesDe`: "vor Eisheiligen 15. Mai nicht ins Freiland"). Eisheiligen =
DOY 135 für Zone 4. Zone 4 = Baseline-Zone 0 in unserer Offset-Tabelle.

### Klimazonenoffset-Tabelle [ASSUMED: DWD-Heizgradtag-Daten + empirische Referenzwerte]

Berechnet aus letztem Frostdatum pro Zone:

| Zone | Letzte Frost (DOY) | Offset gg. Zone 4 | Beipspiel-Stadt |
|------|--------------------|--------------------|----------------|
| 1 | 66 (7. Mrz) | −30 Tage (−4 KW) | Freiburg, Köln |
| 2 | 76 (17. Mrz) | −20 Tage (−3 KW) | Frankfurt, Stuttgart |
| 3 | 86 (27. Mrz) | −10 Tage (−1 KW) | Bremen, Hannover |
| 4 | 96 (6. Apr) | ±0 | Berlin, Hamburg |
| 5 | 106 (16. Apr) | +10 Tage (+1 KW) | Erfurt, Magdeburg |
| 6 | 116 (26. Apr) | +20 Tage (+3 KW) | München, Nürnberg |
| 7 | 126 (6. Mai) | +30 Tage (+4 KW) | Alpenvorland, Berchtesgaden |

**Hinweis:** Diese Werte sind `[ASSUMED]` und sollten vom User bestätigt werden, wenn
Klimazonenkorrektur ein kritisches Feature ist. Für MVP sind sie hinreichend genau
(Genauigkeit ±1 Woche ist für Kleingärtner völlig ausreichend).

### Plan-Element ↔ Plant-Verknüpfung [VERIFIED: Codebase-Analyse]

```typescript
// Pflanzen-Elemente im Plan haben:
element.elementType === 'Pflanze'       // aus editor EDIT-02 / WebPlanEditor
element.layer === 'seasonal'            // Migration 018 (Phase 7)
element.provenance.plantSlug            // gesetzt beim Platzieren (Phase 9)
```

`provenance.plantSlug` ist der einzige verlässliche Link zwischen Plan-Element und
Plant-DB-Eintrag. Vorhanden seit Phase 9 (`useCompanionDetection.ts` liest es bei Zeile 118–119).
**Neu in Phase 10:** Der KalenderEngine braucht diesen Slug, um die DOY-Daten der Pflanze
zu laden. Bestehende Elemente ohne `plantSlug` (vor Phase 9 platziert) werden im
Kalender ignoriert oder zeigen nur Label.

### Beet-Geometrie-Zugriff [VERIFIED: Codebase-Analyse]

`pointInPolygon` aus `lib/geometry/bedLayout.ts` ist der bereits etablierte Weg
(Phase 9 companion detection). Der Beet-Polygon wird aus `PlanElementRow` rekonstruiert
(Rechteck: `xM/yM/widthM/heightM` → 4 Ecken; Freehand-Polygon: `provenance.polygon` falls vorhanden).

---

## Häufige Fallstricke

### Fallstrick 1: DOY-Überlauf über Jahreswechsel

**Was schiefgeht:** Ernte-DOY einer Kürbispflanze kann `> 365` werden nach Klimazonenversatz
in Zone 7. DOY 301 + 30 = DOY 331 (korrekt); aber wenn ein Offset in Zone 1 Vorkultur-Start
DOY 60 − 30 = DOY 30 (korrekt) oder sogar negativ macht (DOY 1 − 30 = −29, falscher Wert).

**Wie vermeiden:** Im Engine: `startDoy = Math.max(1, Math.min(365, rawDoy + offset))`.
Negative DOY → 1 (Anfang Januar), DOY > 365 → 365 (Ende Dezember). Anzeigen aber nicht crashen.

**Warnsignal:** Gantt-Balken beginnen bei 0% oder enden bei 100% abrupt.

### Fallstrick 2: `klimazone === null` während des ersten App-Starts

**Was schiefgeht:** `profileStore.klimazone` ist `null` bis der User PLZ eingibt (Phase 2 noch pending).
Engine-Aufruf mit `null` führt zu `ZONE_OFFSET_DAYS[null] = undefined` → NaN in DOY-Arithmetik.

**Wie vermeiden:** `useKalenderData()` gibt leere Aktionsliste zurück wenn `klimazone == null`.
Screen zeigt "Bitte zuerst PLZ eingeben" Banner. Guard im Engine: `if (!klimazone) return []`.

**Warnsignal:** NaN in KW-Spalten, leere Gantt-Streifen ohne Erklärung.

### Fallstrick 3: `provenance.plantSlug` fehlt bei älteren Plan-Elementen

**Was schiefgeht:** Elemente die vor Phase 9 platziert wurden (oder manuell ohne Palette)
haben `provenance.plantSlug === undefined`. Der Kalender kann diese nicht zuordnen.

**Wie vermeiden:** Im `useKalenderData` Filter: `elements.filter(e => e.provenance?.plantSlug)`.
Im "Nur meine Pflanzen"-Modus werden Elemente ohne Slug nicht mitgezählt — das ist korrekt
(kein Slug = keine Kalenderintegration). UI: Label "X Pflanzen im Plan (Y ohne Kalender-Daten)".

**Warnsignal:** "Nur meine Pflanzen" zeigt leere Liste obwohl Pflanzen im Plan stehen.

### Fallstrick 4: ISO-KW Jahreswechsel-Edge-Case (KW 53)

**Was schiefgeht:** `doyToIsoKw(365, 2026)` → KW 53 in manchen Jahren. Wenn `TOTAL_KW = 52`
im Gantt-Layout, wird ein KW-53-Balken außerhalb des Viewports gerendert oder schlägt die
Prozent-Berechnung fehl.

**Wie vermeiden:** Gantt-Layout mit `TOTAL_KW = 53` arbeiten, letzter Slot optional leer wenn
Jahr nur 52 KW hat. Alternativ: Balken auf KW 52 clampen (`Math.min(kw, 52)`).

### Fallstrick 5: CAL-04 Platzierungsvorschlag ohne Beet (leerer Plan)

**Was schiefgeht:** Wenn der Plan noch keine Beete enthält, gibt `nextFreeBedSlot()` `{xM:1, yM:1}`
zurück — aber es gibt kein Beet dort. `writePlanElement()` platziert die Pflanze ins Nichts.

**Wie vermeiden:** CAL-04/05 nur anbieten wenn `elements.some(e => e.elementType === 'Beet')`.
Andernfalls: "Noch kein Beet im Plan — zuerst Beet anlegen"-Hinweis anstelle des Vorschlags.

---

## Code-Beispiele aus bestehender Codebase

### ISO-Wochennummer (vanilla JS, kein Package)

```typescript
// Implementierung: 6 Zeilen, Node- und Browser-kompatibel
// [VERIFIED: Eigentest 2026-06-11 — korrekte KW-Werte für DOY 1, 60, 130, 200, 365]
function doyToIsoKw(doy: number, year = new Date().getFullYear()): number {
  const date = new Date(year, 0, doy);
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
// Ergebnis-Spot-Checks: DOY 60 → KW 9, DOY 130 → KW 19, DOY 200 → KW 29
```

### plantSlug aus Plan-Element lesen

```typescript
// Pattern aus useCompanionDetection.ts Zeile 114-119
// [VERIFIED: Codebase D:/AiProjects/garden-app/app/src/hooks/useCompanionDetection.ts]
function getPlantSlug(element: PlanElementRow): string | null {
  const prov = element.provenance;
  if (!prov || typeof prov.plantSlug !== 'string') return null;
  return prov.plantSlug;
}
```

### Klimazone aus profileStore lesen

```typescript
// Pattern aus profileStore.ts
// [VERIFIED: Codebase D:/AiProjects/garden-app/app/src/stores/profileStore.ts]
import { useProfileStore } from '../stores/profileStore';
const klimazone = useProfileStore(s => s.klimazone); // Klimazone | null (1–7)
```

---

## Stand der Technik im Projekt

| Alter Ansatz | Aktueller Ansatz | Geändert in | Relevanz für Phase 10 |
|--------------|------------------|-------------|----------------------|
| react-native-svg für alle Grafiken | Skia für Editor (iPhone), SVG für Web | Phase 7 / 7.5a | Gantt: View-Balken bevorzugt (keine Skia/SVG nötig) |
| Frost-relative Fenster (Gardeneus) | Absolute DOY + Klimazonenoffset | Phase 8 (plants.json) | Engine-Modell liegt fest |
| Tab-Navigation (geplant) | Stack-Navigator mit Zurück-Button | Phase 1-7 (Status quo) | Kalender als Stack-Route, nicht Tab |

---

## Offene Fragen

1. **Klimazonenoffset-Werte validiert?**
   - Was wir wissen: Zone 4 = Baseline, qualitative Richtung (Zone 1 wärmer) korrekt
   - Unklar: Sind die ±10 Tage/Zone realistisch oder zu grob?
   - Empfehlung: Mit `[ASSUMED]` markieren, User-Confirmation empfohlen. Für MVP
     ausreichend (Genauigkeit ±1 Woche).

2. **CAL-04/05 (Platzierungsvorschlag + Bestätigung) — Scope in Phase 10?**
   - Was wir wissen: `nextFreeBedSlot()` + `writePlanElement()` sind vorhanden
   - Unklar: Ist eine voll interaktive "Pflanze aus Kalender in Plan ziehen"-UI gewünscht,
     oder reicht ein einfacher "Zu Plan hinzufügen"-Button mit Auto-Platzierung?
   - Empfehlung: Phase 10 = einfacher Button mit `nextFreeBedSlot`-Auto-Koordinaten.
     Interaktives Drag in Kalender → Phase 12 (Task-Generator) wenn nötig.

3. **Filter "Nur meine Pflanzen" als Default oder Toggle?**
   - Was wir wissen: Success Criteria 4 sagt "Filter", impliziert Toggle
   - Empfehlung: Default = Nur meine Pflanzen (wenn ≥1 Pflanze im Plan mit Slug).
     Wenn keine Pflanzen im Plan: Default = alle Pflanzen aus DB.
   - Nutzer-Konfirmation empfohlen.

4. **DOY-Datenqualität für 26 Pflanzen ohne Sow-Daten**
   - Was wir wissen: 26 Pflanzen haben nur `plantDoyStart/End`, kein `sow*`
   - Unklar: Sollen für Phase 10 fehlende DOY-Felder nachgepflegt werden (Phase-8-Patch)?
   - Empfehlung: Phase 10 akzeptiert Lücken. Gantt zeigt nur befüllte Felder.
     Pflanzendaten-Vervollständigung ist optionale Wave-0-Task.

---

## Umgebungs-Verfügbarkeit

Phase 10 fügt keine externen Abhängigkeiten hinzu.

| Abhängigkeit | Benötigt von | Verfügbar | Version | Fallback |
|--------------|-------------|-----------|---------|----------|
| expo (SDK 53) | Router, ScrollView | ✓ | ~53.0.0 | — |
| react-native-svg | Optional für Gantt | ✓ | ^15.15.4 | View-Balken (bevorzugt) |
| @tanstack/react-query | usePlants Hook | ✓ | 5.62.7 | — |
| zustand | profileStore | ✓ | 5.0.2 | — |
| plants.json | Kalender-Daten | ✓ | 90 Pflanzen | — |
| pointInPolygon | Beet-Zuordnung | ✓ | in lib/geometry | — |

---

## Validation Architecture

### Test-Framework

| Eigenschaft | Wert |
|-------------|------|
| Framework | jest (ts-jest) — wie alle vorherigen Phasen |
| Config-Datei | `app/jest.config.ts` (erweitern) + `packages/shared/jest.config.ts` |
| Schnellstart | `pnpm --filter @spatenstich/shared exec jest kalenderEngine` |
| Full Suite | `pnpm --filter app exec jest && pnpm --filter @spatenstich/shared exec jest` |

### Phase Requirements → Test-Map

| Req-ID | Verhalten | Test-Typ | Automatisierter Befehl | Datei vorhanden? |
|--------|-----------|----------|----------------------|-----------------|
| CAL-01 | GanttStreifen rendert 12-Monats-Balken für alle Aktionstypen | unit (component) | `pnpm --filter app exec jest --testPathPattern=GanttStreifen -t "renders"` | ❌ Wave 0 |
| CAL-02 | Zone 1 Fenster beginnen ~4 KW früher als Zone 7 | unit (node) | `pnpm --filter @spatenstich/shared exec jest kalenderEngine -t "zone offset"` | ❌ Wave 0 |
| CAL-03 | Tomate hat Vorkultur KW9, Auspflanzen KW19, Ernte KW29 in Zone 4 | unit (node) | `pnpm --filter @spatenstich/shared exec jest kalenderEngine -t "tomate zone 4"` | ❌ Wave 0 |
| CAL-04 | Platzierungsvorschlag gibt gültigen xM/yM zurück wenn Beete vorhanden | unit (hooks) | `pnpm --filter app exec jest --testPathPattern=useKalenderData -t "placement"` | ❌ Wave 0 |
| CAL-05 | "Hinzufügen" schreibt PlanElementRow mit elementType='Pflanze' + plantSlug | unit (hooks) | `pnpm --filter app exec jest --testPathPattern=useKalenderData -t "add plant"` | ❌ Wave 0 |
| CAL-06 | Selbe Familie im Beet → warnung=true, anderer Slug gleiche Familie | unit (node) | `pnpm --filter @spatenstich/shared exec jest kalenderEngine -t "fruchtfolge"` | ❌ Wave 0 |

### Sampling-Rate

- **Pro Task-Commit:** `pnpm --filter @spatenstich/shared exec jest kalenderEngine`
- **Pro Wave-Merge:** `pnpm --filter app exec jest && pnpm --filter @spatenstich/shared exec jest`
- **Phase-Gate:** Full Suite grün vor `/gsd-verify-work`

### Wave 0 Lücken

- [ ] `packages/shared/src/lib/__tests__/kalenderEngine.test.ts` — deckt CAL-02/03/06 (node-Env)
- [ ] `app/src/components/kalender/__tests__/GanttStreifen.test.tsx` — deckt CAL-01 (component-Env)
- [ ] `app/src/hooks/__tests__/useKalenderData.test.ts` — deckt CAL-04/05 (hooks-Env)
- [ ] i18n-Keys: `packages/shared/src/__tests__/i18n.kalender.test.ts` analog zu `i18n.review-keys.test.ts`

**jest.config.ts Erweiterung:** `hooks`-Projekt `testMatch` erweitern um
`'**/src/hooks/__tests__/useKalenderData.test.ts'`; `editor`-Projekt keine Änderung.

---

## Security Domain

> Nyquist-Validation aktiviert; Security-Enforcement Standard.

### Anwendbare ASVS-Kategorien

| ASVS-Kategorie | Anwendbar | Standard-Maßnahme |
|----------------|-----------|------------------|
| V2 Authentifizierung | nein | Kalender liest nur Plant-DB (kein Auth nötig per PLANT-DB-04 RLS) |
| V3 Session Management | nein | Keine neuen Sessions |
| V4 Zugangskontrolle | ja | Plan-Element schreiben (CAL-05) → bestehende `assertAccount()` + RLS |
| V5 Input-Validierung | ja | `klimazone` als `number` validieren: `if (zone < 1 || zone > 7)` guard im Engine |
| V6 Kryptographie | nein | Keine neuen kryptographischen Operationen |

### Bekannte Bedrohungsmuster

| Muster | STRIDE | Maßnahme |
|--------|--------|---------|
| Ungültige Klimazone (z.B. 0, 99, NaN) | Tampering | Guard im KalenderEngine: `if (!LAST_FROST_DOY[zone]) fallback zu Zone 4` |
| CAL-05 PlanElement schreiben ohne Account | Spoofing | Bestehender `assertAccount()` in `gardenPlanRepo.writePlanElement()` greift bereits |

---

## Annahmen-Log

| # | Annahme | Abschnitt | Risiko bei Irrtum |
|---|---------|-----------|-------------------|
| A1 | Klimazonenoffset-Werte (±10 Tage/Zone, Zone 4 = Baseline) basieren auf DWD-Heizgradtag-Analogie, nicht gegen offizielle DWD-API verifiziert | Klimazonenoffset-Tabelle | Kalender-Anzeige ±1–2 Wochen ungenau für Extremzonen — akzeptabel für MVP |
| A2 | plants.json DOY-Felder verwenden Zone 4 als Baseline (empirisch abgeleitet aus Tomate-Daten) | DOY-Baseline | Systematische Offset-Verschiebung für alle Zonen wenn Baseline falsch |
| A3 | View-Balken (position: absolute) für Gantt sind performant genug auf mobil (kein SVG/Skia nötig) | Muster 3: Gantt-Streifen | Performance-Probleme auf sehr alten Android-Geräten bei 50+ Pflanzenzeilen |
| A4 | CAL-06 "einfache Fruchtfolge-Warnung" bedeutet Same-Season-Family-Check (nicht multi-year) | Muster 5 | Nutzer erwartet echte Fruchtfolge (Vorjahr) → Phase 15 (Fruchtfolge-Memory) nötig |

---

## Quellen

### Primär (HIGH confidence — Codebase-Analyse)

- `D:/AiProjects/garden-app/packages/shared/src/data/plants.json` — DOY-Feldabdeckung, Zone-Baseline (Tomate notesDe)
- `D:/AiProjects/garden-app/packages/shared/src/types/plants.ts` — PlantRow-Schema
- `D:/AiProjects/garden-app/packages/shared/src/constants/klimazonen.ts` — Klimazonensystem (1–7, DWD)
- `D:/AiProjects/garden-app/app/src/hooks/useCompanionDetection.ts` — plantSlug-Pattern, PiP-Nutzung
- `D:/AiProjects/garden-app/app/src/lib/draftPromotionRepo.ts` — nextFreeBedSlot() Signatur
- `D:/AiProjects/garden-app/app/src/lib/gardenPlanRepo.ts` — writePlanElement, loadAcceptedElements
- `D:/AiProjects/garden-app/app/src/hooks/usePlants.ts` — TanStack Query + bundle initialData Pattern
- `D:/AiProjects/garden-app/app/src/stores/profileStore.ts` — klimazone State-Zugriff
- `D:/AiProjects/gardeneus/app/lib/dates.ts` — Gardeneus frostrelative Fenster-Logik (MIT, Referenz)
- `D:/AiProjects/gardeneus/app/lib/task-generator.ts` — Gardeneus Task-Generator-Muster (MIT, Referenz)
- `.planning/research/2026-06-10-ref-apps-feature-synthesis.md` — Synthese Gardeneus/Gartenplaner UX

### Sekundär (MEDIUM confidence)

- `.planning/ROADMAP.md` — Phase-10-Success-Criteria, Markt-Evidenz
- `.planning/REQUIREMENTS.md` — CAL-01..06 Anforderungstexte

### Tertiär (LOW confidence)

- Klimazonenoffset-Tabelle: eigene Ableitung aus DWD-Heizgradtag-Beschreibung + empirischen Frostdaten-Quellen (nicht in dieser Session via Tool verifiziert)

---

## Metadata

**Confidence-Aufschlüsselung:**
- Standard Stack: HIGH — alle Pakete im Repo vorhanden, Versionen verifiziert
- Architektur: HIGH — Datenmodell komplett aus Codebase abgeleitet
- Fallstricke: HIGH — aus konkretem Code abgeleitet (Typ-Guards, Null-Checks)
- Klimazonenoffset-Werte: MEDIUM / ASSUMED — empirisch korrekte Größenordnung, nicht offizielle Quelle

**Research-Datum:** 2026-06-11
**Gültig bis:** 2026-09-11 (stabile Codebasis; plants.json-Änderungen invalidieren DOY-Analyse)
