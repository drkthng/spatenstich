// Phase 6 Plan 06-02: Transient Zustand Store für Import-Session-State.
// Hält das geparste ImportPayload zwischen Entry- und Preview-Screen.
// KEIN persist-Middleware — Import-Session ist transient (wie captureStore.ts).
import { create } from 'zustand';
import type { ImportPayload } from '@spatenstich/shared';

export interface ImportState {
  payload: ImportPayload | null;
  setPayload: (payload: ImportPayload) => void;
  reset: () => void;
}

export const useImportStore = create<ImportState>((set) => ({
  payload: null,
  setPayload: (payload) => set({ payload }),
  reset: () => set({ payload: null }),
}));
