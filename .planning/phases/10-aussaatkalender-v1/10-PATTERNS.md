# Phase 10: Aussaatkalender v1 — Pattern Map

**Mapped:** 2026-06-11
**Files analyzed:** 9 (new/modified)
**Analogs found:** 9 / 9

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `packages/shared/src/lib/kalenderEngine.ts` | utility/lib | transform | `packages/shared/src/constants/klimazonen.ts` | role-match (pure TS constants + exported functions) |
| `packages/shared/src/lib/__tests__/kalenderEngine.test.ts` | test | transform | `packages/shared/src/__tests__/klimazonen.test.ts` | exact |
| `app/src/hooks/useKalenderData.ts` | hook | request-response | `app/src/hooks/useCompanionDetection.ts` | exact (same pattern: usePlants + store + useMemo chain) |
| `app/src/components/kalender/KalenderWochenCard.tsx` | component | request-response | `app/src/components/VereinsregelRow.tsx` + `InlineBanner.tsx` | role-match |
| `app/src/components/kalender/GanttStreifen.tsx` | component | transform | `app/src/components/VereinsregelRow.tsx` (View-based list row) | role-match |
| `app/src/components/kalender/GanttLegende.tsx` | component | transform | `app/src/components/ui/badge.tsx` (color-dot rows) | partial |
| `app/src/components/kalender/FruchtfolgeWarnung.tsx` | component | request-response | `app/src/components/InlineBanner.tsx` | exact (thin wrapper) |
| `app/src/components/kalender/PflanzenKalenderZeile.tsx` | component | request-response | `app/src/components/VereinsregelRow.tsx` | exact (Pressable row + min-h-[44px]) |
| `app/app/(app)/kalender/index.tsx` | screen/route | request-response | `app/app/(app)/index.tsx` | exact (ScrollView + loading state + Button navigation) |
| `app/app/(app)/kalender/[slug].tsx` | screen/route | request-response | `app/app/(app)/profile/vereinsregeln/index.tsx` | role-match (Stack + ScrollView sections) |
| `packages/shared/src/i18n/de.json` (modified) | config | — | self (extend existing `kalender: {}` key) | — |
| `packages/shared/src/__tests__/i18n.kalender.test.ts` | test | — | `packages/shared/src/__tests__/i18n.test.ts` | exact |

---

## Pattern Assignments

### `packages/shared/src/lib/kalenderEngine.ts` (utility/lib, transform)

**Analog:** `packages/shared/src/constants/klimazonen.ts`

**Imports pattern** (lines 1–11 of klimazonen.ts):
```typescript
// No React imports — pure TypeScript module.
// Export const tables + pure functions only.
export const KLIMAZONEN = [1, 2, 3, 4, 5, 6, 7] as const;
export type Klimazone = (typeof KLIMAZONEN)[number];
```

**Core pattern — const table + pure exported functions** (klimazonen.ts lines 14–86):
```typescript
// 1. Declare typed const table at module top
const SOME_TABLE: Record<number, number> = { 1: 66, 2: 76, ... };

// 2. Pure helper functions (not exported unless needed externally)
function helperFn(input: number): number { ... }

// 3. Exported API functions — simple, deterministic, testable in Node
export function exportedFn(arg: SomeType): ResultType { ... }
```

**What to copy for kalenderEngine.ts:**
- Module structure: const tables at top, unexported helpers, exported API functions
- No React/RN imports at all — pure TypeScript
- `Klimazone` type already exported from klimazonen.ts — import it: `import type { Klimazone } from '../constants/klimazonen';`
- `PlantRow` type import: `import type { PlantRow } from '../types/plants';`
- Guard pattern from klimazonen.ts `lookupKlimazone` (line 80): `if (!/regex/.test(input)) return null;` → adapt to: `if (!LAST_FROST_DOY[zone]) return BASE_LAST_FROST;`
- DOY clamp: `Math.max(1, Math.min(365, rawDoy))` — put in `addWindow` helper

