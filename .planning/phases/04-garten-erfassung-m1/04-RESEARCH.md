# Phase 4: Garten-Erfassung (M1) - Research

**Researched:** 2026-05-03
**Domain:** Guided photo capture, client-side image resize, Claude Vision analysis, element confirmation UI, schematic 2D plan rendering
**Confidence:** HIGH (codebase verified) / MEDIUM (Claude Vision prompt output schema)

---

## Summary

Phase 4 baut auf einer vollstaendig vorhandenen Infrastruktur auf: Photo-Queue, EXIF-Strip, Storage-Upload und RPC `enqueue_photo_analysis` existieren bereits (Phase 3). Der kritische neue Teil ist (a) der Capture-UI-Layer davor, (b) der Austausch des Mock-Blocks in `ai-job-consumer/index.ts` durch echte Claude Vision API Calls, und (c) die neue Ergebnis-Strecke: Polling → Bestaetigungsscreen → Plan-Rendering.

Das Herzstuck ist der Claude Vision Prompt: Er muss strukturiertes JSON zurueckgeben, das Element-Typ, Position (in Gartenmetern relativ zur Grundform), geschaetzte Groesse, und Konfidenz enthaelt. Die Konfidenz-Ausgabe haengt von der Prompt-Gestaltung ab — Claude liefert keine nativen Konfidenzwerte, aber kann gebeten werden, `"confidence": "high"|"medium"|"low"` pro Element zu schalten. Das ist die einzige Option, da die Vision API keine separaten Konfidenz-Scores exponiert.

`expo-image-manipulator` ist bereits im Projekt installiert (`^55.0.15`) und deckt die 1.15-MP-Resize-Anforderung (PHOTO-03) vollstaendig ab. `expo-image-picker` ist noch **nicht** installiert und muss hinzugefuegt werden (kompatible SDK-53-Version: `~16.1.4`). Alternativ genuegt `expo-image-picker` allein, da es sowohl Kamera-Launch als auch Galerie-Auswahl abdeckt und `expo-camera` (nur reine Kamera-Steuerung) damit ueberfluessig wird.

Das Plan-Rendering in Phase 4 ist **statisch** — keine Touch-Interaktivitaet, nur Anzeige. Phase 5 bringt den interaktiven Canvas (Skia). Fuer die statische Ansicht genuegt `react-native-svg` (bereits im Projekt als transitive Abhaengigkeit vorhanden), das fuer die Phase-4-Anzeige vollkommen ausreicht.

