// Plan 03-05 Task 03 — TDD: settingsStore tests
// Tests geoOptIn default, setGeoOptIn mutation, persist middleware.
import { useSettingsStore } from '../settingsStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

describe('useSettingsStore', () => {
  beforeEach(() => {
    // Reset to default state between tests
    useSettingsStore.setState({ geoOptIn: false });
    jest.clearAllMocks();
  });

  it('geoOptIn default ist false (DSGVO-Minimalprinzip, D-24)', () => {
    expect(useSettingsStore.getState().geoOptIn).toBe(false);
  });

  it('setGeoOptIn(true) mutiert state', () => {
    useSettingsStore.getState().setGeoOptIn(true);
    expect(useSettingsStore.getState().geoOptIn).toBe(true);
  });

  it('setGeoOptIn(false) mutiert state zurück', () => {
    useSettingsStore.getState().setGeoOptIn(true);
    useSettingsStore.getState().setGeoOptIn(false);
    expect(useSettingsStore.getState().geoOptIn).toBe(false);
  });

  it('persist-Middleware speichert in AsyncStorage (setItem wird aufgerufen)', async () => {
    useSettingsStore.getState().setGeoOptIn(true);
    await new Promise((r) => setTimeout(r, 50)); // persist schreibt async
    expect(AsyncStorage.setItem).toHaveBeenCalled();
  });
});
