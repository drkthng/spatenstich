import type { StorageAdapter } from '@spatenstich/shared';

export interface LocalMigration {
  version: number;
  up: (adapter: StorageAdapter) => Promise<void>;
}

// Phase 1: initiale Bootstrap-Migration (noch kein lokales Schema nötig,
// aber der Mechanismus ist aktiv und getestet).
// Phase 2 (v2): KV-Store braucht keine strukturelle Migration.
// Profile-Keys ('profile', 'vereinsregeln') werden beim ersten set() angelegt.
// Pitfall 6 (02-RESEARCH.md): konsistente Key-Konvention — JSON-Blobs, keine flachen Keys.
export const MIGRATIONS: LocalMigration[] = [
  { version: 1, up: async () => { /* Bootstrap — kein Schema außerhalb kv */ } },
  {
    version: 2,
    up: async (_adapter) => {
      // Phase 2: KV-Store braucht keine strukturelle Migration.
      // Profile-Keys ('profile', 'vereinsregeln') werden beim ersten set() angelegt.
      // Pitfall 6 (02-RESEARCH.md): konsistente Key-Konvention — JSON-Blobs, keine flachen Keys.
    },
  },
];

export async function runMigrations(adapter: StorageAdapter): Promise<void> {
  const current = await adapter.getSchemaVersion();
  const pending = MIGRATIONS
    .filter((m) => m.version > current)
    .sort((a, b) => a.version - b.version);
  for (const m of pending) {
    await m.up(adapter);
    await adapter.setSchemaVersion(m.version);
  }
}