**Full engine structure** (from RESEARCH.md Muster 1, use as-is):
```typescript
// packages/shared/src/lib/kalenderEngine.ts
import type { PlantRow } from '../types/plants';

export type AktionsTyp = 'Vorkultur' | 'Direktsaat' | 'Auspflanzen' | 'Ernte';

export interface KalenderFenster {
  typ: AktionsTyp;
  startDoy: number;
  endDoy: number;
  startKw: number;
  endKw: number;
}

const LAST_FROST_DOY: Record<number, number> = {
  1: 66, 2: 76, 3: 86, 4: 96, 5: 106, 6: 116, 7: 126,
};
const BASE_ZONE = 4;
const BASE_LAST_FROST = LAST_FROST_DOY[BASE_ZONE];

function zoneOffset(klimazone: number): number {
  return (LAST_FROST_DOY[klimazone] ?? BASE_LAST_FROST) - BASE_LAST_FROST;
}

function doyToIsoKw(doy: number, year = new Date().getFullYear()): number { ... }

export function getFensterFuerPflanze(plant: Pick<PlantRow, ...>, klimazone: number): KalenderFenster[] { ... }
export function getAktuelleKw(): number { ... }
export function filterAktiveAktionen(fenster: KalenderFenster[], kw: number): KalenderFenster[] { ... }
export function findBeeteForPlant(elements: PlanElementRow[], plantSlug: string): PlanElementRow[] { ... }
export function pruefeEinfacheFruchtfolge(...): { warnung: boolean; grund: string | null } { ... }
```

**Security guard** (RESEARCH.md §Security):
```typescript
// Input validation for klimazone — always guard before table lookup
function zoneOffset(klimazone: number): number {
  if (!klimazone || klimazone < 1 || klimazone > 7) return 0; // fallback Zone 4 (offset 0)
  return (LAST_FROST_DOY[klimazone] ?? BASE_LAST_FROST) - BASE_LAST_FROST;
}
```

---

### `packages/shared/src/lib/__tests__/kalenderEngine.test.ts` (test, transform)

**Analog:** `packages/shared/src/__tests__/klimazonen.test.ts`

**Test file structure** (klimazonen.test.ts lines 1–40):
```typescript
// TDD RED — tests for [module name]
// Expectations per [plan reference]
import { exportedFn, EXPORTED_CONST, ExportedType } from '../path/to/module';

describe('kalenderEngine', () => {
  it('describes a specific behavior', () => {
    expect(actual).toBe(expected);
  });
});
```

**Spot-check pattern** (klimazonen.test.ts lines 10–16):
```typescript
it('lookupKlimazone("12043") resolves to Klimazone 4', () => {
  expect(lookupKlimazone('12043')).toBe(4);
});
```
Adapt for kalenderEngine:
```typescript
it('Tomate Zone 4: sowIndoor startet KW 9, Auspflanzen KW 19, Ernte KW 29', () => {
  const result = getFensterFuerPflanze(tomateMock, 4);
  const vorkultur = result.find(f => f.typ === 'Vorkultur');
  expect(vorkultur?.startKw).toBe(9);
});

it('Zone 1 fenster beginnen ~4 KW früher als Zone 7', () => {
  const zone1 = getFensterFuerPflanze(tomateMock, 1);
  const zone7 = getFensterFuerPflanze(tomateMock, 7);
  const diff = zone7[0].startKw - zone1[0].startKw;
  expect(diff).toBeGreaterThanOrEqual(4);
});
```

**Range-guard test pattern** (klimazonen.test.ts line 23):
```typescript
it('lookupKlimazone rejects invalid format', () => {
  expect(lookupKlimazone('123')).toBeNull();
});
// Adapt:
it('getFensterFuerPflanze with invalid klimazone (0) falls back gracefully', () => {
  expect(() => getFensterFuerPflanze(tomateMock, 0)).not.toThrow();
});
```

---

### `app/src/hooks/useKalenderData.ts` (hook, request-response)

**Analog:** `app/src/hooks/useCompanionDetection.ts`

