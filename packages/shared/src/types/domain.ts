// Phase 2 Domain Types — Auth, Profile & Vereinsregeln
// Source: 02-RESEARCH.md §"Domain Types" (verbatim)
import type { Klimazone } from '../constants/klimazonen';
import type { Archetype } from '../constants/archetypes';

export interface UserProfile {
  userId: string; // Supabase UID (Account) oder lokale UUID (Lokal)
  mode: 'account' | 'local';
  plz: string | null;
  klimazone: Klimazone | null;
  archetype: Archetype | null;
  createdAt: string;
  updatedAt: string;
}

export type VereinsregelSource = 'pdf_extraction' | 'checklist' | 'manual';

export interface VereinsRegel {
  id: string;
  titel: string;
  beschreibung?: string;
  wert?: number; // numerischer Grenzwert (z.B. 120 für 120cm Hecke)
  einheit?: string; // 'cm', 'm²', etc.
  istBKleingG: boolean; // Grundregel — nicht löschbar/deaktivierbar
  aktiv: boolean;
  source: VereinsregelSource;
}

// Für Checklisten-Alternative (D-09)
export interface VereinsregelChecklistItem {
  id: string;
  label: string; // "Maximale Heckenhöhe"
  defaultWert?: number;
  einheit?: string; // "cm"
  istBKleingG: boolean;
  pflichtfeld: boolean;
}
