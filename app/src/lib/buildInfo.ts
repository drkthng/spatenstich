// Phase 38 (DESIGN3-08): which version and build is running, who runs the app (Impressum)
// and whether error reports leave the device. All three come from values set when the app is
// built; the functions here only read them, so they can be tested with made-up values.

export interface BuildValues {
  /** Version from app.config.ts. */
  version?: string | null;
  /** Commit the build was made from (EXPO_PUBLIC_BUILD_SHA). */
  sha?: string | null;
  /** Day of the build, YYYY-MM-DD (EXPO_PUBLIC_BUILD_DATE). */
  date?: string | null;
}

export interface BuildInfo {
  version: string | null;
  /** First seven characters of the commit, or null for a build made by hand. */
  build: string | null;
  /** "15.11.2026", or null. */
  date: string | null;
}

export function describeBuild(values: BuildValues): BuildInfo {
  const version = values.version?.trim() || null;
  const sha = values.sha?.trim() ?? '';
  const build = /^[0-9a-f]{7,40}$/i.test(sha) ? sha.slice(0, 7).toLowerCase() : null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(values.date?.trim() ?? '');
  const date = m ? `${Number(m[3])}.${Number(m[2])}.${m[1]}` : null;
  return { version, build, date };
}

/**
 * The operator's lines for the Impressum from EXPO_PUBLIC_IMPRINT: lines separated by line
 * breaks or by "|". Empty when the value is missing; the screen then says that the app is run privately for one
 * household (the usual case: no name and address are needed for that).
 */
export function imprintLines(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/\r?\n|\\n|\|/)
    .map((line) => line.trim())
    .filter((line) => line !== '');
}

export type ErrorReporting = 'off' | 'eu' | 'elsewhere';

/** Where crash reports go, read off the address they are sent to. */
export function errorReporting(dsn: string | null | undefined): ErrorReporting {
  if (!dsn || dsn.trim() === '') return 'off';
  try {
    const host = new URL(dsn.trim()).hostname.toLowerCase();
    return /(^|\.)de\.sentry\.io$/.test(host) ? 'eu' : 'elsewhere';
  } catch {
    return 'off';
  }
}
