// D-08: CRUD only in Phase 1. Transactions/queries deferred to Phase 3.
export interface StorageAdapter {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
  list(prefix?: string): Promise<string[]>;
  // D-09: Schema version tracking for up-migrations
  getSchemaVersion(): Promise<number>;
  setSchemaVersion(version: number): Promise<void>;
}
