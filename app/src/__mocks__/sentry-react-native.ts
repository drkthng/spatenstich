// Mock for @sentry/react-native — used in lib/sync tests running in node env.
// Provides all Sentry APIs used by SyncWorker as no-ops.

const sentryMock = {
  init: jest.fn(),
  wrap: jest.fn((component: unknown) => component),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  addBreadcrumb: jest.fn(),
  setUser: jest.fn(),
  setTag: jest.fn(),
  setExtra: jest.fn(),
  withScope: jest.fn((cb: (scope: unknown) => void) => cb({})),
};

export const init = sentryMock.init;
export const wrap = sentryMock.wrap;
export const captureException = sentryMock.captureException;
export const captureMessage = sentryMock.captureMessage;
export const addBreadcrumb = sentryMock.addBreadcrumb;
export const setUser = sentryMock.setUser;
export const setTag = sentryMock.setTag;
export const setExtra = sentryMock.setExtra;
export const withScope = sentryMock.withScope;

export default sentryMock;