**Primäre Empfehlung:** Baue auf dem bestehenden Photo-Lifecycle auf. Der einzige gruendlich neue Teil ist: (1) Capture-Flow-Screens, (2) Client-Resize mit `expo-image-manipulator`, (3) Claude Vision Edge-Function-Block, (4) Job-Status-Polling, (5) Bestaetigungs-Screen nach VereinsregelRow-Muster, (6) statisches SVG-Plan-Rendering.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** 3 Einzel-Screens als gefuehrter Haupt-Flow (Uebersicht, Nordseite, Suedseite) mit Kamera + Galerie-Option. Fortschrittsanzeige 1/3, 2/3, 3/3.
- **D-02:** Anleitungstext + Beispielbild pro Schritt.
- **D-03:** Zusaetzliche Fotos erlaubt nach den 3 Pflichtfotos. Uebersichts-Screen mit Thumbnails + "Weiteres Foto hinzufuegen". Claude bekommt alle Fotos.
- **D-04:** Form-Auswahl + Massfelder: 4 Form-Silhouetten (Rechteck, L-Form, Trapez, Freihand-Eckpunkte). Pro Form passende Massfelder.
- **D-05:** Reihenfolge: Foto-Capture → Foto-Uebersicht → Grundform + Masse → Analyse starten.
- **D-06:** Liste mit Toggles fuer Elementbestaetigungsscreen — scrollbar, Icon + Name + Konfidenz + Accept/Reject-Toggle + "Alle bestaetigen"-Button oben. Pattern: VereinsregelRow/Confirm-Flow.
- **D-07:** 0 Elemente erkannt → leere Plan-Vorlage mit Gartenmassen + freundlicher Hinweis.
- **D-08:** 1-Foto-Warnung (PHOTO-07): Warnung anzeigen, Analyse trotzdem versuchen.
- **D-09:** Visueller Stil — skizzenhaft-warm: warmes Beige (#F5F0E8), gedaempftes Gruen (#8DB580), Erde/Braun (#C4956A), Sand (#D4C5A9), Holz (#A0785A). Nicht-klinisch, papier-artig.

### Claude's Discretion
- **Freihand-Eckpunkt-Tool UX:** Bester Touch-Ansatz fuer Polygon-Eingabe auf iPhone-Screen (Raster-Tippen, manuelle Masse zwischen Eckpunkten, oder Hybrid).
- **Konfidenz-Darstellung:** Basierend auf dem tatsaechlichen Claude Vision API-Output — ob Textlabel (sicher/unsicher), Prozent, Farbcode, oder automatische Default-Selektion.
- **Element-Symbole und Detailgrad:** Balance zwischen Einfachheit und Schoenheit passend zum skizzenhaft-warmen Gesamtstil.
- **Plan-Interaktivitaet in Phase 4:** Entscheidung ob der Plan in Phase 4 rein statisch ist oder ob Tap-auf-Element fuer Detailansicht schon implementiert wird.

### Deferred Ideas (OUT OF SCOPE)
Keine — Discussion blieb im Phase-Scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PHOTO-01 | User kann mind. 3 Garten-Fotos aufnehmen oder hochladen (gefuehrter Flow: Uebersicht, Nord, Sued) | expo-image-picker deckt Kamera + Galerie in einem Package ab |
| PHOTO-02 | User gibt Gartenmasse ein (L×B; Formen: Rechteck, L-Form, Trapez, freie Eckpunkte) | RN TextInput + custom polygon-entry; neue Migration fuer garden_dimensions |
| PHOTO-03 | Bilder werden client-seitig auf max. 1.15 MP skaliert vor Upload | expo-image-manipulator bereits installiert; manipulateAsync mit resize-Action |
| PHOTO-04 | Claude Vision analysiert Fotos + Masse server-seitig → strukturiertes JSON | ai-job-consumer Mock-Block Zeile 46-49 ersetzen; Files-API-Muster aus extract-vereinsregeln |
| PHOTO-05 | Erkannte Elemente einzeln zur Bestaetigung/Ablehnung (Konfidenz-UI) | VereinsregelRow.tsx Pattern wiederverwenden |
| PHOTO-06 | App rendert schematischen 2D-Plan aus bestatigtem JSON | react-native-svg (statisch Phase 4); skizzenhaft-warme Farbpalette |
| PHOTO-07 | Edge Case: nur 1 Foto → Warnung, Analyse trotzdem | InlineBanner.tsx bereits nutzbar |
| PHOTO-08 | Edge Case: keine Elemente erkannt → leere Plan-Vorlage | Leeres SVG-Grid mit Gartendimensionen |
| NFR-02 | KI-Analyse asynchron mit Loading-State (kein blockierendes UI) | Job-Polling-Loop; ExtractionLoader.tsx bereits vorhanden |
| NFR-03 | KI-Budget-Limit: Soft-Warnung bei 50 Calls/Tag, Hard-Stop bei 200/Tag | ai_jobs-Count-Query in Edge Function vor Claude-Call |
</phase_requirements>

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Foto-Capture (Kamera/Galerie) | Client (React Native) | — | Geraeteseitige Kamera-API; Plattform-Permission-Management |
| Client-seitiger Foto-Resize (1.15 MP) | Client (React Native) | — | Muss vor Upload-Eintrag in photo_queue laufen (PHOTO-03) |
| EXIF-Strip + GPS-Opt-in | Client (React Native) | — | Bereits implementiert in exifStrip.native.ts/.web.ts |
| Photo-Queue / Upload | Client + Supabase Storage | — | Existierender SyncWorker/PhotoUploader-Flow |
| Claude Vision API Call | Supabase Edge Function | — | FOUND-06: API-Key nur server-seitig |
| KI-Budget-Zaehlung + Rate-Limit | Supabase Edge Function | DB (ai_jobs) | COUNT-Query auf ai_jobs vor Claude-Call |
| Ergebnis-Persistierung (raw + parsed) | Supabase Edge Function | DB (ai_results) | FOUND-08: vollstaendig in ai_results |
| Job-Status-Polling | Client (TanStack Query) | — | Kurzes Poll-Intervall auf ai_jobs.status bis 'done' |
| Element-Bestaetigung UI | Client (React Native) | — | UI-only; schreibt plan_elements nach Bestaetigung |
| garden_dimensions + plan_elements | DB (Postgres) + Client (SQLite/IndexedDB) | — | Neue Migration + neue lokale Row-Tables |
| Plan-Rendering (statisch) | Client (React Native/Web) | — | react-native-svg SVG-Ausgabe; rein zur Anzeige |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| expo-image-picker | ~16.1.4 (SDK 53) | Kamera-Launch + Galerie-Auswahl | Offizielle Expo-Loesung, deckt beide Use-Cases in einem Package ab |
| expo-image-manipulator | ^55.0.15 (**bereits installiert**) | Client-seitiger Resize auf 1.15 MP | `manipulateAsync` + `resize`-Action ist exakt der richtige Ansatz |
| react-native-svg | (transitive, bereits vorhanden via expo) | Statisches SVG-Plan-Rendering Phase 4 | Ausreichend fuer statische Darstellung; Skia-Upgrade erst Phase 5 |
| @anthropic-ai/sdk | ^0.90.0 (**bereits in extract-vereinsregeln/deno.json**) | Claude Vision API in Edge Function | Bereits eingerichtet; pattern aus extract-vereinsregeln uebernehmen |
| zod | (im Projekt vorhanden, via supabase-js) | Payload-Validierung vor Claude-Call (T-3-03) | Bestehendes Kommentar in ai-job-consumer Zeile 46 verlangt Zod |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| TanStack Query | 5.62.7 (**bereits installiert**) | Job-Status-Polling auf ai_jobs.status | useQuery mit refetchInterval bis status='done' |
| ExtractionLoader.tsx | vorhandener Komponente | Loading-State-Overlay waehrend Claude-Analyse | Direkt wiederverwenden; nur i18n-Keys anpassen |
| InlineBanner.tsx | vorhandener Komponente | 1-Foto-Warnung, Budget-Warnung | Direkt wiederverwenden |
| VereinsregelRow.tsx (Pattern) | vorhandener Komponente | Element-Bestaetigungs-Liste | Neuer `PlanElementRow.tsx` analog gebaut |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| expo-image-picker | expo-camera (direkte Kamera-Steuerung) | expo-camera erfordert eigene View-Komponente und custom Shutter-UI; expo-image-picker ist simpler fuer "Kamera starten + Foto zurueckbekommen" |
| react-native-svg (Phase 4) | @shopify/react-native-skia | Skia ist besser fuer interaktive Canvases (Phase 5), aber unnoetige Komplexitaet fuer statisches Phase-4-Rendering. Roadmap-Entscheidung: Skia ab Phase 5 |
| Polling (TanStack Query) | Supabase Realtime Subscription | Realtime waere eleganter, aber existierender Code verwendet kein Realtime; polling ist simpler und bewaehrt fuer single-job-wait-Pattern |

**Installation:**
```bash
# App-Package:
cd app && pnpm add expo-image-picker@~16.1.4
# react-native-svg ist bereits transitive Abhaengigkeit (via expo/react-native)
# expo-image-manipulator ist bereits installiert
```

**Version verification:**
```
expo-image-picker: 55.0.19 (npm registry 2026-05-03) [VERIFIED: npm view]
expo-image-manipulator: 55.0.15 (npm registry 2026-05-03) [VERIFIED: npm view]
@anthropic-ai/sdk: ^0.90.0 (in extract-vereinsregeln/deno.json) [VERIFIED: codebase]
```

---

## Architecture Patterns

### System Architecture Diagram

```
 [User: iPhone/Web]
        |
        v
 ┌─────────────────────────────────────────────────────────────┐
 │  CAPTURE FLOW (Screens)                                     │
 │  CaptureStep1 → CaptureStep2 → CaptureStep3 → PhotoReview  │
 │  [expo-image-picker: Kamera/Galerie]                        │
 │  [expo-image-manipulator: resize → max 1.15 MP]             │
 │  [exifStrip: EXIF entfernen, GPS opt-in]                    │
 │  [photoQueueRepo.enqueuePhoto → photo_queue (SQLite/IDB)]   │
 └─────────────────┬───────────────────────────────────────────┘
                   |
                   v
 ┌─────────────────────────────────────────────────────────────┐
 │  MASS-EINGABE (Screen: GardenDimensions)                    │
 │  Form-Auswahl (Rechteck/L-Form/Trapez/Freihand)             │
 │  Massfelder → garden_dimensions (SQLite/IDB)                │
 └─────────────────┬───────────────────────────────────────────┘
                   |
                   v
 ┌─────────────────────────────────────────────────────────────┐
 │  ANALYSE TRIGGER                                            │
 │  "Analyse starten"-Button                                   │
 │  Budget-Check: COUNT ai_jobs today (via Supabase)           │
 │  ≥200: Hard-Stop + Fehlermeldung                            │
 │  ≥50: Soft-Warning + trotzdem fortfahren                    │
 │  PhotoUploader.uploadPending() → Storage + RPC              │
 │  enqueue_photo_analysis(garden_id, storage_path, kind)      │
 └─────────────────┬───────────────────────────────────────────┘
                   |
        [Supabase Edge Function: ai-job-consumer]
                   |
                   v
 ┌─────────────────────────────────────────────────────────────┐
 │  EDGE FUNCTION: ai-job-consumer                             │
 │  1. Budget-Check: COUNT ai_jobs (garden_id, today) ≥200?   │
 │  2. Download photos von Supabase Storage                    │
 │  3. Files-API: Upload → file_id (alle Fotos)                │
 │  4. Claude Vision Call: Fotos + Masse → JSON                │
 │  5. Zod-Validierung des parsed_result                       │
 │  6. INSERT ai_results (raw_response, parsed_result)         │
 │  7. UPDATE ai_jobs.status = 'done'                          │
 └─────────────────┬───────────────────────────────────────────┘
                   |
        [Client: TanStack Query polling ai_jobs.status]
                   |
                   v
 ┌─────────────────────────────────────────────────────────────┐
 │  ELEMENT-BESTAETIGUNG (Screen)                              │
 │  Laedt ai_results.parsed_result                             │
 │  PlanElementRow (per Element: Icon + Name + Konfidenz)      │
 │  Accept/Reject-Toggle, "Alle bestaetigen"                   │
 │  → plan_elements INSERT (accepted=true)                     │
 └─────────────────┬───────────────────────────────────────────┘
                   |
                   v
 ┌─────────────────────────────────────────────────────────────┐
 │  PLAN-RENDERING (Screen: GardenPlan)                        │
 │  Laedt plan_elements + garden_dimensions                    │
 │  react-native-svg: statischer 2D-Plan                       │
 │  Skizzenhaft-warm: Beige-Hintergrund, gedaempfte Farben     │
 └─────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure

```
app/app/(app)/capture/
├── _layout.tsx             # Stack-Navigator fuer Capture-Flow
├── step-1.tsx              # Uebersichts-Foto (1/3)
├── step-2.tsx              # Nordseite-Foto (2/3)
├── step-3.tsx              # Suedseite-Foto (3/3)
├── review.tsx              # Foto-Uebersicht + "Weiteres Foto" + Budget-Check
├── dimensions.tsx          # Grundform-Auswahl + Massfelder
└── analysing.tsx           # Loading-State (ExtractionLoader) + Job-Polling

app/app/(app)/
└── plan-elements.tsx       # Element-Bestaetigungs-Screen (neue Route)

app/app/(app)/
└── index.tsx               # Ersetzen: zeigt Plan wenn plan_elements vorhanden

supabase/functions/ai-job-consumer/
├── index.ts                # Mock-Block durch echten Claude Vision Call ersetzen
├── parseElements.ts        # Analoges Modul zu parseRules.ts fuer Plan-Elemente
└── deno.json               # unveraendert (zod hinzufuegen falls noetig)

supabase/migrations/
└── 20260504000014_garden_plan.sql   # garden_dimensions + plan_elements Tables

packages/shared/src/types/
└── entities.ts             # GardenDimensionsRow + PlanElementRow hinzufuegen

app/src/lib/
├── gardenPlanRepo.ts       # CRUD fuer garden_dimensions + plan_elements
└── photoResizer.ts         # Wrapper um expo-image-manipulator (1.15 MP cap)

app/src/components/
└── PlanElementRow.tsx      # Analog VereinsregelRow: Accept/Reject-Toggle
```

### Pattern 1: Client-seitiger Foto-Resize auf max 1.15 MP

**Was:** Vor dem Einstellen in die photo_queue wird jedes Foto auf max 1.15 MP skaliert.
**Wann:** In `photoResizer.ts`, aufgerufen von Capture-Screen vor `enqueuePhoto()`.

```typescript
// Source: expo-image-manipulator Docs + [VERIFIED: npm registry]
import * as ImageManipulator from 'expo-image-manipulator';

const MAX_MP = 1_150_000; // 1.15 Megapixel = 1092×1053 px equivalent

export async function resizeToMaxMp(localUri: string): Promise<string> {
  // ImageManipulator.manipulateAsync gibt { uri, width, height } zurueck
  const result = await ImageManipulator.manipulateAsync(
    localUri,
    [{ resize: { width: 1092 } }], // 1092px Breite → max ~1.19 MP (API-Ceiling gemaess Docs)
    {
      compress: 0.85,
      format: ImageManipulator.SaveFormat.JPEG,
    },
  );
  return result.uri;
}
```

**Hinweis:** Die Claude Vision API skaliert Bilder ab 1568 px auf der langen Seite herunter auf max 1568 Tokens. 1092px Breite haelt das Bild innerhalb der effektiven Verarbeitungsgrenze und minimiert Latenz. [CITED: platform.claude.com/docs/en/build-with-claude/vision]

### Pattern 2: expo-image-picker fuer Kamera + Galerie

**Was:** Unified API fuer Kamera-Launch und Galerie-Auswahl.
**Wann:** In jedem Capture-Screen (step-1, step-2, step-3).

```typescript
// Source: [ASSUMED - aus Training, Expo Docs Pattern]
import * as ImagePicker from 'expo-image-picker';

export async function capturePhoto(): Promise<string | null> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') return null;

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: 1.0, // Originalqualitaet — Resize folgt via resizeToMaxMp()
  });
  if (result.canceled) return null;
  return result.assets[0].uri;
}