**Imports pattern** (useCompanionDetection.ts lines 7–13):
```typescript
import * as React from 'react';
import { useEditorStore } from '../stores/editorStore';
import { usePlants } from './usePlants';
import plantsBundle from '@spatenstich/shared/data/plants';
import type { PlanElementRow, PlantRow, PlantDbBundle } from '@spatenstich/shared';
import { pointInPolygon, type Point2D } from '../lib/geometry/bedLayout';
```
Adapt for useKalenderData.ts:
```typescript
import * as React from 'react';
import { useEditorStore } from '../stores/editorStore';
import { useProfileStore } from '../stores/profileStore';
import { usePlants } from './usePlants';
import type { PlanElementRow } from '@spatenstich/shared';
import {
  getFensterFuerPflanze,
  filterAktiveAktionen,
  getAktuelleKw,
  type KalenderFenster,
} from '@spatenstich/shared/lib/kalenderEngine'; // or relative path
```

**Store selector pattern** (useCompanionDetection.ts lines 283–284):
```typescript
const { data: plants = [] } = usePlants();
const elements = useEditorStore((s) => s.elements);
```
Add for useKalenderData.ts:
```typescript
const klimazone = useProfileStore((s) => s.klimazone);
```

**useMemo chain pattern** (useCompanionDetection.ts lines 285–307):
```typescript
const plantBySlug = React.useMemo(
  () => new Map(plants.map((p) => [p.slug, p])),
  [plants],
);

const conflictElementIds = React.useMemo(
  () => computeConflicts(elements, plantBySlug, companionMap),
  [elements, plantBySlug, companionMap],
);
```
Adapt for useKalenderData.ts (from RESEARCH.md Muster 2):
```typescript
const meinePflanzenslugs = React.useMemo(() => {
  return new Set(
    elements
      .filter(e => e.elementType === 'Pflanze' && e.deletedAt === null)
      .map(e => (e.provenance as any)?.plantSlug as string)
      .filter(Boolean)
  );
}, [elements]);

const aktuelleKw = React.useMemo(() => getAktuelleKw(), []);

const wochenAktionen = React.useMemo(() => {
  if (!plants || !klimazone) return [];
  // ...
}, [plants, klimazone, meinePflanzenslugs, aktuelleKw]);
```

**plantSlug extraction pattern** (useCompanionDetection.ts lines 116–119):
```typescript
function getPlantSlug(el: PlanElementRow): string | null {
  const prov = el.provenance as Record<string, unknown> | null;
  if (!prov || typeof prov.plantSlug !== 'string') return null;
  return prov.plantSlug;
}
```
Copy verbatim into useKalenderData.ts as internal helper.

**null-guard return** (Fallstrick 2 in RESEARCH.md): Return empty array when `klimazone == null` — use same early-return pattern as companion hook's null checks.

---

### `app/src/components/kalender/KalenderWochenCard.tsx` (component, request-response)

**Analog:** `app/src/components/InlineBanner.tsx` (Card wrapper) + `app/src/components/ui/card.tsx` (Card primitive)

**Imports pattern** (InlineBanner.tsx lines 1–8):
```typescript
import * as React from 'react';
import { View, Pressable, Text } from 'react-native';
import { AlertCircle, AlertTriangle, CheckCircle, X } from 'lucide-react-native';
import { cn } from '@/src/lib/utils';
```
Adapt for KalenderWochenCard.tsx:
```typescript
import * as React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import de from '@spatenstich/shared/i18n/de';
import { Badge } from '@/src/components/ui/badge';
import type { KalenderFenster } from '@spatenstich/shared/lib/kalenderEngine';
import type { PlantRow } from '@spatenstich/shared';
```

**i18n pattern** (index.tsx lines 15–16):
```typescript
const t = (key: string): string =>
  key.split('.').reduce<any>((o, k) => (o ? o[k] : undefined), de as any) ?? key;
```
Copy verbatim to all new screen/component files.

