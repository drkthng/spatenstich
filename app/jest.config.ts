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
        '^expo-sqlite$': '<rootDir>/src/__mocks__/expo-sqlite.ts',
      },
      transform: {
        '^.+\.tsx?$': ['ts-jest', { tsconfig: { strict: true, esModuleInterop: true, resolveJsonModule: true } }],
      },
    },
    {
      // Hook/lib tests — ts-jest in node env, RN + secure-store + async-storage mocked
      displayName: 'hooks',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: [
        '**/src/hooks/__tests__/**/*.test.ts?(x)',
        '**/src/lib/__tests__/**/*.test.ts?(x)',
      ],
      moduleNameMapper: {
        '^@spatenstich/shared$': '<rootDir>/../packages/shared/src/index.ts',
        '^react-native-url-polyfill/auto$': '<rootDir>/src/__mocks__/react-native-url-polyfill.ts',
        '^react-native$': '<rootDir>/src/__mocks__/react-native.ts',
        '^expo-secure-store$': '<rootDir>/src/__mocks__/expo-secure-store.ts',
        '^@react-native-async-storage/async-storage$': '<rootDir>/src/__mocks__/async-storage.ts',
        '^@react-native-community/netinfo$': '<rootDir>/src/__mocks__/react-native-community-netinfo.ts',
      },
      transform: {
        '^.+\.tsx?$': ['ts-jest', { tsconfig: { strict: true, esModuleInterop: true, resolveJsonModule: true, jsx: 'react' } }],
      },
    },
    {
      // Zustand stores tests — ts-jest in node env, RN + async-storage mocks
      displayName: 'stores',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['**/src/stores/__tests__/**/*.test.ts?(x)'],
      moduleNameMapper: {
        '^@spatenstich/shared$': '<rootDir>/../packages/shared/src/index.ts',
        '^react-native-url-polyfill/auto$': '<rootDir>/src/__mocks__/react-native-url-polyfill.ts',
        '^react-native$': '<rootDir>/src/__mocks__/react-native.ts',
        '^expo-secure-store$': '<rootDir>/src/__mocks__/expo-secure-store.ts',
        '^@react-native-async-storage/async-storage$': '<rootDir>/src/__mocks__/async-storage.ts',
      },
      transform: {
        '^.+\.tsx?$': ['ts-jest', { tsconfig: { strict: true, esModuleInterop: true, resolveJsonModule: true, jsx: 'react' } }],
      },
    },
    {
      // Photo-queue tests — jsdom env for Blob/fetch/URL.createObjectURL APIs
      // lib/photos/__tests__: exifStrip.web + PhotoUploader + photoQueueRepo
      displayName: 'photos',
      preset: 'ts-jest',
      testEnvironment: 'jsdom',
      testMatch: ['**/src/lib/photos/__tests__/**/*.test.ts?(x)'],
      setupFilesAfterEnv: ['<rootDir>/src/lib/photos/__tests__/setup.ts'],
      moduleNameMapper: {
        '^@spatenstich/shared$': '<rootDir>/../packages/shared/src/index.ts',
        '^react-native-url-polyfill/auto$': '<rootDir>/src/__mocks__/react-native-url-polyfill.ts',
        '^react-native$': '<rootDir>/src/__mocks__/react-native.ts',
        '^expo-secure-store$': '<rootDir>/src/__mocks__/expo-secure-store.ts',
        '^@react-native-async-storage/async-storage$': '<rootDir>/src/__mocks__/async-storage.ts',
        '^@sentry/react-native$': '<rootDir>/src/__mocks__/sentry.ts',
      },
      transform: {
        '^.+\\.tsx?$': ['ts-jest', { tsconfig: { strict: true, esModuleInterop: true, resolveJsonModule: true, jsx: 'react' } }],
      },
    },
  ],
  collectCoverageFrom: ['src/**/*.{ts,tsx}'],
};
export default config;
