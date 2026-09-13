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
  // Phase 20 Plan 03 (DEPLOY-04): Ziel-Route, wenn ein Web-Share-Target-Aufruf
  // (POST /share-target → /import?from=share) eintrifft, während niemand
  // angemeldet ist. Nach erfolgreichem Login navigiert die App dorthin zurück
  // (siehe app/app/_layout.tsx GuardedStack).
  pendingRoute: string | null;
  // Phase 20 Plan 03 Task 4 (DEPLOY-04): das abgefangene beforeinstallprompt-
  // Ereignis. Kein Standard-DOM-Typ (BeforeInstallPromptEvent) — als unknown
  // geführt. NICHT persistiert (partialize unten): ein Browser-Event-Objekt
  // ist nicht serialisierbar.
  installPromptEvent: unknown | null;
  setAccountMode: (userId: string) => void;
  setLocalMode: (uuid: string) => void;
  setActiveGarden: (gardenId: string | null) => void;
  setPendingRoute: (route: string | null) => void;
  clearPendingRoute: () => void;
  setInstallPrompt: (event: unknown | null) => void;
  clearInstallPrompt: () => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      mode: null,
      userId: null,
      activeGardenId: null,
      pendingRoute: null,
      installPromptEvent: null,
      setAccountMode: (userId) => set({ mode: 'account', userId }),
      setLocalMode: (uuid) =>
        set({ mode: 'local', userId: uuid, activeGardenId: null }),
      setActiveGarden: (gardenId) => set({ activeGardenId: gardenId }),
      setPendingRoute: (route) => set({ pendingRoute: route }),
      clearPendingRoute: () => set({ pendingRoute: null }),
      setInstallPrompt: (event) => set({ installPromptEvent: event }),
      clearInstallPrompt: () => set({ installPromptEvent: null }),
      clearAuth: () => set({ mode: null, userId: null, activeGardenId: null }),
    }),
    {
      name: 'spatenstich-auth',
      storage: createJSONStorage(() => AsyncStorage),
      version: 3,
      // v0 → v1: persisted blobs from Phase 2 did not store `activeGardenId`.
      // v1 → v2 (Plan 20-03 Task 3): `pendingRoute` is new — default it to
      // null for any persisted state older than v2.
      // v2 → v3 (Plan 20-03 Task 4): `installPromptEvent` is new — always
      // null on rehydrate (see partialize: it is never written to storage in
      // the first place, so this branch is symmetry/documentation rather
      // than a real backfill need). Existing branches stay untouched.
      migrate: (persistedState: unknown, version: number) => {
        let state = persistedState;
        if (
          version === 0 &&
          typeof state === 'object' &&
          state !== null
        ) {
          state = { ...state, activeGardenId: null };
        }
        if (version < 2 && typeof state === 'object' && state !== null) {
          state = { ...state, pendingRoute: null };
        }
        if (version < 3 && typeof state === 'object' && state !== null) {
          state = { ...state, installPromptEvent: null };
        }
        return state;
      },
      // installPromptEvent ist ein Browser-Event-Objekt — nicht serialisierbar
      // und session-lokal. Nur die vier persistierbaren Daten-Felder schreiben.
      partialize: (state) => ({
        mode: state.mode,
        userId: state.userId,
        activeGardenId: state.activeGardenId,
        pendingRoute: state.pendingRoute,
      }),
    }
  )
);
