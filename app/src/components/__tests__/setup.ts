// Setup file for component tests — mock NativeWind's css-interop before
// @testing-library/react-native loads and triggers the real react-native resolution.
jest.mock('react-native-css-interop', () => ({
  cssInterop: (component: any) => component,
  remapProps: () => {},
  useColorScheme: () => ({ colorScheme: 'light', setColorScheme: () => {}, toggleColorScheme: () => {} }),
  useUnstableNativeVariable: () => '',
  vars: () => ({}),
}));

// Also mock the jsx-runtime sub-path
jest.mock('react-native-css-interop/jsx-runtime', () => ({
  jsx: require('react').createElement,
  jsxs: require('react').createElement,
  Fragment: require('react').Fragment,
}));