export async function pickFromGallery(): Promise<string | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: 1.0,
  });
  if (result.canceled) return null;
  return result.assets[0].uri;
}
```

### Pattern 3: Claude Vision API Call in Edge Function

**Was:** Ersatz fuer den Mock-Block in `ai-job-consumer/index.ts` Zeile 46–49.
**Wann:** Wenn `msg.message.job_type === 'photo_analysis'`.

```typescript
// Source: [CITED: platform.claude.com/docs/en/build-with-claude/vision]
// Pattern analog extract-vereinsregeln/index.ts (Files API Upload + anthropic.messages.create)

// 1. Alle Storage-Paths aus ai_jobs.payload laden
// 2. Pro Foto: download von Supabase Storage → ArrayBuffer
// 3. Pro Foto: Upload zur Anthropic Files API (image/jpeg)
// 4. Claude Vision Call mit allen file_ids + Masse-Kontext
const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 4096,
  messages: [{
    role: 'user',
    content: [
      // Bilder ZUERST (Docs-Empfehlung: images before text)
      ...photoFileIds.map((fileId) => ({
        type: 'image' as const,
        source: { type: 'file' as const, file_id: fileId },
      })),
      { type: 'text' as const, text: buildAnalysisPrompt(dimensions) },
    ],
  }],
});
// 5. parseElements(response.content[0].text) → PlanElement[]
// 6. INSERT ai_results { raw_response, parsed_result, model_used, latency_ms }
// 7. UPDATE ai_jobs.status = 'done'
// 8. Files API: delete alle hochgeladenen file_ids (analog extract-vereinsregeln)
```

**Wichtig:** Anthropic Files API benoetigt `'anthropic-beta': 'files-api-2025-04-14'` Header. Das Pattern ist bereits in `extract-vereinsregeln/index.ts` implementiert und bewaehrt. [VERIFIED: codebase]

### Pattern 4: Claude Vision JSON Output-Schema

**Was:** Der Prompt muss ein spezifisches JSON-Format von Claude erzwingen.
**Wann:** In `parseElements.ts` (analog `parseRules.ts`).

```typescript
// Gewuenschtes parsed_result-Format in ai_results:
interface PlanElementCandidate {
  element_type: string;        // z.B. "Beet", "Laube", "Kompost", "Weg", "Rasen"
  label: string;               // z.B. "Gemuese-Hochbeet", "Geräteschuppen"
  x_m: number;                 // X-Position in Garten-Metern (von SW-Ecke)
  y_m: number;                 // Y-Position in Garten-Metern (von SW-Ecke)
  width_m: number;             // Geschaetzte Breite in Metern
  height_m: number;            // Geschaetzte Hoehe/Tiefe in Metern
  confidence: 'high' | 'medium' | 'low'; // Vom Prompt gesteuerter Konfidenzwert
}
// [ASSUMED: Konfidenz-Skala von Claude ist prompt-gesteuert, nicht nativ]
```

**Konfidenz-Darstellung (Claudesche Discretion):** Da Claude keine nativen Konfidenz-Scores liefert, muss der Prompt Claude anweisen, pro Element einen von drei Konfidenz-Werten zu setzen. Empfehlung: `"high"` → gruener Badge "sicher", `"medium"` → gelber Badge "wahrscheinlich", `"low"` → roter Badge "unsicher". Auto-Default-Selektion: `high` und `medium` sind pre-accepted (Toggle ON), `low` ist pre-rejected (Toggle OFF). User kann manuell uebersteuern.

### Pattern 5: Job-Status-Polling (TanStack Query)

**Was:** Client pollt `ai_jobs.status` bis `done` oder `failed`.
**Wann:** Im `analysing.tsx`-Screen nach dem Foto-Upload.

```typescript
// Source: [ASSUMED - aus Training, TanStack Query refetchInterval Pattern]
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

