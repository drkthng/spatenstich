// Mock for react-native-css-interop — prevents NativeWind runtime from
// accessing Appearance.getColorScheme() in test environment.
export const cssInterop = (component: any) => component;
export const remapProps = () => {};
export const useColorScheme = () => ({ colorScheme: 'light', setColorScheme: () => {}, toggleColorScheme: () => {} });
export const useUnstableNativeVariable = () => '';
export const vars = () => ({});
