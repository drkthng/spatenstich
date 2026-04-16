import type { Config } from 'jest';
const config: Config = {
  projects: [
    {
      // Node-environment tests (StorageAdapter, pure TS utilities)
      displayName: 'node',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['**/src/storage/__tests__/**/*.test.ts'],
      moduleNameMapper: {
        '^@spatenstich/shared$': '<rootDir>/../packages/shared/src/index.ts',
      },
      transform: {
        '^.+\\.tsx?$': ['ts-jest', { tsconfig: { strict: true, esModuleInterop: true, resolveJsonModule: true } }],
      },
    },
    {
      // React Native / Expo environment tests
      displayName: 'expo',
      preset: 'jest-expo',
      testMatch: ['**/__tests__/**/*.test.ts?(x)', '!**/src/storage/__tests__/**'],
      transformIgnorePatterns: [
        'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-native-svg|@sentry/.*))',
      ],
    },
  ],
  collectCoverageFrom: ['src/**/*.{ts,tsx}'],
};
export default config;
