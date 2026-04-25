// Type declaration stub for @react-native-community/netinfo.
// The package will be installed in a future task; this stub satisfies
// TypeScript during development and tests until it is added to package.json.
// The actual module is mocked in tests via jest.config.ts moduleNameMapper.
declare module '@react-native-community/netinfo' {
  export interface NetInfoState {
    isConnected: boolean | null;
    isInternetReachable: boolean | null;
    type: string;
  }

  interface NetInfoStatic {
    fetch(): Promise<NetInfoState>;
    addEventListener(
      listener: (state: NetInfoState) => void,
    ): () => void;
  }

  const NetInfo: NetInfoStatic;
  export default NetInfo;
}