**Props interface + JSX.Element return type** (InlineBanner.tsx lines 10–17, VereinsregelRow.tsx lines 14–20):
```typescript
export interface KalenderWochenCardProps {
  aktionen: Array<{ plant: PlantRow; fenster: KalenderFenster }>;
  aktuelleKw: number;
  onPlantPress: (slug: string) => void;
}

export function KalenderWochenCard({ aktionen, aktuelleKw, onPlantPress }: KalenderWochenCardProps): React.JSX.Element {
```

**Card visual pattern** (UI-SPEC §Screen 1):
```typescript
// Outer: Card from ui/card.tsx; inner rows: Pressable with min-h-[44px]
<View className="bg-stone-200 dark:bg-stone-800 rounded-xl p-4">
  <View className="flex-row justify-between items-center mb-3">
    <Text className="text-xl font-semibold text-stone-900 dark:text-stone-50">
      {t('kalender.dieseWoche')}
    </Text>
    <Text className="text-xs text-stone-400">{t('kalender.kwLabel', { kw: aktuelleKw, year })}</Text>
  </View>
  {aktionen.map(({ plant, fenster }) => (
    <Pressable
      key={`${plant.slug}-${fenster.typ}`}
      onPress={() => onPlantPress(plant.slug)}
      accessibilityRole="button"
      className="flex-row items-center gap-2 min-h-[44px]"
    >
      <Badge style={{ backgroundColor: FARBEN[fenster.typ] }}>
        <Text className="text-xs text-white">{t(`kalender.legende.${fenster.typ.toLowerCase()}`)}</Text>
      </Badge>
      <Text className="text-sm text-stone-800 dark:text-stone-100">{plant.nameDe}</Text>
    </Pressable>
  ))}
</View>
```

---

### `app/src/components/kalender/GanttStreifen.tsx` (component, transform)

**Analog:** `app/src/components/VereinsregelRow.tsx` (View-based layout row)

**Imports pattern** (VereinsregelRow.tsx lines 9–13):
```typescript
import * as React from 'react';
import { View, Switch, Pressable, Text } from 'react-native';
import { Lock, Pencil, Trash2 } from 'lucide-react-native';
import type { VereinsRegel } from '@spatenstich/shared';
```
Adapt for GanttStreifen.tsx:
```typescript
import * as React from 'react';
import { View } from 'react-native';
import type { PlantRow } from '@spatenstich/shared';
import type { AktionsTyp, KalenderFenster } from '@spatenstich/shared/lib/kalenderEngine';
import { getFensterFuerPflanze } from '@spatenstich/shared/lib/kalenderEngine';
```

**Core View-based rendering pattern** (RESEARCH.md Muster 3 — use verbatim):
```typescript
const TOTAL_KW = 52;
const FARBEN: Record<AktionsTyp, string> = {
  'Vorkultur':   '#A78BFA',
  'Direktsaat':  '#34D399',
  'Auspflanzen': '#60A5FA',
  'Ernte':       '#FB923C',
};

export function GanttStreifen({
  plant,
  klimazone,
  height = 20,
}: {
  plant: PlantRow;
  klimazone: number;
  height?: number;
}): React.JSX.Element {
  const fenster = getFensterFuerPflanze(plant, klimazone);
  return (
    <View
      style={{ flexDirection: 'row', height, backgroundColor: '#E5E7EB', borderRadius: 4 }}
      accessibilityLabel={`Gantt-Diagramm für ${plant.nameDe}`}
    >
      {fenster.map((f, i) => {
        const clampedStart = Math.max(1, f.startKw);
        const clampedEnd = Math.min(TOTAL_KW, f.endKw);
        const left = ((clampedStart - 1) / TOTAL_KW) * 100;
        const width = ((clampedEnd - clampedStart + 1) / TOTAL_KW) * 100;
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: `${left}%`,
              width: `${width}%`,
              height: '100%',
              backgroundColor: FARBEN[f.typ],
              borderRadius: 3,
            }}
          />
        );
      })}
    </View>
  );
}
```
**Note:** `height` prop allows reuse for Miniatur-Gantt (8px) in PflanzenKalenderZeile vs. full Gantt (20px) in Detail screen.

---

