// Phase 2 Vereinsregeln-Konstanten
// Source: 02-01-PLAN.md Task 2-01-01 + 02-RESEARCH.md §"BKleingG-Grundregeln"
// Mirror-Pattern: archetypes.ts (constant-array + derived-type)
import type { VereinsregelChecklistItem } from '../types/domain';

// ── BKleingG-Grundregeln (pflichtfeld, nicht-löschbar) ────────────────
// Quelle: Bundeskleingartengesetz (BKleingG) §1, §3 (RULES-04)
export const BKLEINGG_REGELN: VereinsregelChecklistItem[] = [
  {
    id: 'bkleingg_one_third',
    label: 'Mind. 1/3 Nutzgartenanteil',
    istBKleingG: true,
    pflichtfeld: true,
  },
  {
    id: 'bkleingg_no_hochstamm',
    label: 'Hochstämme verboten',
    istBKleingG: true,
    pflichtfeld: true,
  },
  {
    id: 'bkleingg_laube_max',
    label: 'Max. 24 m² Laube (inkl. überdachter Freisitz)',
    defaultWert: 24,
    einheit: 'm²',
    istBKleingG: true,
    pflichtfeld: true,
  },
];

// ── Standard-Checkliste für Vereinsregeln (D-09) ──────────────────────
// 10-15 Einträge — deckt typische Vereinssatzungen ab.
// Jeder Eintrag ist istBKleingG: false, pflichtfeld: false — Nutzer wählt aus.
export const STANDARD_VEREINSREGELN_CHECKLIST: VereinsregelChecklistItem[] = [
  {
    id: 'heckenhoehe',
    label: 'Maximale Heckenhöhe',
    defaultWert: 120,
    einheit: 'cm',
    istBKleingG: false,
    pflichtfeld: false,
  },
  {
    id: 'wasseranschluss',
    label: 'Wasseranschluss-Pflicht',
    istBKleingG: false,
    pflichtfeld: false,
  },
  {
    id: 'kompost',
    label: 'Kompost-Pflicht',
    istBKleingG: false,
    pflichtfeld: false,
  },
  {
    id: 'pestizid_verbot',
    label: 'Pestizid-Verbot',
    istBKleingG: false,
    pflichtfeld: false,
  },
  {
    id: 'mindestabstand_weg',
    label: 'Mindestabstand zu Wegen',
    defaultWert: 50,
    einheit: 'cm',
    istBKleingG: false,
    pflichtfeld: false,
  },
  {
    id: 'tierhaltung',
    label: 'Erlaubte Tierhaltung (z.B. Bienen, Kleintiere)',
    istBKleingG: false,
    pflichtfeld: false,
  },
  {
    id: 'sonnruhe',
    label: 'Sonn-/Feiertagsruhe (keine motorisierten Geräte)',
    istBKleingG: false,
    pflichtfeld: false,
  },
  {
    id: 'vereinsbeitrag',
    label: 'Vereinsbeitrag-Hinweis',
    istBKleingG: false,
    pflichtfeld: false,
  },
  {
    id: 'schliesstage',
    label: 'Schließtage-Regelung',
    istBKleingG: false,
    pflichtfeld: false,
  },
  {
    id: 'gemeinschaftsarbeit',
    label: 'Gemeinschaftsarbeit-Pflicht (Stunden pro Jahr)',
    defaultWert: 10,
    einheit: 'h/Jahr',
    istBKleingG: false,
    pflichtfeld: false,
  },
  {
    id: 'erlaubte_baumarten',
    label: 'Erlaubte Baumarten / Obstgehölze',
    istBKleingG: false,
    pflichtfeld: false,
  },
  {
    id: 'grillregel',
    label: 'Grill-/Feuerregelung',
    istBKleingG: false,
    pflichtfeld: false,
  },
];
