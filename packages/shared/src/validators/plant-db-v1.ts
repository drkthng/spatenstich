// Phase 8 Plan 02: JSON Schema validation für plant-db.v1 bundles (filled, Wave 1).
// Mirror of app/src/lib/importValidator.ts pattern, located in shared package so
// both the build-time Jest smoke test AND the seed-plants Edge Function (Wave 3)
// can import it.

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

  // Cross-reference checks (analog to importValidator.ts's plant.bedRef check):
  const bundle = raw as {
    plants: { slug: string }[];
    companions: { plantASlug: string; plantBSlug: string }[];
  };
  const slugs = new Set(bundle.plants.map((p) => p.slug));
  const crossRefErrors: string[] = [];

  for (const c of bundle.companions) {
    if (!slugs.has(c.plantASlug)) {
      crossRefErrors.push(`companion references unknown plantASlug "${c.plantASlug}"`);
    }
    if (!slugs.has(c.plantBSlug)) {
      crossRefErrors.push(`companion references unknown plantBSlug "${c.plantBSlug}"`);
    }
    if (c.plantASlug === c.plantBSlug) {
      crossRefErrors.push(`self-companion forbidden: "${c.plantASlug}"`);
    }
  }

  // Dedup check: canonical pair appears at most once (any direction).
  const pairCounts = new Map<string, number>();
  for (const c of bundle.companions) {
    const key =
      c.plantASlug < c.plantBSlug
        ? `${c.plantASlug}:${c.plantBSlug}`
        : `${c.plantBSlug}:${c.plantASlug}`;
    pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
  }
  for (const [key, n] of pairCounts) {
    if (n > 1) {
      crossRefErrors.push(`duplicate companion pair (any direction): ${key} (count=${n})`);
    }
  }

  if (crossRefErrors.length > 0) return { ok: false, errors: crossRefErrors };
  return { ok: true };
}