function useJobStatus(jobId: string | null) {
  return useQuery({
    queryKey: ['ai_job', jobId],
    queryFn: async () => {
      if (!jobId) return null;
      const { data, error } = await supabase
        .from('ai_jobs')
        .select('status, last_error')
        .eq('id', jobId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'done' || status === 'failed') return false; // stop polling
      return 3000; // alle 3 Sekunden
    },
    staleTime: 0,
  });
}
```

### Pattern 6: Budget-Tracking (NFR-03)

**Was:** Soft-Warnung bei 50 Calls/Tag, Hard-Stop bei 200/Tag.
**Wann:** In der Edge Function (authoritative) + Client-seitiger Pre-Check (UX).

```typescript
// Edge Function (authoritative Pruefung):
// [ASSUMED - count-pattern basierend auf bestehendem Schema]
const { count } = await supabase
  .from('ai_jobs')
  .select('*', { count: 'exact', head: true })
  .eq('garden_id', gardenId)
  .gte('created_at', startOfToday.toISOString());

const SOFT_LIMIT = 50;
const HARD_LIMIT = 200;

if (count >= HARD_LIMIT) {
  await supabase.from('ai_jobs').update({
    status: 'failed',
    last_error: 'daily_limit_exceeded',
  }).eq('id', jobId);
  return; // kein Claude-Call
}
// Soft-Limit: in ai_results.parsed_result ein `_budget_warning: true` Flag mitsenden
// → Client zeigt InlineBanner
```

**Hinweis:** Das Budget wird pro `garden_id` (nicht pro `user_id`) gezaehlt — da beide Garden-Member zur selben Parzelle arbeiten und das Budget die Garten-Analyse-Rate limitiert, nicht individuelle Nutzung. [ASSUMED — begruendet durch 2-User-Shared-Garden-Kontext, kein Gegenbeweis in DB-Schema]

### Pattern 7: Statisches SVG-Plan-Rendering

**Was:** `react-native-svg` (bereits transitiv vorhanden) fuer den Phase-4-Plan.
**Wann:** Im `index.tsx` (GartenPlanScreen), ersetzt den Placeholder.

```tsx
// Source: [ASSUMED - react-native-svg Pattern]
import Svg, { Rect, Line, Text as SvgText, G } from 'react-native-svg';

// Koordinatenkonversion: Garten-Meter → SVG-Pixel
function mToSvgPx(meters: number, svgSize: number, gardenSize: number): number {
  return (meters / gardenSize) * svgSize;
}