### `app/src/components/kalender/GanttLegende.tsx` (component, transform)

**Analog:** `app/src/components/InlineBanner.tsx` (color dot + label pattern)

**Imports pattern:**
```typescript
import * as React from 'react';
import { View, Text } from 'react-native';
import de from '@spatenstich/shared/i18n/de';
```

**Color dot + label row** (UI-SPEC §Gantt-Rendering-Kontrakt):
```typescript
const LEGENDE_ITEMS = [
  { typ: 'Vorkultur',   farbe: '#A78BFA', key: 'kalender.legende.vorkultur'   },
  { typ: 'Direktsaat',  farbe: '#34D399', key: 'kalender.legende.direktsaat'  },
  { typ: 'Auspflanzen', farbe: '#60A5FA', key: 'kalender.legende.auspflanzen' },
  { typ: 'Ernte',       farbe: '#FB923C', key: 'kalender.legende.ernte'       },
] as const;

export function GanttLegende(): React.JSX.Element {
  return (
    <View className="flex-row flex-wrap gap-x-3 gap-y-1">
      {LEGENDE_ITEMS.map(item => (
        <View key={item.typ} className="flex-row items-center gap-1">
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: item.farbe }} />
          <Text className="text-xs text-stone-600 dark:text-stone-300">{t(item.key)}</Text>
        </View>
      ))}
    </View>
  );
}
```

---

### `app/src/components/kalender/FruchtfolgeWarnung.tsx` (component, request-response)

**Analog:** `app/src/components/InlineBanner.tsx` — this is a thin wrapper, copy the usage pattern.

**Imports pattern** (InlineBanner.tsx lines 1–8):
```typescript
import * as React from 'react';
import { InlineBanner } from '../InlineBanner';
```

**Component (thin wrapper):**
```typescript
export interface FruchtfolgeWarnungProps {
  grund: string;
  onDismiss?: () => void;
}

export function FruchtfolgeWarnung({ grund, onDismiss }: FruchtfolgeWarnungProps): React.JSX.Element {
  return (
    <InlineBanner
      variant="warning"
      message={grund}
      onDismiss={onDismiss}
      testID="fruchtfolge-warnung"
    />
  );
}
```
Render nothing when `grund` is empty/null — guard at call site, not inside this component.

---

### `app/src/components/kalender/PflanzenKalenderZeile.tsx` (component, request-response)

**Analog:** `app/src/components/VereinsregelRow.tsx` — exact match: Pressable row, min-h-[44px], accessibilityRole, icon/label/action.

**Imports pattern** (VereinsregelRow.tsx lines 9–13):
```typescript
import * as React from 'react';
import { View, Pressable, Text } from 'react-native';
import type { PlantRow } from '@spatenstich/shared';
import { GanttStreifen } from './GanttStreifen';
```

**Pressable row pattern** (VereinsregelRow.tsx lines 52–58):
```typescript
<Pressable
  onPress={() => onPress(plant.slug)}
  accessibilityRole="button"
  accessibilityLabel={`${plant.nameDe}, Kalenderdetails öffnen`}
  className="flex-row items-center gap-3 py-2 px-0 min-h-[44px]"
  testID={testID}
>
  <View className="flex-1">
    <Text className="text-sm font-semibold text-stone-800 dark:text-stone-100">
      {plant.nameDe}
    </Text>
  </View>
  <View className="w-32">  {/* fixed width for Miniatur-Gantt */}
    <GanttStreifen plant={plant} klimazone={klimazone} height={8} />
  </View>
</Pressable>
```

---

### `app/app/(app)/kalender/index.tsx` (screen/route, request-response)

**Analog:** `app/app/(app)/index.tsx` — exact match: loading guard, ScrollView, Button navigation, t() pattern.

**Imports pattern** (index.tsx lines 1–13):
```typescript
import * as React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import de from '@spatenstich/shared/i18n/de';
import { Button } from '@/src/components/ui/button';
import { InlineBanner } from '@/src/components/InlineBanner';
import { useProfileStore } from '@/src/stores/profileStore';
import { useKalenderData } from '@/src/hooks/useKalenderData';
import { KalenderWochenCard } from '@/src/components/kalender/KalenderWochenCard';
import { PflanzenKalenderZeile } from '@/src/components/kalender/PflanzenKalenderZeile';
```

