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

// ── save state (Phase 31, EDIT3-18) ─────────────────────────────────────────
// What the editor shows: "saving" while a write is waiting or running, "error" when the last
// write of some element failed, otherwise "saved".
export type SaveState = 'saved' | 'saving' | 'error';

let inFlight = 0;
/** Elements whose last write failed; retried with the next save or on request. */
const failed = new Map<string, { mode: AuthMode; el: PlanElementRow }>();
const stateListeners = new Set<() => void>();

function emitSaveState(): void {
  for (const listener of stateListeners) listener();
}

export function getSaveState(): SaveState {
  if (timers.size > 0 || inFlight > 0) return 'saving';
  return failed.size > 0 ? 'error' : 'saved';
}

export function subscribeSaveState(listener: () => void): () => void {
  stateListeners.add(listener);
  return () => {
    stateListeners.delete(listener);
  };
}

function runWrite(mode: AuthMode, el: PlanElementRow): Promise<void> {
  inFlight += 1;
  emitSaveState();
  return writePlanElement(mode, el)
    .then(() => {
      failed.delete(el.id);
    })
    .catch((e) => {
      failed.set(el.id, { mode, el });
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn('[editorSave] autosave failed', el.id, e);
      }
    })
    .finally(() => {
      inFlight -= 1;
      emitSaveState();
    });
}

/** Write again what could not be written (used by the "Nicht gespeichert" indicator). */
export function retryFailedSaves(): void {
  const entries = Array.from(failed.values());
  for (const { mode, el } of entries) void runWrite(mode, el);
}

/**
 * Schedule an autosave for one element. Later calls for the same id replace the earlier one.
 * `delayMs` defaults to 5 s (the original editor debounce); the editor store passes 0 for
 * changes that are complete (end of a drag, delete, undo) and a short delay while typing.
 */
export function scheduleSaveElement(
  mode: AuthMode,
  el: PlanElementRow,
  delayMs: number = EDITOR_SAVE_DELAY_MS,
): void {
  const existing = timers.get(el.id);
  if (existing) clearTimeout(existing);
  if (delayMs <= 0) {
    timers.delete(el.id);
    void runWrite(mode, el);
    return;
  }
  timers.set(
    el.id,
    setTimeout(() => {
      timers.delete(el.id);
      void runWrite(mode, el);
    }, delayMs),
  );
  emitSaveState();
}

/** Drop a waiting save for an element (its newer state is written another way). */
export function cancelSaveElement(id: string): void {
  const existing = timers.get(id);
  if (existing) clearTimeout(existing);
  if (timers.delete(id)) emitSaveState();
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
  inFlight += 1;
  emitSaveState();
  try {
    await Promise.all(
      ids.map(async (id) => {
        const el = byId(id);
        if (el) await writePlanElement(mode, el);
      }),
    );
  } finally {
    inFlight -= 1;
    emitSaveState();
  }
}

/**
 * Returns true if at least one debounced autosave timer is pending.
 * Used by the leave-flush guard to skip the synchronous beforeunload
 * path when there is nothing to flush.
 */
/** A change to this element is on its way to storage (or failed to get there). */
export function hasPendingSave(id: string): boolean {
  return timers.has(id) || failed.has(id);
}

export function hasPendingSaves(): boolean {
  return timers.size > 0;
}

/**
 * Leave-flush wrapper: flushed all pending timers via the existing
 * flushAllPendingSaves path (writePlanElement → writeWithOutbox LWW).
 *
 * Guard: non-account modes have no server-side plan_elements — calling
 * writePlanElement in those modes is a no-op at best and an error at
 * worst. The guard lives here (one place) so callers (PlanScreen
 * unmount / beforeunload) don't duplicate the mode-check logic.
 *
 * Same invariant as the editorStore autosave subscription (editorStore.ts:225).
 */
export async function flushOnLeave(
  mode: AuthMode,
  byId: (id: string) => PlanElementRow | undefined,
): Promise<void> {
  if (mode !== 'account') return;
  return flushAllPendingSaves(mode, byId);
}

/** Test-only reset — clears all timers and the internal Map. */
export function _resetEditorSaveTimers(): void {
  for (const t of timers.values()) clearTimeout(t);
  timers.clear();
  failed.clear();
  inFlight = 0;
}
