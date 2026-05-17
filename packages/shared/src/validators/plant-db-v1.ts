// Phase 8 Plan 01: JSON Schema validation für plant-db.v1 bundles.
// Mirror of app/src/lib/importValidator.ts pattern, located in shared package so
// both the build-time Jest smoke test AND the seed-plants Edge Function (Wave 3)
// can import it.
//
// STATUS (Wave 0): Stub. Wave 1 fills the cross-reference checks (slug-existence,
// self-companion forbidden, duplicate-pair detection).

import Ajv2020 from 'ajv/dist/2020'; // NOT default ajv import — Metro/Jest Kompat (RESEARCH Pitfall 3)
import addFormats from 'ajv-formats';
import schema from '../schemas/plant-db.v1.json';

// ── Module-level compilation (RESEARCH Pitfall: NICHT in Funktion) ─────────
const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);

export type PlantBundleValidationResult =
  | { ok: true }
  | { ok: false; errors: string[] };

export function validatePlantBundle(raw: unknown): PlantBundleValidationResult {
  const valid = validate(raw);
  if (!valid) {
    const errors = (validate.errors ?? []).map((e) => {
      const path = e.instancePath || '(root)';
      return `${path}: ${e.message ?? 'ungültig'}`;
    });
    return { ok: false, errors };
  }
  // TODO Wave 1: cross-ref checks — slug-existence, self-companion forbidden,
  // duplicate-canonical-pair detection. See 08-RESEARCH.md §Pattern 3 lines 596-630.
  return { ok: true };
}
