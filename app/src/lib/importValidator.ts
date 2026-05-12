// Phase 6 Plan 06-02: JSON Schema validation für spatenstich-import.v1 payloads.
// Nutzt ajv draft-2020-12 + ajv-formats für date-time Validierung.
// Schema wird auf Modul-Ebene kompiliert (nicht in der Funktion) — Performance (Pitfall 3).
// Cross-Reference-Check: plants.bedRef muss auf existierende beds[].localId zeigen (D-12).

import Ajv2020 from 'ajv/dist/2020'; // NOT default ajv import — Metro/Jest Kompat (Pitfall 2)
import addFormats from 'ajv-formats';
import schema from '../../../schemas/spatenstich-import.v1.json';
import type { ImportPayload, ImportPayloadBed, ImportPayloadPlant } from '@spatenstich/shared';

// ── Module-level compilation (Pitfall 3: NICHT in Funktion) ─────────────────

const ajv = new Ajv2020({ allErrors: true });
addFormats(ajv);
const validate = ajv.compile(schema);

// ── Types ────────────────────────────────────────────────────────────────────

export type ValidationResult =
  | { ok: true; payload: ImportPayload }
  | { ok: false; errors: string[] };

// ── validatePayload ──────────────────────────────────────────────────────────

/**
 * Validates a raw unknown value against the spatenstich-import.v1 JSON Schema.
 * Also performs cross-reference check: every plant.bedRef must reference an
 * existing bed.localId (D-12).
 *
 * Returns { ok: true, payload } on success or { ok: false, errors } on failure.
 * Error messages are actionable and partially in German (bedRef errors).
 */
export function validatePayload(raw: unknown): ValidationResult {
  // JSON Schema validation via ajv
  const valid = validate(raw);
  if (!valid) {
    const errors = (validate.errors ?? []).map((e) => {
      const path = e.instancePath || '(root)';
      return `${path}: ${e.message ?? 'ungültig'}`;
    });
    return { ok: false, errors };
  }

  // Cross-reference check: plants.bedRef must reference a known bed (D-12)
  const payload = raw as unknown as ImportPayload;
  const bedIds = new Set((payload.beds ?? []).map((b: ImportPayloadBed) => b.localId));
  const crossRefErrors: string[] = [];

  for (const plant of (payload.plants ?? []) as ImportPayloadPlant[]) {
    if (plant.bedRef && !bedIds.has(plant.bedRef)) {
      crossRefErrors.push(
        `plant "${plant.localId}": unbekannte bedRef "${plant.bedRef}"`,
      );
    }
  }

  if (crossRefErrors.length > 0) {
    return { ok: false, errors: crossRefErrors };
  }

  return { ok: true, payload };
}
