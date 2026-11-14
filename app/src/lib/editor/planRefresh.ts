// Phase 30: a small signal that the stored plan changed, so screens that stay mounted
// underneath the editor (plan view, home preview) load it again when the editor closes.

import * as React from 'react';

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

/** Changes whenever the stored plan was changed by the editor; use it as an effect dependency. */
export function usePlanVersion(): number {
  return React.useSyncExternalStore(
    subscribe,
    () => version,
    () => version,
  );
}