**i18n pattern** (index.tsx lines 15–16):
```typescript
const t = (key: string): string =>
  key.split('.').reduce<any>((o, k) => (o ? o[k] : undefined), de as any) ?? key;
```

**Loading state pattern** (index.tsx lines 59–64):
```typescript
if (loading) {
  return (
    <View className="flex-1 items-center justify-center bg-[#F9F7F4] dark:bg-[#1C1917]">
      <Text className="text-stone-500">...</Text>
    </View>
  );
}
```

**Stack.Screen header** (plan/index.tsx line 11 + _layout.tsx pattern):
```typescript
<Stack.Screen options={{ headerTitle: t('kalender.title') }} />
```

**Screen skeleton** (index.tsx lines 74–114):
```typescript
return (
  <View className="flex-1 bg-[#F9F7F4] dark:bg-[#1C1917]">
    <Stack.Screen options={{ headerTitle: t('kalender.title') }} />
    <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
      {klimazone == null && (
        <InlineBanner
          variant="warning"
          message={t('kalender.plzFehlt')}
          actionLabel={t('kalender.plzJetztEingeben')}
          onAction={() => router.push('/(app)/profile/plz' as any)}
        />
      )}
      {/* Filter-Chip */}
      {/* KalenderWochenCard */}
      {/* Pflanzenliste */}
    </ScrollView>
  </View>
);
```

**Button navigation pattern** (index.tsx lines 92–101):
```typescript
<Button
  variant="outline"
  onPress={() => router.push('/(app)/kalender' as any)}
  className="mt-4 w-full"
  testID="home-kalender-button"
>
  <Text className="font-semibold text-stone-700 dark:text-stone-200">
    {t('kalender.title')}
  </Text>
</Button>
```

**Filter-Chip toggle pattern** (UI-SPEC §Filter-Chip-Kontrakt):
```typescript
const [nurMeinePflanzen, setNurMeinePflanzen] = React.useState(
  meinePflanzenslugs.size > 0
);
// Chip:
<Pressable
  onPress={() => setNurMeinePflanzen(v => !v)}
  accessibilityRole="checkbox"
  accessibilityState={{ checked: nurMeinePflanzen }}
  className={nurMeinePflanzen
    ? 'bg-[#4A7C59] rounded-full px-3 py-1'
    : 'border border-stone-300 dark:border-stone-700 rounded-full px-3 py-1'
  }
>
  <Text className={nurMeinePflanzen ? 'text-xs text-white font-semibold' : 'text-xs text-stone-700'}>
    {t('kalender.filterMeinePflanzen')}
  </Text>
</Pressable>
```

---

### `app/app/(app)/kalender/[slug].tsx` (screen/route, request-response)

**Analog:** `app/app/(app)/profile/vereinsregeln/index.tsx` — ScrollView with sections, Stack header with dynamic title.

**Imports pattern** (vereinsregeln/index.tsx lines 1–13):
```typescript
import * as React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import de from '@spatenstich/shared/i18n/de';
import { usePlants } from '@/src/hooks/usePlants';
import { useEditorStore } from '@/src/stores/editorStore';
import { useProfileStore } from '@/src/stores/profileStore';
import { Button } from '@/src/components/ui/button';
import { InlineBanner } from '@/src/components/InlineBanner';
import { GanttStreifen } from '@/src/components/kalender/GanttStreifen';
import { GanttLegende } from '@/src/components/kalender/GanttLegende';
import { FruchtfolgeWarnung } from '@/src/components/kalender/FruchtfolgeWarnung';
```

**Route params pattern** (Expo Router dynamic segment):
```typescript
const { slug } = useLocalSearchParams<{ slug: string }>();
```

**Dynamic Stack.Screen title** (UI-SPEC §Navigation-Kontrakt):
```typescript
<Stack.Screen options={{ headerTitle: plant?.nameDe ?? slug }} />
```

