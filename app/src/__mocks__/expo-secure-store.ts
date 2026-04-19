// In-memory mock for expo-secure-store used in unit tests.
// Matches the real API shape: getItemAsync / setItemAsync / deleteItemAsync.
const store = new Map<string, string>();

export async function getItemAsync(key: string): Promise<string | null> {
  return store.has(key) ? (store.get(key) ?? null) : null;
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  store.set(key, value);
}

export async function deleteItemAsync(key: string): Promise<void> {
  store.delete(key);
}

// Test helper — reset between tests
export function __resetSecureStore(): void {
  store.clear();
}

export default { getItemAsync, setItemAsync, deleteItemAsync, __resetSecureStore };
