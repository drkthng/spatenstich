import { nextBackoffMs, MAX_ATTEMPTS, BACKOFF_BASE_MS, BACKOFF_CAP_MS } from '../backoff';

describe('nextBackoffMs', () => {
  it('returns 0 für attempts=0', () => {
    expect(nextBackoffMs(0)).toBe(0);
  });

  it('skaliert exponentiell bis zum Cap (rng=1.0)', () => {
    const maxRng = () => 1.0;
    // Da nextBackoffMs Math.floor(rng * exp) rechnet, liefert rng=1.0 den Wert (exp-1) am Rand.
    // Wir testen mit rng=0.999999 für "nahe max" zur Vermeidung von Off-by-One.
    const almostMax = () => 0.999999;
    expect(nextBackoffMs(1, almostMax)).toBeGreaterThanOrEqual(999);
    expect(nextBackoffMs(1, almostMax)).toBeLessThanOrEqual(1000);
    expect(nextBackoffMs(7, almostMax)).toBeLessThanOrEqual(BACKOFF_CAP_MS);
    expect(nextBackoffMs(10, almostMax)).toBeLessThanOrEqual(BACKOFF_CAP_MS);
    // rng=1.0 liefert Math.floor(1.0 * exp) = exp exakt
    expect(nextBackoffMs(1, maxRng)).toBe(1000);
    expect(nextBackoffMs(7, maxRng)).toBe(BACKOFF_CAP_MS);
  });

  it('jitter: rng=0 → 0', () => {
    expect(nextBackoffMs(5, () => 0)).toBe(0);
  });

  it('Konstanten: BASE=1000, CAP=60000, MAX_ATTEMPTS=10', () => {
    expect(BACKOFF_BASE_MS).toBe(1000);
    expect(BACKOFF_CAP_MS).toBe(60_000);
    expect(MAX_ATTEMPTS).toBe(10);
  });
});
