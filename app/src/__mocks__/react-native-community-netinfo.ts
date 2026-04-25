// Mock for @react-native-community/netinfo — used in lib/__tests__ (node env).
// Default: online. Tests override via jest.mock() or mockImplementation.

const NetInfoMock = {
  fetch: jest.fn().mockResolvedValue({
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi',
  }),
  addEventListener: jest.fn().mockReturnValue(() => {}),
  useNetInfo: jest.fn().mockReturnValue({
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi',
  }),
};

export default NetInfoMock;
