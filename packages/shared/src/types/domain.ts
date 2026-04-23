// Phase 2 + 2.5 Domain Types — Auth, Profile, Vereinsregeln, Shared Garden
// Phase 2.5 pivot: plz/klimazone/archetype moved from UserProfile → Garden (D-01).
// Lokal-mode preserves original fields via LocalProfile (D-13: lokal-mode has no garden concept).
import type { Klimazone } from '../constants/klimazonen';
import type { Archetype } from '../constants/archetypes';

// ── Auth / Profile (Account-Scope, post-pivot) ────────────────────────────
export interface UserProfile {
  userId: string;
  mode: 'account' | 'local';
  displayName: string | null; // D-05: user-visible name for "zuletzt bearbeitet von"-label
  createdAt: string;
  updatedAt: string;
}

// Lokal-Modus behält PLZ/Klima/Archetyp direkt am Profil (kein Garten-Scope in lokal).
export interface LocalProfile extends UserProfile {
  mode: 'local';
  plz: string | null;
  klimazone: Klimazone | null;
  archetype: Archetype | null;
}

// ── Shared Garden (Phase 2.5) ────────────────────────────────────────────
export interface Garden {
  id: string;
  name: string;
  plz: string | null;
  klimazone: Klimazone | null;
  archetype: Archetype | null;
  createdByUserId: string | null;
  updatedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type GardenRole = 'owner' | 'member';

export interface GardenMember {
  gardenId: string;
  userId: string;
  role: GardenRole;
  joinedAt: string;
  // Optional displayName when joined with profiles (gardenRepo.getMembers populates this)
  displayName?: string | null;
}

export interface InviteCode {
  id: string;
  gardenId: string;
  code: string;
  createdByUserId: string;
  consumedAt: string | null;
  consumedByUserId: string | null;
  expiresAt: string;
  createdAt: string;
}

// ── Vereinsregeln (Phase 2 — unchanged, but now garden-scoped in DB; types bleiben) ──
export type VereinsregelSource = 'pdf_extraction' | 'checklist' | 'manual';

export interface VereinsRegel {
  id: string;
  titel: string;
  beschreibung?: string;
  wert?: number;
  einheit?: string;
  istBKleingG: boolean;
  aktiv: boolean;
  source: VereinsregelSource;
}

export interface VereinsregelChecklistItem {
  id: string;
  label: string;
  defaultWert?: number;
  einheit?: string;
  istBKleingG: boolean;
  pflichtfeld: boolean;
}
