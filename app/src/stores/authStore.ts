// Zustand store for auth mode + userId + activeGardenId with AsyncStorage persistence.
// Pattern: 02-PATTERNS.md §"app/src/stores/authStore.ts"; Phase 2.5-PATTERNS §11 for
// activeGardenId extension (D-13: lokal-mode has no garden; D-16: mode transitions clear it).
// Note (D-11): profile data is NOT persisted via Zustand middleware.
//   profileStore uses StorageAdapter (Phase 2-02). authStore tracks only
//   which mode the app is in, the currently active userId, and — since
//   Phase 2.5 — the currently active gardenId (account-mode only).
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AuthMode = 'account' | 'local' | null;

export interface AuthState {
  mode: AuthMode;
  userId: string | null;
  activeGardenId: string | null;
  setAccountMode: (userId: string) => void;
  setLocalMode: (uuid: string) => void;
  setActiveGarden: (gardenId: string | null) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      mode: null,
      userId: null,
      activeGardenId: null,
      setAccountMode: (userId) => set({ mode: 'account', userId }),
      setLocalMode: (uuid) =>
        set({ mode: 'local', userId: uuid, activeGardenId: null }),
      setActiveGarden: (gardenId) => set({ activeGardenId: gardenId }),
      clearAuth: () => set({ mode: null, userId: null, activeGardenId: null }),
    }),
    {
      name: 'spatenstich-auth',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      // v0 → v1: persisted blobs from Phase 2 did not store `activeGardenId`.
      // Rehydrate them with `activeGardenId: null` so post-rehydrate reads
      // never return `undefined` (TypeScript contract: string | null).
      migrate: (persistedState: unknown, version: number) => {
        if (
          version === 0 &&
          typeof persistedState === 'object' &&
          persistedState !== null
        ) {
          return { ...persistedState, activeGardenId: null };
        }
        return persistedState;
      },
    }
  )
);
