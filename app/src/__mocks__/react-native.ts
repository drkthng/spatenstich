// Minimal react-native mock for unit tests running in node environment
import * as React from 'react';

export const Platform = {
  OS: 'web',
  select: (obj: Record<string, unknown>) => obj['web'] ?? obj['default'],
};
export const NativeModules = {};
export const AppState = {
  addEventListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  removeEventListener: jest.fn(),
  currentState: 'active',
};
export const Linking = { addEventListener: jest.fn(), removeEventListener: jest.fn(), getInitialURL: jest.fn() };

// StyleSheet stub — needed by @testing-library/react-native
export const StyleSheet = {
  create: (styles: Record<string, unknown>) => styles,
  flatten: (style: unknown) => (Array.isArray(style) ? Object.assign({}, ...style) : style ?? {}),
  hairlineWidth: 1,
};

// Primitive component stubs — enough for renderHook + render in node env
export const View = ({ children, testID, accessibilityLabel, ...props }: any) =>
  React.createElement('View', { testID, accessibilityLabel, ...props }, children);
export const Text = ({ children, testID, ...props }: any) =>
  React.createElement('Text', { testID, ...props }, children);
export const Pressable = ({ children, onPress, testID, accessibilityRole, accessibilityLabel, ...props }: any) =>
  React.createElement('Pressable', { testID, accessibilityRole, accessibilityLabel, onPress, ...props }, children);
export const ScrollView = ({ children, testID, ...props }: any) =>
  React.createElement('ScrollView', { testID, ...props }, children);
export const Image = ({ testID, accessibilityLabel, source, ...props }: any) =>
  React.createElement('Image', { testID, accessibilityLabel, source, ...props });
export const ActivityIndicator = (props: any) =>
  React.createElement('ActivityIndicator', props);
export const Switch = ({ testID, value, onValueChange, accessibilityLabel, ...props }: any) =>
  React.createElement('Switch', { testID, value, onValueChange, accessibilityLabel, ...props });
export const TouchableOpacity = ({ children, onPress, testID, ...props }: any) =>
  React.createElement('TouchableOpacity', { testID, onPress, ...props }, children);

// Dimensions stub
export const Dimensions = {
  get: () => ({ width: 375, height: 812 }),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

// Alert stub
export const Alert = { alert: jest.fn() };

// Keyboard stub
export const Keyboard = { dismiss: jest.fn(), addListener: jest.fn(), removeAllListeners: jest.fn() };