**Sectioned ScrollView layout** (vereinsregeln/index.tsx lines 25–90):
```typescript
<ScrollView
  className="flex-1 bg-[#F9F7F4] dark:bg-[#1C1917]"
  contentContainerStyle={{ padding: 16, gap: 16 }}
>
  {/* Section 1: Gantt */}
  <View>
    <GanttStreifen plant={plant} klimazone={klimazone} height={20} />
    {/* Monats-Kürzel row */}
    <View className="flex-row justify-between mt-1">
      {MONATE.map(m => (
        <Text key={m} className="text-xs text-stone-400">{m}</Text>
      ))}
    </View>
    <GanttLegende />
  </View>

  {/* Section 2: Pflanzen-Infos */}
  <View>
    <Text className="text-sm text-stone-700">{t('kalender.detail.mindestabstand', { cm: plant.minSpacingCm })}</Text>
    {warnung && <FruchtfolgeWarnung grund={warnung.grund!} />}
  </View>

  {/* Section 3: Auf welchem Beet? */}
  <View>
    <Text className="text-sm font-semibold text-stone-600">{t('kalender.aufWelchemBeet')}</Text>
    {/* ... beet list ... */}
    {hasBeetImPlan ? (
      <Button variant="default" className="bg-[#4A7C59] mt-3" onPress={handleAddToPlan}>
        <Text className="text-white font-semibold">{t('kalender.zuPlanHinzufuegen')}</Text>
      </Button>
    ) : (
      <InlineBanner variant="warning" message={t('kalender.keinBeetImPlan')} />
    )}
    <Button variant="outline" className="mt-2" onPress={() => router.push('/(app)/plan' as any)}>
      <Text className="font-semibold text-stone-700">{t('kalender.planOeffnen')}</Text>
    </Button>
  </View>
</ScrollView>
```

---

### `packages/shared/src/i18n/de.json` (modified — extend existing)

**Pattern:** Add a top-level `"kalender"` key next to existing keys like `"auth"`, `"rules"`, `"profile"`.

**Existing key structure** (from i18n.test.ts — the file uses nested objects):
```json
{
  "common": { ... },
  "auth": { ... },
  "rules": { ... },
  "profile": { ... },
  "kalender": {
    "title": "Aussaatkalender",
    "kwLabel": "KW {kw} · {year}",
    "dieseWoche": "Diese Woche",
    "jahresuebersicht": "Alle Pflanzen (Jahresübersicht)",
    "filterMeinePflanzen": "Nur meine Pflanzen",
    "klimazoneLabel": "Klimazone: {zone} ({name})",
    "aufWelchemBeet": "Auf welchem Beet?",
    "zuPlanHinzufuegen": "Zu Plan hinzufügen",
    "planOeffnen": "Plan öffnen",
    "hinzugefuegtBanner": "{name} wurde dem Plan hinzugefügt",
    "nochNichtImPlan": "Noch nicht im Plan",
    "plzFehlt": "PLZ noch nicht gesetzt — Klimazone unbekannt.",
    "plzJetztEingeben": "Jetzt eingeben",
    "keinBeetImPlan": "Noch kein Beet im Plan — lege zuerst ein Beet im Plan-Editor an.",
    "legende": {
      "vorkultur": "Vorkultur",
      "direktsaat": "Direktsaat",
      "auspflanzen": "Auspflanzen",
      "ernte": "Ernte"
    },
    "detail": {
      "mindestabstand": "Mindestabstand: {cm} cm",
      "sonnenbedarf": "Sonnenbedarf: {value}",
      "familie": "Familie: {family}"
    }
  }
}
```

**Template variable convention** (from existing de.json usage in codebase): `{varName}` with simple `replace` or split/reduce — keep the same pattern as `{kw}`, `{year}`.

---

### `packages/shared/src/__tests__/i18n.kalender.test.ts` (test)

**Analog:** `packages/shared/src/__tests__/i18n.test.ts` — exact copy pattern.

