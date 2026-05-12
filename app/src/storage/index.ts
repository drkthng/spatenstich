// Jest/TypeScript resolution shim.
// Runtime uses Platform-specific exports: index.native.ts (SQLite) / index.web.ts (IndexedDB).
// This file exists solely so that Jest (node environment) can resolve '../../storage' imports.
// Metro bundler (Expo) ignores this file due to .native.ts/.web.ts priority.
export { storage } from './index.web';
