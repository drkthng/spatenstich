// supabase/functions/ai-job-consumer/parseElements.ts
// PHOTO-04 — Deterministic parser for Claude Vision garden analysis response.
// Pure module (no I/O) — safe to unit-test in Deno without any permissions.
//
// Pattern source: supabase/functions/extract-vereinsregeln/parseRules.ts
// Replicates: safeParseJsonArray, coerce functions, fence-strip pattern.
//
// Security invariants:
// - element_type clamped to 50 chars (defense against overflow)
// - label clamped to 100 chars
// - Non-finite coordinates cause element to be discarded (defense against NaN injection)
// - confidence coerced to 'high'|'medium'|'low' — unknown values default to 'medium'

/**
 * Candidate plan element returned from Claude Vision analysis.
 * Represents a single recognized garden element with meter-based coordinates.
 */
export interface PlanElementCandidate {
  element_type: string;
  label: string;
  x_m: number;
  y_m: number;
  width_m: number;
  height_m: number;
  confidence: 'high' | 'medium' | 'low';
}

const MAX_ELEMENT_TYPE_LEN = 50;
const MAX_LABEL_LEN = 100;
const VALID_CONFIDENCE = ['high', 'medium', 'low'] as const;

/**
 * buildAnalysisPrompt — German prompt for claude-sonnet-4-6 asking for a pure
 * JSON array of PlanElementCandidate entries based on attached garden photos.
 *
 * Coordinate system: SW corner = (0,0), X-axis = width_m (east), Y-axis = height_m (north).
 */
export function buildAnalysisPrompt(dimensions: {
  width_m: number;
  height_m: number;
  shape: string;
}): string {
  return `Du bist ein Garten-Analyse-Assistent. Analysiere die beigefuegten Fotos eines Kleingartens.

Koordinatensystem: Die Suedwest-Ecke des Gartens ist Ursprung (0,0).
Gartenbreite: ${dimensions.width_m} Meter (X-Achse, Richtung Ost)
Gartenlaenge: ${dimensions.height_m} Meter (Y-Achse, Richtung Nord)
Gartenform: ${dimensions.shape}

Erkenne alle sichtbaren Elemente (Beete, Laube, Kompost, Wege, Baeume, Rasenflaechen, Zaeune, Wasserstellen, Sitzplaetze, etc.) und gib sie als reines JSON-Array zurueck.

WICHTIG:
- Antworte AUSSCHLIESSLICH mit gueltigem JSON-Array. Keine Erklaerungen, keine Markdown-Codefences.
- Positioniere Elemente in Garten-METERN (nicht Pixel).
- Setze confidence basierend auf deiner Erkennungssicherheit: "high" (klar sichtbar), "medium" (wahrscheinlich), "low" (unsicher/unklar).
- Wenn du gar keine Elemente erkennst: antworte mit leerem Array [].

Gueltige element_type Werte: "Beet" | "Laube" | "Kompost" | "Weg" | "Baum" | "Rasen" | "Zaun" | "Wasserstelle" | "Sitzplatz" | "Sonstiges"

Felder pro Element:
  element_type (string): einer der oben genannten Werte
  label (string): Kurze Beschreibung, z.B. "Gemuese-Hochbeet", "Geraeteschuppen"
  x_m (number): X-Koordinate in Metern (Mitte des Elements, von Suedwest-Ecke)
  y_m (number): Y-Koordinate in Metern (Mitte des Elements, von Suedwest-Ecke)
  width_m (number): Geschaetzte Breite in Metern
  height_m (number): Geschaetzte Tiefe/Hoehe in Metern
  confidence (string): "high" | "medium" | "low"`;
}

/**
 * Parse a raw Claude Vision text response into typed PlanElementCandidate[].
 *
 * Accepts:
 * - Pure JSON array input
 * - Markdown-fenced JSON (```json ... ```)
 * - JSON array surrounded by prose (extracts between first '[' and last ']')
 *
 * Never throws — returns [] on any parse failure.
 */
export function parseElements(rawText: string): PlanElementCandidate[] {
  if (!rawText || typeof rawText !== 'string') return [];

  const parsed = safeParseJsonArray(rawText);
  if (!parsed) return [];

  const candidates: PlanElementCandidate[] = [];
  for (const entry of parsed) {
    if (!entry || typeof entry !== 'object') continue;
    const rec = entry as Record<string, unknown>;

    // Validate element_type (required, string, max 50 chars)
    const elementType = coerceString(rec['element_type'], MAX_ELEMENT_TYPE_LEN);
    if (!elementType) continue;

    // Validate label (fallback to element_type if missing)
    const label = coerceString(rec['label'], MAX_LABEL_LEN) || elementType;

    // Validate coordinates (all must be finite numbers)
    const xM = coerceNumber(rec['x_m']);
    const yM = coerceNumber(rec['y_m']);
    const widthM = coerceNumber(rec['width_m']);
    const heightM = coerceNumber(rec['height_m']);

    if (xM === null || yM === null || widthM === null || heightM === null) continue;

    // Validate confidence (default to 'medium' if invalid)
    const confidence = coerceConfidence(rec['confidence']);

    candidates.push({
      element_type: elementType,
      label,
      x_m: xM,
      y_m: yM,
      width_m: widthM,
      height_m: heightM,
      confidence,
    });
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

function coerceString(raw: unknown, maxLen: number): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.length > maxLen ? trimmed.substring(0, maxLen) : trimmed;
}

function coerceNumber(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string') {
    const n = Number(raw);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function coerceConfidence(raw: unknown): 'high' | 'medium' | 'low' {
  if (typeof raw === 'string' && VALID_CONFIDENCE.includes(raw as typeof VALID_CONFIDENCE[number])) {
    return raw as 'high' | 'medium' | 'low';
  }
  return 'medium';
}