// Warme Farbpalette (D-09):
const COLORS = {
  background: '#F5F0E8',  // warmes Beige
  lawn: '#8DB580',        // gedaempftes Gruen
  bed: '#C4956A',         // Erde/Braun
  path: '#D4C5A9',        // Sand
  hut: '#A0785A',         // Holz
  border: '#8B7355',      // Dunkelbraun fuer Umrisse
};
```

### Anti-Patterns to Avoid

- **Mock-Block nicht nur kommentieren:** Den Block in `ai-job-consumer/index.ts` Zeile 46–49 vollstaendig ersetzen, nicht nur deaktivieren — der `if (CLAUDE_KEY)` Branch muss weg.
- **Kein direkter Claude-Call im Client:** Alle Claude-Calls nur in der Edge Function. FOUND-06 ist harte Pflicht.
- **Kein Resize nach EXIF-Strip:** Reihenfolge ist wichtig: EXIF-Strip passiert in `enqueuePhoto()`, aber Resize muss DAVOR passieren (vor dem Speichern in die photo_queue), weil die lokale URI die Eingabe fuer den EXIF-Strip ist.
- **Kein Polling ohne Timeout:** Das `refetchInterval` muss bei `done`/`failed` aufhoeren. Unbegrenztes Polling waere ein Memory/Battery-Leak.
- **Keine hardcodierten Pixel-Koordinaten im DB-Schema:** Koordinaten in Gartenmetern (EDIT-06-Vorgriff). Phase 5 baut darauf auf.
- **Kein react-native-svg fuer Phase 5:** Phase 5 benutzt Skia fuer den interaktiven Canvas — nicht react-native-svg retroaktiv interaktiv machen.

---

## Don't Hand-Roll

| Problem | Nicht selbst bauen | Stattdessen | Warum |
|---------|-------------------|-------------|-------|
| Image-Resize auf bestimmtes MP-Limit | Eigen-Implementierung mit Canvas-API | `expo-image-manipulator.manipulateAsync` | Plattformuebergreifend (iOS/Android/Web), korrekte Pixel-Math, bereits installiert |
| Kamera-Zugriff + Gallery-Picker | Eigene Kamera-View | `expo-image-picker` | Permission-Flow, Galerie-Integration, HEIC-Support — alles eingebaut |
| JSON-Parsing mit Fehlertoleranz | Custom Parser | `parseElements.ts` analog `parseRules.ts` | `parseRules.ts` hat bereits Fence-Strip, Substring-Extraction, Null-Safety — nur kopieren und anpassen |
| AI-Job-Queue | Eigene Polling-Infrastruktur | Bestehendes pgmq + ai_jobs-Tabellen | Vollstaendig implementiert in Phase 1 + 3 |
| SVG-Rendering | Native Canvas | `react-native-svg` (Phase 4), `@shopify/react-native-skia` (Phase 5) | react-native-svg ist fuer statische Anzeige mehr als ausreichend |

---

## Common Pitfalls

### Pitfall 1: Resize NACH statt VOR EXIF-Strip

**Was schiefgeht:** `manipulateAsync` entfernt EXIF (kein Opt-in-Schutz) oder blaest HEIC-Bilder auf.
**Warum:** `expo-image-manipulator` schreibt ein neues JPEG aus — dabei gehen EXIF-Daten unter Umstaenden verloren oder werden neu eingeschrieben.
**Wie vermeiden:** Reihenfolge: `capturePhoto()` → `resizeToMaxMp(uri)` → `enqueuePhoto(gardenId, resizedUri, optIn)`. `enqueuePhoto` ruft `stripExifAndExtractGps` auf der resizedUri auf.
**Fruehzeichen:** Warnung von `exifStrip.ts` dass keine EXIF-Daten vorhanden sind (harmlos), oder GPS-Daten landen trotz `optIn=false` in photo_queue.

### Pitfall 2: ai_jobs.user_id vs. created_by_user_id

**Was schiefgeht:** Der alte Mock in ai-job-consumer laedt `job.user_id` — dieses Feld heisst seit Migration 007 `created_by_user_id`.
**Warum:** Migration 007 hat das Feld umbenannt (Phase-2.5-Pivot). Der Mock-Block in `ai-job-consumer/index.ts` Zeile 42 verwendet noch `user_id`.
**Wie vermeiden:** Im echten Claude Vision Block `created_by_user_id` verwenden. [VERIFIED: codebase, ai_jobs_created_by_isolation.sql]
**Fruehzeichen:** `undefined` als user_id bei ai_results.INSERT → RLS-Fehler.

### Pitfall 3: ai_results.user_id fehlt (RLS bricht)

**Was schiefgeht:** `ai_results.INSERT` ohne `user_id` schlaegt wegen `ai_results_insert_service` Policy fehl (Service-Role umgeht RLS, aber das `user_id`-Feld ist NOT NULL).
**Warum:** ai_results hat `user_id` als NOT NULL FK — der Edge-Function-Block muss dieses Feld befuellen.
**Wie vermeiden:** `user_id: job.created_by_user_id` in den INSERT mitschicken. [VERIFIED: codebase, foundation.sql ai_results schema]

### Pitfall 4: Koordinaten in Pixel statt Garten-Metern

**Was schiefgeht:** Claude Vision gibt Pixel-Koordinaten zurueck (relative Position im Foto) — das ist NICHT dasselbe wie Garten-Meter-Koordinaten.
**Warum:** Phase 5 (EDIT-06) setzt Garten-Meter als kanonisches Koordinatensystem voraus. Pixel-Koordinaten aus Fotos sind persektivenverzerrt und nicht skalierbar.
**Wie vermeiden:** Der Claude-Prompt muss explizit Garten-Meter als Ausgabeformat verlangen, unter Verwendung der eingegebenen Gartenmasse als Kontext. Prompt-Wording: "Positioniere alle erkannten Elemente in einem Koordinatensystem von 0 bis {gartenbreite_m} Metern (X) und 0 bis {gartenlaenge_m} Metern (Y), wobei die Suedwest-Ecke des Gartens der Ursprung (0,0) ist."
**Fruehzeichen:** Elemente clustern alle um einen Punkt oder haben unrealistische Grossen (z.B. 50m Beet).

### Pitfall 5: Budget-Pruefung nur im Client

**Was schiefgeht:** Client-seitiger Budget-Check kann umgangen werden (Race Condition, Seiten-Neuladen).
**Warum:** Der authoritative Check MUSS in der Edge Function stehen. Der Client-Check ist nur fuer schnelle UX (Pre-Check vor Upload).
**Wie vermeiden:** Edge Function: COUNT ai_jobs vor dem Claude-Call. Client: TanStack Query fuer Budget-Status (nicht vertrauenswuerdig).

### Pitfall 6: Files API ohne Cleanup

**Was schiefgeht:** Hochgeladene Anthropic Files bleiben dauerhaft gespeichert und verursachen Kosten + Datenschutzrisiken.
**Warum:** Das Files-API-Muster in `extract-vereinsregeln/index.ts` loescht Files in einem `finally`-Block. [VERIFIED: codebase, extract-vereinsregeln/index.ts Zeile 104-108]
**Wie vermeiden:** Gleiches `finally`-Pattern in `ai-job-consumer/index.ts` fuer alle hochgeladenen photo file_ids.

### Pitfall 7: Freihand-Eckpunkt-Tool auf kleinem Touchscreen

**Was schiefgeht:** Eckpunkte liegen zu nah beieinander auf iPhone-Standardgroesse.
**Warum:** iPhone SE hat 375pt Breite; ein 10m-Garten mit einem 0.5m-Weg hat Eckpunkte, die rechnerisch 18pt auseinanderliegen — schwierig zu treffen.
**Wie vermeiden:** Empfohlener Ansatz (Claudesche Discretion, D-04): Raster-Modus als Standard. User tippt auf ein Raster-Feld (z.B. 0.5m × 0.5m), nicht auf exakte Pixel-Koordinaten. Alternativ: Manuelle Masse-Eingabe zwischen den Eckpunkten (einfacher und fehlertoleranter fuer MVP).

### Pitfall 8: Polling-Loop haengt wenn Edge Function nicht aufgeweckt wird

**Was schiefgeht:** `ai-job-consumer` ist eine Deno Supabase Edge Function — sie wird per HTTP-Trigger aufgerufen (Cron oder manuell). Ohne externen Trigger verarbeitet sie die Queue nicht.
**Warum:** Die Edge Function laeuft nicht als persistenter Worker — sie muss getriggert werden. Phase 1 hat dieses Problem mit einem manuellen Trigger geloest (e2e-pgmq-smoke.sql). Fuer Phase 4 brauchen wir einen Produktions-Trigger.
**Wie vermeiden:** Supabase pg_cron Job: `SELECT cron.schedule('ai-job-consumer', '* * * * *', $$SELECT net.http_post(...)$$)` — einmalig in der neuen Migration einrichten. [ASSUMED — pg_cron + net-Extension Pattern fuer Supabase, nicht verifiziert ob Extension aktiv ist]
**Fruehzeichen:** Job bleibt dauerhaft im Status `queued` — Polling-Loop pollt ewig.

---

## Code Examples

### Vollstaendiger `photoResizer.ts`

```typescript
// Source: expo-image-manipulator Docs [CITED: docs.expo.dev/versions/latest/sdk/imagemanipulator/]
// Klares 1.15-MP-Ziel: 1092 × 1053 = 1,149,876 px < 1.15 MP
import * as ImageManipulator from 'expo-image-manipulator';

