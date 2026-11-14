// Phase 33 (SYNC3-04): screens load from local storage. When a pull changes stored rows,
// the screens that show them have to load again. `useDataVersion('plan_elements', ...)`
// returns a number that rises whenever one of the named entities changed through sync;
// used as an effect dependency it makes a screen reload by itself.

import * as React from 'react';
import type { EntityName } from '@spatenstich/shared';
import { syncEvents } from './events';

const versions = new Map<string, number>();
const listeners = new Set<() => void>();
let unsubscribeSync: (() => void) | null = null;

/** Marks an entity as changed (also used for changes that did not come from a pull). */
export function bumpDataVersion(entity: string): void {
  versions.set(entity, (versions.get(entity) ?? 0) + 1);
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (!unsubscribeSync) {
    unsubscribeSync = syncEvents.on((evt) => {
      if (evt.type === 'pull_success' && evt.changedIds.length > 0) bumpDataVersion(evt.entity);
    });
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && unsubscribeSync) {
      unsubscribeSync();
      unsubscribeSync = null;
    }
  };
}

export function getDataVersion(entities: readonly string[]): number {
  let sum = 0;
  for (const entity of entities) sum += versions.get(entity) ?? 0;
  return sum;
}

export function useDataVersion(...entities: EntityName[]): number {
  const key = entities.join(',');
  const read = React.useCallback(() => getDataVersion(key.split(',')), [key]);
  return React.useSyncExternalStore(subscribe, read, read);
}

/** Test-utility. */
export function _resetDataVersion(): void {
  versions.clear();
  listeners.clear();
  if (unsubscribeSync) unsubscribeSync();
  unsubscribeSync = null;
}