**File header + import pattern** (i18n.test.ts lines 1–7):
```typescript
// Phase 10 assertions for de.json kalender.* keys
import deJson from '../i18n/de.json';
const de = deJson as unknown as Record<string, any>;

describe('de.json kalender keys', () => {
  it('kalender.title === "Aussaatkalender"', () => {
    expect(de['kalender']?.['title']).toBe('Aussaatkalender');
  });
  it('kalender.legende has all 4 Aktionstypen', () => {
    const l = de['kalender']?.['legende'];
    expect(l?.['vorkultur']).toBeTruthy();
    expect(l?.['direktsaat']).toBeTruthy();
    expect(l?.['auspflanzen']).toBeTruthy();
    expect(l?.['ernte']).toBeTruthy();
  });
});
```

---

## Shared Patterns

### i18n: `t()` Helper
**Source:** `app/app/(app)/index.tsx` lines 15–16 (replicated in every screen file)
**Apply to:** All new screen files (`kalender/index.tsx`, `kalender/[slug].tsx`) and component files that render user-visible text.
```typescript
const t = (key: string): string =>
  key.split('.').reduce<any>((o, k) => (o ? o[k] : undefined), de as any) ?? key;
```

### Touch Targets: min-h-[44px]
**Source:** `app/src/components/VereinsregelRow.tsx` line 35 (`min-h-[52px]`) and `InlineBanner.tsx` line 80 (`min-h-[44px] min-w-[44px]`)
**Apply to:** All Pressable elements in `PflanzenKalenderZeile`, `KalenderWochenCard` rows, Filter-Chip, Buttons.
```typescript
className="min-h-[44px] min-w-[44px] items-center justify-center"
```

### NativeWind className-only Styling
**Source:** All existing components — no `StyleSheet.create()`, no `variants`, only `className` strings.
**Apply to:** All new TSX components. Exception: Gantt bar positioning uses inline `style` for dynamic `%` values (not supported in NativeWind static classes).

### accessibilityRole on Pressables
**Source:** `app/src/components/InlineBanner.tsx` line 78, `VereinsregelRow.tsx` line 59.
**Apply to:** All Pressable elements.
```typescript
accessibilityRole="button"  // or "checkbox" for Filter-Chip
```

### Screen Background
**Source:** `app/app/(app)/index.tsx` lines 61, 76, 119.
**Apply to:** All new screen root Views.
```typescript
className="flex-1 bg-[#F9F7F4] dark:bg-[#1C1917]"
```

### plantSlug Null-Guard
**Source:** `app/src/hooks/useCompanionDetection.ts` lines 116–119.
**Apply to:** `useKalenderData.ts` element filtering, `[slug].tsx` PiP queries.
```typescript
function getPlantSlug(el: PlanElementRow): string | null {
  const prov = el.provenance as Record<string, unknown> | null;
  if (!prov || typeof prov.plantSlug !== 'string') return null;
  return prov.plantSlug;
}
```

### profileStore Klimazone Selector
**Source:** `app/src/stores/profileStore.ts` (referenced in `app/src/hooks/useProfile.ts` line 26)
**Apply to:** `useKalenderData.ts`, `kalender/index.tsx`, `kalender/[slug].tsx`
```typescript
const klimazone = useProfileStore((s) => s.klimazone); // Klimazone | null (1–7)
```

### Stack Navigation (no new tab)
**Source:** `app/app/(app)/_layout.tsx` — Stack with headerShown + headerRight SyncStatusBadge.
**Apply to:** `kalender/index.tsx` and `kalender/[slug].tsx` — they inherit the Stack from the existing `(app)/_layout.tsx`. Only `Stack.Screen options` needed inside each screen, no new layout file required.

---

## No Analog Found

No files in Phase 10 are without an analog. All new files map to existing patterns.

---

## Metadata

**Analog search scope:** `app/src/hooks/`, `app/src/components/`, `app/app/(app)/`, `packages/shared/src/`
**Files scanned:** 12 source files read
**Pattern extraction date:** 2026-06-11
