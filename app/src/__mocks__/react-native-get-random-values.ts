// Mock for react-native-get-random-values — no-op in test environment.
// Tests rely on Node's global `crypto.webcrypto` (polyfilled via beforeAll in specs).
export {};
