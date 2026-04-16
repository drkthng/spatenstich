import { describe, it } from '@jest/globals';
describe('StorageAdapter (native)', () => {
  it.todo('get returns null for unknown key');
  it.todo('set + get round-trip persists value');
  it.todo('delete removes key and subsequent get returns null');
  it.todo('list returns keys with optional prefix filter');
  it.todo('setSchemaVersion + getSchemaVersion round-trip');
});
describe('StorageAdapter.web (IndexedDbAdapter)', () => {
  it.todo('web adapter satisfies same contract as native');
});
