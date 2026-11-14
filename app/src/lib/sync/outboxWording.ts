// Phase 33 (SYNC3-09): what waits in the outbox, said in plain German.
// Pure functions, so the wording can be tested without a screen.

import type { OutboxEntry } from '@spatenstich/shared';
import { MAX_ATTEMPTS } from './backoff';
import { t } from '../i18n';

export function isFailedEntry(entry: OutboxEntry): boolean {
  return entry.attempts >= MAX_ATTEMPTS && entry.lastError !== null;
}

/** "Element im Plan: Hochbeet 1", "Element im Plan gelöscht: Kompost", "Größe der Parzelle". */
export function describeEntry(entry: OutboxEntry): string {
  const whatKey = `sync.detail.what.${entry.entity}`;
  const translated = t(whatKey);
  const what = translated === whatKey ? entry.entity : translated;
  const payload = entry.payload as {
    label?: unknown;
    name?: unknown;
    displayName?: unknown;
    commonNameDe?: unknown;
    summary?: unknown;
    deletedAt?: unknown;
  };
  const named = [payload.label, payload.name, payload.displayName, payload.commonNameDe, payload.summary].find(
    (v): v is string => typeof v === 'string' && v.trim().length > 0,
  );
  if (!named) return t('sync.detail.entryLabelPlain', { what });
  const label = named.length > 48 ? `${named.slice(0, 47)}…` : named;
  return payload.deletedAt
    ? t('sync.detail.entryLabelDeleted', { what, label })
    : t('sync.detail.entryLabel', { what, label });
}

/** Why an entry failed, in words a gardener understands. The raw text stays available. */
export function describeFailure(lastError: string | null): string {
  const code = (lastError ?? '').split(':')[0]?.trim() ?? '';
  switch (code) {
    case '42501':
      return t('sync.detail.reason.notAllowed');
    case '23505':
      return t('sync.detail.reason.duplicate');
    case '23503':
      return t('sync.detail.reason.missingParent');
    case '42P01':
      return t('sync.detail.reason.unknownKind');
    case '22P02':
    case '23502':
    case '23514':
    case '42703':
    case 'PGRST204':
    case 'P9010':
      return t('sync.detail.reason.rejected');
    default:
      return t('sync.detail.reason.unreachable');
  }
}

/** One sentence for the top of the screen and for the badge's long form. */
export function summarize(pending: number, failed: number): string {
  if (pending === 0 && failed === 0) return t('sync.detail.allSynced');
  const parts: string[] = [];
  if (pending === 1) parts.push(t('sync.detail.pendingOne'));
  else if (pending > 1) parts.push(t('sync.detail.pendingMany', { n: pending }));
  if (failed === 1) parts.push(t('sync.detail.failedOne'));
  else if (failed > 1) parts.push(t('sync.detail.failedMany', { n: failed }));
  return parts.join(' ');
}