export async function resizeToMaxMp(localUri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    localUri,
    [{ resize: { width: 1092 } }],
    { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG },
  );
  return result.uri;
}
```

### Claude Vision Prompt-Template (Kern)

```typescript
// Source: [ASSUMED - Prompt-Engineering basierend auf parseRules.ts-Muster]
export function buildAnalysisPrompt(dimensions: {
  width_m: number;
  height_m: number;
  shape: 'rectangle' | 'l_shape' | 'trapezoid' | 'freehand';
}): string {
  return `Du bist ein Garten-Analyse-Assistent. Analysiere die beigefuegten Fotos eines Kleingartens.

Koordinatensystem: Die Suedwest-Ecke des Gartens ist Ursprung (0,0).
Gartenbreite: ${dimensions.width_m} Meter (X-Achse, Richtung Ost)
Gartenlaenge: ${dimensions.height_m} Meter (Y-Achse, Richtung Nord)
Gartenform: ${dimensions.shape}

Erkenne alle sichtbaren Elemente (Beete, Laube, Kompost, Wege, Baeume, Rasenflaechen, etc.)
und gib sie als reines JSON-Array zurueck.

WICHTIG:
- Antworte AUSSCHLIESSLICH mit gueltigem JSON-Array. Keine Erklaerungen, keine Markdown-Codefences.
- Positioniere Elemente in Garten-METERN (nicht Pixel).
- Setze confidence basierend auf deiner Erkennungssicherheit: "high" (klar sichtbar), "medium" (wahrscheinlich), "low" (unsicher/unklar).
- Wenn du gar keine Elemente erkennst: antworte mit leerem Array [].

Felder pro Element:
  element_type (string): "Beet" | "Laube" | "Kompost" | "Weg" | "Baum" | "Rasen" | "Zaun" | "Wasserstelle" | "Sitzplatz" | "Sonstiges"
  label (string): Kurze Beschreibung, z.B. "Gemuese-Hochbeet", "Geräteschuppen"
  x_m (number): X-Koordinate in Metern (Mitte des Elements)
  y_m (number): Y-Koordinate in Metern (Mitte des Elements)
  width_m (number): Geschaetzte Breite in Metern
  height_m (number): Geschaetzte Tiefe/Hoehe in Metern
  confidence (string): "high" | "medium" | "low"`;
}
```

### Neue DB-Entities (Migration-Grundlage)

```sql
-- garden_dimensions: Grundform + Masse (eine Row pro Garten)
CREATE TABLE IF NOT EXISTS public.garden_dimensions (
  id                 uuid primary key default gen_random_uuid(),
  garden_id          uuid not null references public.gardens(id) on delete cascade,
  shape              text not null check (shape in ('rectangle','l_shape','trapezoid','freehand')),
  width_m            double precision not null,   -- fuer Rechteck: Breite
  height_m           double precision not null,   -- fuer Rechteck: Laenge/Tiefe
  extra_dims         jsonb,                       -- fuer L-Form/Trapez/Freihand: zusaetzliche Masse
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  updated_by_user_id uuid references auth.users(id),
  deleted_at         timestamptz,
  UNIQUE(garden_id)  -- max eine Dimension-Row pro Garten
);

