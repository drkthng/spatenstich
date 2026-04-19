// Zustand store for the in-memory profile state (D-11).
// NO persist middleware — account-mode reads from Supabase, local-mode uses StorageAdapter.
// Zustand holds only the in-memory slice; loadProfile() hydrates at app start (useProfile hook).
// Pattern: 02-PATTERNS.md §"app/src/stores/profileStore.ts".
import { create } from 'zustand';
import type { Klimazone, Archetype, VereinsRegel } from '@spatenstich/shared';

export interface ProfileState {
  plz: string | null;
  klimazone: Klimazone | null;
  archetype: Archetype | null;
  vereinsregeln: VereinsRegel[];
  setPlz: (plz: string, klimazone: Klimazone) => void;
  setArchetype: (archetype: Archetype) => void;
  setVereinsregeln: (rules: VereinsRegel[]) => void;
  reset: () => void;
}

export const useProfileStore = create<ProfileState>()((set) => ({
  plz: null,
  klimazone: null,
  archetype: null,
  vereinsregeln: [],
  setPlz: (plz, klimazone) => set({ plz, klimazone }),
  setArchetype: (archetype) => set({ archetype }),
  setVereinsregeln: (vereinsregeln) => set({ vereinsregeln }),
  reset: () => set({ plz: null, klimazone: null, archetype: null, vereinsregeln: [] }),
}));
