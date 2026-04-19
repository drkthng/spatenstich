// In-memory mock for @react-native-async-storage/async-storage.
// Matches the real default-export API: getItem / setItem / removeItem / clear.
const store = new Map<string, string>();

const AsyncStorage = {
  getItem: async (key: string): Promise<string | null> =>
    store.has(key) ? (store.get(key) ?? null) : null,
  setItem: async (key: string, value: string): Promise<void> => {
    store.set(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    store.delete(key);
  },
  clear: async (): Promise<void> => {
    store.clear();
  },
  // Test helper — reset between tests
  __reset: (): void => {
    store.clear();
  },
};

export default AsyncStorage;
