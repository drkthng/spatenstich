// Minimal react-native mock for unit tests running in node environment
export const Platform = {
  OS: 'ios',
  select: (obj: Record<string, unknown>) => obj['ios'] ?? obj['default'],
};
export const NativeModules = {};
export const AppState = { addEventListener: jest.fn(), removeEventListener: jest.fn() };
export const Linking = { addEventListener: jest.fn(), removeEventListener: jest.fn(), getInitialURL: jest.fn() };
