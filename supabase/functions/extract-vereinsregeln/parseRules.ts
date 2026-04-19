// supabase/functions/extract-vereinsregeln/parseRules.ts
// RULES-01 — Deterministic parser for Claude's Vereinsregel extraction response.
// Pure module (no I/O) — safe to unit-test in Deno without any permissions.
//
// Security invariants (T-2-03-02, T-2-03-10):
// - istBKleingG is ALWAYS stamped to `false` by the server regardless of LLM output.
//   BKleingG-Grundregeln come exclusively from BKLEINGG_REGELN in packages/shared,
//   NOT from the LLM.
// - titel is clamped to 200 chars and beschreibung to 1000 chars as defense against
//   prompt-injection attacks that try to overflow downstream UI rendering.
// - Candidates matching a BKleingG seed titel are dropped (dedupe against seed).

/**
 * Candidate VereinsRegel returned from PDF extraction.
 * Omits server-assigned fields (id, user_id, erstellt_am, aktiv) — these are
 * attached when the user confirms the rule in Plan 02-04.
 *
 * Note: declared locally to avoid Deno <-> Node import map complications with
 * packages/shared. Plan 02-04 will promote this to @spatenstich/shared.
 */
export type VereinsRegelCandidate = {
  titel: string;
  beschreibung?: string;
  wert?: number;
  einheit?: string;
  source: 'pdf_extraction';
  istBKleingG: false;
};

// MIRROR of BKLEINGG_REGELN in packages/shared/src/constants/vereinsregeln.ts.
// If that list changes, update this constant. Drift is acceptable — list only
// used for a de-dup heuristic (case-insensitive, trimmed match).
const BKLEINGG_TITEL_LOWER: readonly string[] = [
  'mind. 1/3 nutzgartenanteil',
  'hochstämme verboten',
  'max. 24 m² laube (inkl. überdachter freisitz)',
];

const MAX_TITEL_LEN = 200;
const MAX_BESCHREIBUNG_LEN = 1000;

/**
 * EXTRACTION_PROMPT — German prompt for claude-sonnet-4-6 asking for a pure
 * JSON array of Vereinsregeln candidates. The LLM MUST NOT emit istBKleingG
 * (the server overrides that flag), and MUST skip BKleingG-Grundregeln.
 */
export const EXTRACTION_PROMPT = `Du bist ein Extraktor fuer deutsche Kleingarten-Vereinssatzungen.

Extrahiere aus dem angehaengten PDF die konkreten Vereinsregeln dieses Vereins.
Typische Regeln sind z.B.:
- Maximale Heckenhoehe (cm)
- Maximale Laubenflaeche (m²)
- Kompost-Abstand zum Nachbargrundstueck
- Wegbreiten
- Wasseranschluss-Regeln
- Tierhaltung (Bienen, Kleintiere)
- Sonn- und Feiertagsruhe (Lautstaerke-Zeiten)
- Gemeinschaftsarbeit-Stunden pro Jahr
- Pestizid-Verbot / Erlaubte Duengemittel

WICHTIG:
- Bundeskleingartengesetz-Regeln NICHT extrahieren (1/3-Nutzgartenanteil, Hochstamm-Verbot, 24 m²-Laube). Diese sind bereits als Grundregeln gesetzt.
- Antworte ausschliesslich mit gueltigem JSON-Array. Keine Markdown-Codefences, kein erklaerender Text.
- Felder pro Regel:
    titel (string, Pflicht, max 200 Zeichen)
    beschreibung (string | null, max 1000 Zeichen)
    wert (number | null, z.B. 120)
    einheit (string | null, z.B. "cm", "m²", "h/Jahr")

Wenn keine Vereinsregeln im PDF stehen: antworte mit leerem Array [].`;

/**
 * Parse a raw Claude text response into typed VereinsRegelCandidate[].
 *
 * Accepts:
 * - Pure JSON array input
 * - Markdown-fenced JSON (```json ... ```)
 * - JSON array surrounded by prose (extracts between first '[' and last ']')
 *
 * Never throws — returns [] on any parse failure.
 * Always stamps `source: 'pdf_extraction'` and `istBKleingG: false`.
 */
export function parseRules(rawText: string): VereinsRegelCandidate[] {
  if (!rawText || typeof rawText !== 'string') return [];

  const parsed = safeParseJsonArray(rawText);
  if (!parsed) return [];

  const candidates: VereinsRegelCandidate[] = [];
  for (const entry of parsed) {
    if (!entry || typeof entry !== 'object') continue;
    const rec = entry as Record<string, unknown>;
    const titel = coerceTitel(rec['titel']);
    if (!titel) continue;
    // Dedupe against BKleingG seed (case-insensitive, trimmed)
    if (BKLEINGG_TITEL_LOWER.includes(titel.toLowerCase().trim())) continue;

    const candidate: VereinsRegelCandidate = {
      titel,
      source: 'pdf_extraction',
      istBKleingG: false,
    };
    const beschreibung = coerceBeschreibung(rec['beschreibung']);
    if (beschreibung !== undefined) candidate.beschreibung = beschreibung;
    const wert = coerceWert(rec['wert']);
    if (wert !== undefined) candidate.wert = wert;
    const einheit = coerceEinheit(rec['einheit']);
    if (einheit !== undefined) candidate.einheit = einheit;
    candidates.push(candidate);
  }
  return candidates;
}

// ──────────────────────────── helpers ────────────────────────────

function safeParseJsonArray(rawText: string): unknown[] | null {
  // 1. Try direct parse
  const direct = tryJson(rawText);
  if (Array.isArray(direct)) return direct;

  // 2. Strip markdown fence ```json ... ```
  const fenceMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    const inner = tryJson(fenceMatch[1]);
    if (Array.isArray(inner)) return inner;
  }

  // 3. Substring between first '[' and last ']'
  const first = rawText.indexOf('[');
  const last = rawText.lastIndexOf(']');
  if (first !== -1 && last !== -1 && last > first) {
    const slice = rawText.substring(first, last + 1);
    const bracketed = tryJson(slice);
    if (Array.isArray(bracketed)) return bracketed;
  }

  return null;
}

function tryJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function coerceTitel(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.length > MAX_TITEL_LEN
    ? trimmed.substring(0, MAX_TITEL_LEN)
    : trimmed;
}

function coerceBeschreibung(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  return trimmed.length > MAX_BESCHREIBUNG_LEN
    ? trimmed.substring(0, MAX_BESCHREIBUNG_LEN)
    : trimmed;
}

function coerceWert(raw: unknown): number | undefined {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string') {
    const n = Number(raw);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function coerceEinheit(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  return trimmed || undefined;
}
