// Phase 33 (SYNC3-04): changes made by the partner reach this device within seconds.
//
// One Realtime channel per garden listens for changes on the synced tables. A change
// does not carry data into the app; it only triggers the ordinary pull for that table,
// so there is exactly one way rows get into local storage.
//
// When the live connection is not up, a timer pulls everything once a minute while the
// app is visible. That is the "within 60 seconds" fallback. Even with a live connection
// a full pull runs every few minutes, in case an event was lost on the way.

import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import type { EntityName } from '@spatenstich/shared';
import { supabase as defaultSupabase } from '../supabase';
import { getSyncWorker } from './SyncWorker';
import { syncEvents } from './events';

export const REALTIME_TABLES: EntityName[] = [
  'gardens',
  'profiles',
  'garden_members',
  'invite_codes',
  'garden_dimensions',
  'plan_elements',
  'imports',
  'import_items',
  'bed_drafts',
  'plant_drafts',
  'observation_drafts',
  'photo_findings',
  'garden_plants',
];

export const PULL_DEBOUNCE_MS = 300;
export const TICK_MS = 20_000;
export const POLL_INTERVAL_MS = 60_000;
export const SAFETY_PULL_MS = 5 * 60_000;

/** A new member also brings a profile and uses up an invite code. */
const ALSO_PULL: Partial<Record<EntityName, EntityName[]>> = {
  garden_members: ['profiles', 'invite_codes'],
};

export interface RealtimeBridgeDeps {
  supabase?: Pick<SupabaseClient, 'channel' | 'removeChannel'>;
  pull?: (entity: EntityName) => Promise<void>;
  pullAll?: () => Promise<void>;
  push?: () => Promise<void>;
  isVisible?: () => boolean;
  now?: () => number;
}

function filterFor(table: EntityName, gardenId: string): string | undefined {
  if (table === 'gardens') return `id=eq.${gardenId}`;
  if (table === 'profiles') return undefined; // no garden column; row level security limits it
  return `garden_id=eq.${gardenId}`;
}

function defaultIsVisible(): boolean {
  if (typeof document !== 'undefined' && typeof document.visibilityState === 'string') {
    return document.visibilityState === 'visible';
  }
  return true;
}

/** Starts listening for one garden. Returns the function that stops it. */
export function startRealtimeBridge(gardenId: string, deps: RealtimeBridgeDeps = {}): () => void {
  const client = deps.supabase ?? defaultSupabase;
  const pull = deps.pull ?? ((entity: EntityName) => getSyncWorker().pull(entity));
  const pullAll = deps.pullAll ?? (() => getSyncWorker().pullAll());
  const push = deps.push ?? (() => getSyncWorker().push());
  const isVisible = deps.isVisible ?? defaultIsVisible;
  const now = deps.now ?? Date.now;

  let stopped = false;
  let connected = false;
  let everConnected = false;
  let lastFullPull = now();
  const debounce = new Map<EntityName, ReturnType<typeof setTimeout>>();

  const schedule = (table: EntityName): void => {
    if (stopped) return;
    const pending = debounce.get(table);
    if (pending) clearTimeout(pending);
    debounce.set(
      table,
      setTimeout(() => {
        debounce.delete(table);
        pull(table).catch(() => {});
      }, PULL_DEBOUNCE_MS),
    );
  };

  const fullPull = (): void => {
    lastFullPull = now();
    pullAll().catch(() => {});
  };

  let channel: RealtimeChannel = client.channel(`garden:${gardenId}`);
  for (const table of REALTIME_TABLES) {
    const filter = filterFor(table, gardenId);
    channel = channel.on(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      'postgres_changes' as any,
      { event: '*', schema: 'public', table, ...(filter ? { filter } : {}) },
      () => {
        schedule(table);
        for (const other of ALSO_PULL[table] ?? []) schedule(other);
      },
    );
  }
  channel.subscribe((status) => {
    if (stopped) return;
    const up = status === 'SUBSCRIBED';
    if (up === connected) return;
    connected = up;
    syncEvents.emit({ type: 'realtime_status', connected });
    if (up) {
      // Whatever happened while the connection was down has to be fetched. The first
      // connection needs nothing: the start-up sync is already running.
      if (everConnected) fullPull();
      everConnected = true;
    }
  });

  const tick = setInterval(() => {
    if (stopped || !isVisible()) return;
    // Outbox entries that are waiting for their retry time need someone to try again.
    push().catch(() => {});
    const since = now() - lastFullPull;
    if ((!connected && since >= POLL_INTERVAL_MS) || since >= SAFETY_PULL_MS) fullPull();
  }, TICK_MS);

  return () => {
    stopped = true;
    clearInterval(tick);
    for (const t of debounce.values()) clearTimeout(t);
    debounce.clear();
    void client.removeChannel(channel);
    if (connected) syncEvents.emit({ type: 'realtime_status', connected: false });
  };
}
