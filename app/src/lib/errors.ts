// Phase 2.5: NotOwnerError/GardenHasMembersError/CannotTransferToSelfError/TargetNotMemberError
//   waren in gardenRepo.ts — jetzt hier für DRY + Phase-3-Offline-Errors.
// Phase 3 (Plan 03-03): neue OutboxEnqueueError + ConflictError für LWW-P9011-Mapping.
//
// UI-Callers importieren diese Errors via Re-Exports in gardenRepo.ts (Kompat).

export class NotOwnerError extends Error {
  readonly code = 'NOT_OWNER';
  constructor(cause?: unknown) {
    super('errors.not_owner');
    this.name = 'NotOwnerError';
    (this as { cause?: unknown }).cause = cause;
  }
}

export class GardenHasMembersError extends Error {
  readonly code = 'GARDEN_HAS_MEMBERS';
  constructor(cause?: unknown) {
    super('garden.delete.error_has_members');
    this.name = 'GardenHasMembersError';
    (this as { cause?: unknown }).cause = cause;
  }
}

export class CannotTransferToSelfError extends Error {
  readonly code = 'CANNOT_TRANSFER_TO_SELF';
  constructor(cause?: unknown) {
    super('garden.transferOwnership.error_self');
    this.name = 'CannotTransferToSelfError';
    (this as { cause?: unknown }).cause = cause;
  }
}

export class TargetNotMemberError extends Error {
  readonly code = 'TARGET_NOT_MEMBER';
  constructor(cause?: unknown) {
    super('garden.transferOwnership.error_target_not_member');
    this.name = 'TargetNotMemberError';
    (this as { cause?: unknown }).cause = cause;
  }
}

// ── Phase 3 neue Errors ────────────────────────────────────────────────────

/**
 * Geworfen wenn die atomic writeWithOutbox-Transaktion fehlschlägt.
 * Bedeutet: NICHTS wurde geschrieben (weder Row noch Outbox-Eintrag).
 * UI kann Retry anbieten oder Fehler eskalieren.
 */
export class OutboxEnqueueError extends Error {
  readonly code = 'OUTBOX_ENQUEUE_FAILED';
  constructor(entity: string, rowId: string, cause?: unknown) {
    super(`errors.outbox_enqueue_failed:${entity}:${rowId}`);
    this.name = 'OutboxEnqueueError';
    (this as { cause?: unknown }).cause = cause;
  }
}

/**
 * Server-side LWW-Trigger hat den Write als älter abgelehnt (P9011).
 * Client muss Pull ausführen und Merge-UI zeigen (Plan 03-06).
 * Wird in Plan 03-04 vom SyncWorker geworfen, hier zentral definiert.
 */
export class ConflictError extends Error {
  readonly code = 'CONFLICT_STALE_WRITE';
  constructor(
    public readonly entity: string,
    public readonly rowId: string,
    cause?: unknown,
  ) {
    super(`errors.conflict_stale_write:${entity}:${rowId}`);
    this.name = 'ConflictError';
    (this as { cause?: unknown }).cause = cause;
  }
}
