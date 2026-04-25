// Exponential backoff with full jitter — Plan 03-04.
// Used by both SyncWorker (for outbox retries) and PhotoUploader (for upload retries).

/** Maximum number of upload/push attempts before marking as permanently failed. */
export const MAX_ATTEMPTS = 10;

/** Minimum delay in ms (1 second). */
const MIN_MS = 1_000;

/** Maximum delay in ms (60 seconds). */
const MAX_MS = 60_000;

/**
 * Returns the next backoff delay in milliseconds using full-jitter exponential backoff.
 * Formula: random(0, min(MAX_MS, MIN_MS * 2^attempts))
 *
 * @param attempts - Number of attempts so far (0-indexed).
 */
export function nextBackoffMs(attempts: number): number {
  const cap = Math.min(MAX_MS, MIN_MS * Math.pow(2, attempts));
  return Math.floor(Math.random() * cap);
}
