// Mock for @sentry/react-native in tests
export const captureException = jest.fn();
export const captureMessage = jest.fn();
export const addBreadcrumb = jest.fn();
export const setUser = jest.fn();
export const init = jest.fn();
