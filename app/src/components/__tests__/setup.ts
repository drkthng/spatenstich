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

// Phase 6.5 Plan 05 (Rule 3 blocking): lucide-react-native ships as ESM.
// The components project's transformIgnorePatterns excludes node_modules,
// so any import of lucide icons (e.g. via InlineBanner.tsx) raises
// SyntaxError: Unexpected token 'export'. Stub icons as no-op components
// so component tests can render screens that transitively import lucide.
jest.mock('lucide-react-native', () => {
  const React = require('react');
  // Proxy returns a noop component for ANY icon name (AlertCircle, X, etc.)
  return new Proxy(
    {},
    {
      get: () => (_props: unknown) => React.createElement('Icon', null),
    },
  );
});
