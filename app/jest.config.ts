import type { Config } from 'jest';
const config: Config = {
  preset: 'jest-expo',
  testMatch: ['**/__tests__/**/*.test.ts?(x)'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-native-svg|@sentry/.*))',
  ],
  collectCoverageFrom: ['src/**/*.{ts,tsx}'],
};
export default config;
