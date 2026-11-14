// Phase 33: the one rule for taking a row from the server into local storage.
// Shared by both storage adapters so they cannot drift apart.

import type { AnyRow } from '@spatenstich/shared';

/** Milliseconds of an ISO timestamp; server ("+00:00", microseconds) and client ("Z") forms compare equal. */
export function toMs(iso: string | null | undefined): number {
  if (!iso) return 0;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? 0 : ms;
}

function serverStamp(row: AnyRow | null): string | null {
  return (row as { serverUpdatedAt?: string | null } | null)?.serverUpdatedAt ?? null;
}

/**
 * May `server` replace `local`?
 * - never while a local change for this row waits in the outbox (it would be lost);
 * - not when it is the version already stored;
 * - not when the local row was edited later (unless forced, e.g. after a discarded change).
 */
export function shouldApplyServerRow(
  local: AnyRow | null,
  server: AnyRow,
  hasPendingOutbox: boolean,
  force = false,
): boolean {
  if (hasPendingOutbox) return false;
  if (!local) return true;
  const localStamp = serverStamp(local);
  const incomingStamp = serverStamp(server);
  if (localStamp && incomingStamp && localStamp === incomingStamp) return false;
  if (force) return true;
  return toMs(local.updatedAt) <= toMs(server.updatedAt);
}

/** Same content, whatever the key order. Used to tell whether a replaced list changed. */
export function sameRows(a: AnyRow[], b: AnyRow[]): boolean {
  if (a.length !== b.length) return false;
  // Rows compared here are flat (members, invite codes); sorting the entries of each
  // row makes the comparison independent of key order.
  const key = (rows: AnyRow[]) =>
    rows
      .map((r) => JSON.stringify(Object.entries(r).sort(([x], [y]) => (x < y ? -1 : x > y ? 1 : 0))))
      .sort()
      .join('\n');
  return key(a) === key(b);
}
