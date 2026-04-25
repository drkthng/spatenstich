// Settings Store — Plan 03-05 Task 03.
// Persists user settings via zustand persist middleware + AsyncStorage.
// Pattern: authStore.ts (zustand persist + createJSONStorage).
//
// D-24: geoOptIn default AUS (DSGVO-Minimalprinzip).
// Only changed in Settings > Datenschutz screen.

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingsState {
  /**
   * D-24: Opt-in for GPS data from photos.
   * Default OFF (DSGVO minimum principle).
   * Only changed in Settings > Datenschutz.
   */
  geoOptIn: boolean;
  setGeoOptIn: (value: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      geoOptIn: false,
      setGeoOptIn: (value) => set({ geoOptIn: value }),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
    },
  ),
);
