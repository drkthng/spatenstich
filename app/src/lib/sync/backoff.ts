// Exponential backoff with full jitter (AWS-style).
// Research §3: 2^(attempts-1) * base, cap at 60s, random ∈ [0, cap].

const BASE_MS = 1000;   // 1 Sekunde erste Verzögerung
const CAP_MS = 60_000;  // 60s-Cap

export const BACKOFF_BASE_MS = BASE_MS;
export const BACKOFF_CAP_MS = CAP_MS;
export const MAX_ATTEMPTS = 10;

export function nextBackoffMs(attempts: number, rng: () => number = Math.random): number {
  if (attempts <= 0) return 0;
  const exp = Math.min(CAP_MS, BASE_MS * Math.pow(2, attempts - 1));
  return Math.floor(rng() * exp);
}
