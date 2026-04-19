// Zustand store for auth mode + userId with AsyncStorage persistence.
// Pattern: 02-PATTERNS.md §"app/src/stores/authStore.ts"
// Note (D-11): profile data is NOT persisted via Zustand middleware.
//   profileStore uses StorageAdapter (Phase 2-02). authStore tracks only
//   which mode the app is in + the currently active userId.
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AuthMode = 'account' | 'local' | null;

export interface AuthState {
  mode: AuthMode;
  userId: string | null;
  setAccountMode: (userId: string) => void;
  setLocalMode: (uuid: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      mode: null,
      userId: null,
      setAccountMode: (userId) => set({ mode: 'account', userId }),
      setLocalMode: (uuid) => set({ mode: 'local', userId: uuid }),
      clearAuth: () => set({ mode: null, userId: null }),
    }),
    {
      name: 'spatenstich-auth',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
