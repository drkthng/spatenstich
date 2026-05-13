// Phase 7 Plan 03: Editor-level 5s debounce per element. EDIT-09.
//
// Pattern: SyncTriggers.scheduleWriteDebounced (existing 500ms global push debounce)
//   but per-element (Map<id, Timeout>) so concurrent edits to multiple elements don't
//   stomp each other's timers.
// Two-stage debounce (Pattern K from 07-PATTERNS): editor 5s -> outbox 500ms -> push.
// Manual save (flushAllPendingSaves) cancels timers and writes all immediately.
//
// Pitfall-5: callers MUST NOT call scheduleSaveElement during active gestures
// (editorStore.gestureActive=true). The editorStore subscription enforces this on the
// store side; this module is a passive scheduler and does not check itself.

import type { PlanElementRow } from '@spatenstich/shared';
import type { AuthMode } from '../../stores/authStore';
import { writePlanElement } from '../gardenPlanRepo';

const timers = new Map<string, ReturnType<typeof setTimeout>>();
const EDITOR_SAVE_DELAY_MS = 5_000;

/** Schedule a per-element 5s autosave. Subsequent calls for the same id reset the timer. */
export function scheduleSaveElement(mode: AuthMode, el: PlanElementRow): void {
  const existing = timers.get(el.id);
  if (existing) clearTimeout(existing);
  timers.set(
    el.id,
    setTimeout(() => {
      timers.delete(el.id);
      writePlanElement(mode, el).catch((e) => {
        if (typeof __DEV__ !== 'undefined' && __DEV__) {
          // eslint-disable-next-line no-console
          console.warn('[editorSave] autosave failed', el.id, e);
        }
      });
    }, EDITOR_SAVE_DELAY_MS),
  );
}

/**
 * Cancel all pending timers and write the current snapshot of each scheduled id
 * via the byId resolver. Used by the manual Save button.
 */
export async function flushAllPendingSaves(
  mode: AuthMode,
  byId: (id: string) => PlanElementRow | undefined,
): Promise<void> {
  const ids = Array.from(timers.keys());
  for (const id of ids) {
    const t = timers.get(id);
    if (t) clearTimeout(t);
    timers.delete(id);
  }
  await Promise.all(
    ids.map(async (id) => {
      const el = byId(id);
      if (el) await writePlanElement(mode, el);
    }),
  );
}

/** Test-only reset — clears all timers and the internal Map. */
export function _resetEditorSaveTimers(): void {
  for (const t of timers.values()) clearTimeout(t);
  timers.clear();
}
