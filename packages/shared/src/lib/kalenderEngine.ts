// packages/shared/src/lib/kalenderEngine.ts
// Pure TypeScript — no React/RN imports.
// Phase 10 Plan 01: DOY→KW engine, klimazonenoffset, "diese Woche" filter, Fruchtfolge check.
// CAL-02 (klimazonen offset), CAL-03 (Vorkultur/Direktsaat/Auspflanzen/Ernte), CAL-06 (Fruchtfolge)
import type { PlantRow } from '../types/plants';

// ── Exported types ────────────────────────────────────────────────────────────

export type AktionsTyp = 'Vorkultur' | 'Direktsaat' | 'Auspflanzen' | 'Ernte';

export interface KalenderFenster {
  typ: AktionsTyp;
  startDoy: number;  // klimazonenkorrigiert, geklammert 1..365
  endDoy: number;    // klimazonenkorrigiert, geklammert 1..365
  startKw: number;   // ISO-Kalenderwoche, geklammert 1..53
  endKw: number;     // ISO-Kalenderwoche, geklammert 1..53
}

// ── Klimazonenoffset-Tabelle ──────────────────────────────────────────────────
// Frost-Daten Klimazone 1-7 (DWD-basiert, Zone 4 = Baseline)
// [ASSUMED: Werte auf Basis DWD-Heizgradtag-Zonen + landwirtschaftlicher Literatur]
const LAST_FROST_DOY: Record<number, number> = {
  1: 66, 2: 76, 3: 86, 4: 96, 5: 106, 6: 116, 7: 126,
};

const BASE_ZONE = 4;
const BASE_LAST_FROST = LAST_FROST_DOY[BASE_ZONE]!; // 96

// ── Private helpers ───────────────────────────────────────────────────────────

/**
 * Berechnet den DOY-Offset der Klimazone gegenüber Zone 4 (Baseline).
 * Security guard (T-10-01): ungültige Zone (null, 0, NaN, <1, >7) → 0 (Zone-4-Baseline).
 */
function zoneOffset(klimazone: number): number {
  if (!klimazone || klimazone < 1 || klimazone > 7) return 0;
  return (LAST_FROST_DOY[klimazone] ?? BASE_LAST_FROST) - BASE_LAST_FROST;
}

/**
 * Konvertiert einen Day-of-Year (DOY) in eine ISO-Kalenderwoche (1..53).
 * 6 Zeilen reine UTC-Arithmetik — kein date-fns/dayjs benötigt.
 * [VERIFIED: Eigentest 2026-06-11 — korrekte KW-Werte für DOY 1, 60, 130, 200, 365]
 * Spot-Checks: DOY 60 → KW 9, DOY 130 → KW 19, DOY 200 → KW 29
 */
function doyToIsoKw(doy: number, year: number = new Date().getFullYear()): number {
  const date = new Date(year, 0, doy);
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// ── Exported functions ────────────────────────────────────────────────────────

/**
 * Berechnet alle Kalender-Fenster für eine Pflanze in der gegebenen Klimazone.
 * Gibt die Fenster in der Reihenfolge Vorkultur → Direktsaat → Auspflanzen → Ernte zurück.
 * Fenster mit null-Bounds werden übersprungen.
 * DOY-Werte werden auf 1..365 geklammert (Fallstrick 1), KW auf 1..53 (Fallstrick 4).
 */
export function getFensterFuerPflanze(
  plant: Pick<PlantRow,
    | 'sowIndoorDoyStart' | 'sowIndoorDoyEnd'
    | 'sowOutdoorDoyStart' | 'sowOutdoorDoyEnd'
    | 'plantDoyStart' | 'plantDoyEnd'
    | 'harvestDoyStart' | 'harvestDoyEnd'
    | 'family' | 'slug'
  >,
  klimazone: number,
): KalenderFenster[] {
  const offset = zoneOffset(klimazone);
  const shift = (doy: number | null): number | null =>
    doy != null ? doy + offset : null;

  const windows: KalenderFenster[] = [];

  const addWindow = (
    typ: AktionsTyp,
    start: number | null,
    end: number | null,
  ): void => {
    if (start == null || end == null) return;
    // Fallstrick 1: DOY clamp 1..365
    const s = Math.max(1, Math.min(365, start));
    const e = Math.max(1, Math.min(365, end));
    // Fallstrick 4: KW clamp 1..53
    let startKw = Math.min(53, doyToIsoKw(s));
    let endKw = Math.min(53, doyToIsoKw(e));
    // WR-04: ISO-Wochen-Wrap normalisieren — Jahresgrenzen-Inversion reparieren.
    // doyToIsoKw() gibt die echte ISO-KW zurück, die an Jahresgrenzen wrappt:
    // Früh-Januar kann ISO-KW 52/53 des Vorjahres ergeben (startKw > endKw).
    // Spät-Dezember kann ISO-KW 1 des Folgejahres ergeben (endKw < startKw).
    // Lösung: Kantenpinning — invertiertes Fenster an Kalenderkante klammern.
    if (startKw > endKw) {
      if (s <= 7) startKw = 1;   // Früh-Januar → auf KW 1 pinnen
      if (e >= 359) endKw = 53;  // Spät-Dezember → auf KW 53 pinnen
    }
    windows.push({ typ, startDoy: s, endDoy: e, startKw, endKw });
  };

  addWindow('Vorkultur', shift(plant.sowIndoorDoyStart), shift(plant.sowIndoorDoyEnd));
  addWindow('Direktsaat', shift(plant.sowOutdoorDoyStart), shift(plant.sowOutdoorDoyEnd));
  addWindow('Auspflanzen', shift(plant.plantDoyStart), shift(plant.plantDoyEnd));
  addWindow('Ernte', shift(plant.harvestDoyStart), shift(plant.harvestDoyEnd));

  return windows;
}

/**
 * Gibt die aktuelle ISO-Kalenderwoche zurück (1..53).
 * WR-03: Optionaler `now`-Parameter für testbare Injektion; Default `new Date()` für Produktion.
 * Rückwärtskompatibel — bestehende no-arg-Aufrufer bleiben unverändert.
 * Fix: Direkte UTC-Arithmetik (wie in doyToIsoKw) — vermeidet den DOY-Umweg sowie
 * DST-bedingte Rundungsfehler, die Math.ceil/-floor beim Local-Zeit-Diff verursachen.
 */
export function getAktuelleKw(now: Date = new Date()): number {
  // Lokale Datumskomponenten in UTC umwandeln, um DST-Drift zu eliminieren
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = d.getUTCDay() || 7; // 1=Mo..7=So (ISO-Wochentag)
  d.setUTCDate(d.getUTCDate() + 4 - dayNum); // auf nächsten Donnerstag verschieben
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.min(53, Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7));
}

/**
 * Filtert Kalender-Fenster auf diejenigen, die die gegebene Kalenderwoche enthalten.
 */
export function filterAktiveAktionen(
  fenster: KalenderFenster[],
  kw: number,
): KalenderFenster[] {
  return fenster.filter(f => kw >= f.startKw && kw <= f.endKw);
}

/**
 * Prüft eine einfache Single-Season-Fruchtfolge:
 * Gibt { warnung: true, grund } zurück, wenn im Beet bereits eine Pflanze
 * der gleichen Familie (aber anderen Slugs) steht.
 * Ignoriert den gleichen Slug (Selbst-Check) — kein Selbst-Konflikt.
 * CAL-06 (Phase 10 = Single-Season-Family-Check; Multi-Year → Phase 15).
 */
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
