// Phase 6.5 Plan 04: Session-scoped store for review screen auto-promote toggle.
// Not persisted — re-opens default to autoPromote=false.
// Pattern: importStore.ts (transient Zustand store).

import { create } from 'zustand';

export interface ReviewSettingsState {
  autoPromote: boolean;
  autoPromoteThreshold: number;
  setAutoPromote: (value: boolean) => void;
}

export const useReviewSettingsStore = create<ReviewSettingsState>((set) => ({
  autoPromote: false,
  autoPromoteThreshold: 0.8,
  setAutoPromote: (value) => set({ autoPromote: value }),
}));
