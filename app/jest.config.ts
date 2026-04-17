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
      // Hook/component tests — ts-jest in node env, RN modules mocked
      displayName: 'hooks',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['**/src/hooks/__tests__/**/*.test.ts?(x)'],
      moduleNameMapper: {
        '^@spatenstich/shared$': '<rootDir>/../packages/shared/src/index.ts',
        '^react-native-url-polyfill/auto$': '<rootDir>/src/__mocks__/react-native-url-polyfill.ts',
        '^react-native$': '<rootDir>/src/__mocks__/react-native.ts',
      },
      transform: {
        '^.+\\.tsx?$': ['ts-jest', { tsconfig: { strict: true, esModuleInterop: true, resolveJsonModule: true, jsx: 'react' } }],
      },
    },
  ],
  collectCoverageFrom: ['src/**/*.{ts,tsx}'],
};
export default config;
