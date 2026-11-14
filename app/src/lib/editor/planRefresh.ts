// Phase 30: a small signal that the stored plan changed, so screens that stay mounted
// underneath the editor (plan view, home preview) load it again when the editor closes.

import * as React from 'react';
import { useDataVersion } from '../sync/dataVersion';

let version = 0;
const listeners = new Set<() => void>();

export function notifyPlanChanged(): void {
  version += 1;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Changes whenever the stored plan changed: through the editor on this device, or
 * through a sync that brought someone else's changes (Phase 33). Use it as an effect
 * dependency.
 */
export function usePlanVersion(): number {
  const local = React.useSyncExternalStore(
    subscribe,
    () => version,
    () => version,
  );
  const synced = useDataVersion('plan_elements', 'garden_dimensions');
  return local + synced;
}