-- plan_elements: bestaetigt Elemente aus Claude Vision Analyse
CREATE TABLE IF NOT EXISTS public.plan_elements (
  id                 uuid primary key default gen_random_uuid(),
  garden_id          uuid not null references public.gardens(id) on delete cascade,
  ai_result_id       uuid references public.ai_results(id) on delete set null,
  element_type       text not null,               -- "Beet" | "Laube" etc.
  label              text not null,
  x_m                double precision not null,
  y_m                double precision not null,
  width_m            double precision not null,
  height_m           double precision not null,
  confidence         text,                        -- aus Claude: "high"|"medium"|"low"
  is_accepted        boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  updated_by_user_id uuid references auth.users(id),
  deleted_at         timestamptz
);
```

---

## Runtime State Inventory

> Phase 4 ist eine Neuerstellung — kein Rename/Refactor-Kontext. Diese Sektion ist reduziert auf die relevante Infrastruktur-Pruefung.

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | ai_jobs-Rows mit `status='queued'` koennen von Phase-3-Tests offen sein | Kein Action — bestehende Mock-Jobs beeinflussen Phase-4-Flow nicht |
| Live service config | Edge Function `ai-job-consumer` deployed als Mock-Version | Ersetzen des Mock-Blocks; neue Deployment erforderlich |
| OS-registered state | Kein pg_cron Job fuer ai-job-consumer | Neue Migration: pg_cron-Schedule einrichten (oder HTTP-Trigger-Strategie klaeren) |
| Secrets/env vars | `CLAUDE_API_KEY` in Supabase Function Secrets bereits gesetzt (Phase 1) | Kein Action — Key wird nur "activated" durch Entfernen der Mock-Logik |
| Build artifacts | `expo-image-picker` nicht installiert | `pnpm add expo-image-picker@~16.1.4` in app/ |

---

## Open Questions

1. **pg_cron / Edge Function Trigger-Strategie**
   - Was wir wissen: Der `ai-job-consumer` muss getriggert werden, um Queue-Messages zu verarbeiten. Bisher: manuell via e2e-pgmq-smoke.sql.
   - Was unklar ist: Ist die `pg_cron`-Extension auf dem Supabase-Projekt `vitrqkzxkiqvadqfzrcx` aktiviert? Ist die `net`-Extension (fuer `net.http_post`) aktiviert?
   - Empfehlung: In der neuen Migration prufen (`SELECT extname FROM pg_extension WHERE extname IN ('pg_cron','http','pg_net');`). Falls nicht vorhanden: Supabase Dashboard Extensions aktivieren oder Polling vom Client als Trigger verwenden (Client ruft `supabase.functions.invoke('ai-job-consumer')` direkt auf).

2. **Files API Beta-Header fuer Images**
   - Was wir wissen: `extract-vereinsregeln/index.ts` nutzt `'anthropic-beta': 'files-api-2025-04-14'` fuer PDFs. [VERIFIED: codebase]
   - Was unklar ist: Gilt derselbe Beta-Header auch fuer Image-Files in der Files API?
   - Empfehlung: Entweder denselben Beta-Header verwenden oder Bilder direkt als base64 `image`-Content-Block senden (kein Files-API-Upload noetig fuer Bilder, die nicht wiederverwendet werden). Base64 ist simpler und vermeidet Files-API-Quota.

3. **react-native-svg Verfuegbarkeit auf Web**
   - Was wir wissen: react-native-svg ist transitive Abhaengigkeit (via expo). Es funktioniert auf iOS/Android und rendert via SVG auf Web.
   - Was unklar ist: Ob die aktuell installierte Version mit Expo 53 auf Web korrekt rendert.
   - Empfehlung: Kurzer Smoke-Test im ersten Wave-0-Task.

4. **Claude Vision Erkennung-Qualitaet fuer deutsche Kleingaerten**
   - Was wir wissen: STATE.md nennt explizit "Risiko: Claude Vision structural extraction quality for German allotment plots is MEDIUM confidence. Run 5-10 photo test harness before locking Phase 4 architecture." [VERIFIED: STATE.md Zeile 143]
   - Was unklar ist: Ob die Koordinaten-in-Metern-Angabe in der Ausgabe zuverlaessig ist oder ob Claude eher relative Positionen zurueckgibt.
   - Empfehlung: Wave-0 oder Wave-1 soll einen Test-Harness-Task enthalten (5 echte Garten-Fotos durch die Edge Function, Ergebnis manuell pruefen).

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| expo-image-manipulator | PHOTO-03 client resize | ✓ | ^55.0.15 | — |
| expo-image-picker | PHOTO-01 Kamera/Galerie | ✗ | — | muss installiert werden |
| react-native-svg | PHOTO-06 Plan-Rendering | ✓ (transitiv via expo) | — | — |
| @anthropic-ai/sdk | PHOTO-04 Claude Vision | ✓ (in extract-vereinsregeln) | ^0.90.0 | — |
| CLAUDE_API_KEY (Supabase Secret) | PHOTO-04 | ✓ (Phase 1 gesetzt) | — | — |
| pg_cron Extension | Edge Function Trigger | ? | — | Client-HTTP-Trigger als Fallback |

**Missing dependencies mit Fallback:**
- `expo-image-picker`: `pnpm add expo-image-picker@~16.1.4` — einfach zu installieren, keine Blocker.
- `pg_cron`: Falls nicht aktiv, kann die Edge Function vom Client direkt per `supabase.functions.invoke()` nach dem Upload aufgerufen werden (weniger elegnat, aber funktional).

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest (jest-expo ~53.0.0) |
| Config file | app/jest.config.js (bestehend aus Phase 1-3) |
| Quick run command | `cd app && pnpm test --testPathPattern=capture` |
| Full suite command | `cd app && pnpm test` + `supabase db query --linked -f supabase/tests/garden_plan_rls.sql` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PHOTO-03 | resizeToMaxMp() skaliert Bild auf <= 1.15 MP | unit | `pnpm test --testPathPattern=photoResizer` | ❌ Wave 0 |
| PHOTO-04 | parseElements() parsed gueltiges JSON korrekt | unit | `pnpm test --testPathPattern=parseElements` | ❌ Wave 0 |
| PHOTO-04 | parseElements() gibt [] bei leerem/ungueltigen Input | unit | `pnpm test --testPathPattern=parseElements` | ❌ Wave 0 |
| PHOTO-05 | PlanElement-Accept/Reject-Flow persistiert korrekt | unit | `pnpm test --testPathPattern=gardenPlanRepo` | ❌ Wave 0 |
| PHOTO-07 | 1-Foto-Warnung wird angezeigt | unit (React) | `pnpm test --testPathPattern=capture` | ❌ Wave 0 |
| PHOTO-08 | 0 Elemente → leerer Plan erzeugt | unit | `pnpm test --testPathPattern=gardenPlanRepo` | ❌ Wave 0 |
| NFR-03 | Budget-Limit-Check im Edge-Function-Kontext | integration/SQL | `supabase db query --linked -f supabase/tests/budget_limit.sql` | ❌ Wave 0 |
| PHOTO-06 | Plan-Render zeigt accepted Elements (Smoke) | Manuell (visuell) | — | manual only |
| PHOTO-01 | Kamera/Galerie Flow (Permissions) | Manuell (Geraet) | — | manual only |

### Sampling Rate
- **Per task commit:** `cd app && pnpm test --testPathPattern=capture\|photoResizer\|parseElements\|gardenPlanRepo`
- **Per wave merge:** `cd app && pnpm test`
- **Phase gate:** Full suite green + manuelle Verifizierung Foto-Capture + Plan-Rendering auf iPhone-Simulator

### Wave 0 Gaps

- [ ] `app/src/lib/__tests__/photoResizer.test.ts` — covers PHOTO-03
- [ ] `supabase/functions/ai-job-consumer/__tests__/parseElements.test.ts` — covers PHOTO-04
- [ ] `app/src/lib/__tests__/gardenPlanRepo.test.ts` — covers PHOTO-05, PHOTO-07, PHOTO-08
- [ ] `supabase/tests/garden_plan_rls.sql` — covers NFR-03 Budget-Limit + RLS auf plan_elements/garden_dimensions

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | ja | Account-Only Guard (gardens sind account-only) |
| V3 Session Management | nein | Session bestehend aus Phase 2 |
| V4 Access Control | ja | RLS is_garden_member auf plan_elements + garden_dimensions |
| V5 Input Validation | ja | Zod vor Claude-Call (T-3-03) + parseElements-Sanitisierung analog parseRules |
| V6 Cryptography | nein | Keine neuen kryptographischen Operationen |

### Known Threat Patterns for Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Prompt Injection via Foto-Metadaten | Tampering | Metadaten nie in Prompt; nur Storage-Path (server-seitig gevalidiert) |
| API-Key Exfiltration via Error Logs | Information Disclosure | T-2-03-04 Pattern aus extract-vereinsregeln: CLAUDE_API_KEY nie in Fehlermeldungen |
| Budget-Exhaustion (DoS) | Denial of Service | Hard-Limit 200/Tag in Edge Function (authoritative); soft-limit 50 als Warnung |
| Path Traversal bei Storage-Download | Tampering | Storage-Path kommt aus ai_jobs.payload (server-seitig eingestellt via RPC) — nicht vom Client |
| Koordinaten-Manipulation bei plan_elements | Tampering | RLS is_garden_member auf INSERT/UPDATE; Client-Validierung via Zod |
| EXIF/GPS-Daten in Fotos | Information Disclosure | exifStrip bereits implementiert (PHOTO-05 / NFR-05); Opt-in fuer GPS |

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| expo-image-picker war separates Package | Jetzt in Expo SDK eingebettet, eigene Version ~16.1.4 fuer SDK 53 | SDK 50+ | Einfachere Installation |
| Claude Vision nur per base64 | Files API fuer grosse Dateien empfohlen | files-api-2025-04-14 | Kleinere Request-Payloads, Wiederverwendbarkeit |
| Koordinaten in Pixeln | Garten-Meter als kanonisches System (EDIT-06) | Phase 5 Planung | Phase-4-Prompt muss Meter-Output erzwingen |
| react-native-svg als primae Renderer | Skia fuer interaktiven Canvas (ab Phase 5) | Roadmap-Entscheidung 2026-04-21 | Phase 4 bleibt bei SVG; Skia erst Phase 5 |

**Deprecated/outdated:**
- `user_id` in ai_jobs: Migration 007 hat auf `created_by_user_id` umgestellt. Alter Mock-Code in ai-job-consumer Zeile 42 muss aktualisiert werden.
- Mock-Block in ai-job-consumer Zeile 46–49: Dieser Block ist explizit als Phase-1-Placeholder markiert und muss vollstaendig ersetzt werden.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Claude gibt kein natives Konfidenz-Score zurueck — `confidence` muss via Prompt-Instruktion erzwungen werden | Architecture Patterns §4 | Wenn Claude doch Konfidenz-Metadaten liefert, kann die Darstellung praeziser gemacht werden. Kein Blocker. |
| A2 | Budget-Zaehlung per `garden_id` (nicht per `user_id`) | Architecture Patterns §6 | Wenn per user_id gezaehlt werden soll, muss der Zaehler angepasst werden. Sicherere Option: beides anbieten (ODER-Verknuepfung der Limits). |
| A3 | pg_cron + net-Extension auf Supabase-Projekt aktiv | Open Questions §1 | Falls nicht aktiv: Client-HTTP-Trigger als Fallback (funktional, aber weniger robust) |
| A4 | Files-API-Beta-Header gilt auch fuer Image-Files | Open Questions §2 | Falls nicht: base64-Encoding nutzen (simpler, kein Files-API-Upload noetig) |
| A5 | react-native-svg (transitiv) auf Web in Expo 53 ohne zusaetzliche Konfiguration | Open Questions §3 | Falls nicht: SVG-Image-Tags als Fallback fuer Web, oder web-spezifische SVG-Komponente |
| A6 | Claude Vision kann Positionen in Garten-Metern korrekt schaetzen | Open Questions §4 / Pitfall 4 | Groesstes Risiko: Koordinaten koennen unzuverlaessig sein. Mitigierung: Test-Harness-Task in Wave 1; fallback ist manuelle Positionierung in Phase 5 |

---

## Sources

### Primary (HIGH confidence)
- [VERIFIED: codebase] `supabase/functions/ai-job-consumer/index.ts` — Mock-Block Zeile 46-49, ai_jobs Schema-Nutzung
- [VERIFIED: codebase] `supabase/functions/extract-vereinsregeln/index.ts` — Files-API-Pattern, Claude-Call-Pattern
- [VERIFIED: codebase] `app/src/lib/photos/PhotoUploader.ts` + `photoQueueRepo.ts` — Photo-Lifecycle
- [VERIFIED: codebase] `supabase/migrations/20260416000001_foundation.sql` — ai_jobs + ai_results Schema
- [VERIFIED: codebase] `supabase/migrations/20260423000007_ai_jobs_created_by_isolation.sql` — created_by_user_id Rename
- [VERIFIED: codebase] `supabase/migrations/20260424000013_offline_sync_infrastructure.sql` — enqueue_photo_analysis RPC, photo_queue Schema
- [VERIFIED: npm registry] expo-image-manipulator 55.0.15 — current version confirmed
- [VERIFIED: npm registry] expo-image-picker 55.0.19 — current version confirmed
- [CITED: platform.claude.com/docs/en/build-with-claude/vision] — Image-Limits, Token-Kosten, API-Struktur fuer Bilder

### Secondary (MEDIUM confidence)
- [CITED: platform.claude.com/docs/en/about-claude/models/overview] — claude-sonnet-4-6 als aktuelles Standard-Modell bestaetigt via WebSearch
- [VERIFIED: codebase] `.planning/STATE.md` Zeile 143 — Claude Vision quality risk fuer deutsche Kleingaerten ist MEDIUM

### Tertiary (LOW confidence)
- A1-A6 in Assumptions Log: alle als [ASSUMED] markiert

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — alle kritischen Packages verifiziert (npm + codebase)
- Architecture: HIGH — bestehendes Photo-Lifecycle-Muster vollstaendig im Code verifiziert
- Claude Vision Prompt/Output: MEDIUM — Konfidenz-Output und Koordinaten-Guete sind angenommene Verhaltensweisen
- Pitfalls: HIGH — alle identifizierten Fallstricke aus tatsaechlichem Code abgeleitet

**Research date:** 2026-05-03
**Valid until:** 2026-06-01 (30 Tage; Anthropic SDK-Versionen koennen sich aendern)
