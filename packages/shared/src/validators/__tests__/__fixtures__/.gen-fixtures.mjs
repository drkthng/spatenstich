// Phase 8 Plan 02: Generates the 4 plant-db-v1 fixtures.
// Run via: node packages/shared/src/validators/__tests__/__fixtures__/.gen-fixtures.mjs
// Output files are committed; this generator is committed too for reproducibility.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function basePlant(i) {
  const slug = `plant-${String(i).padStart(3, '0')}`;
  return {
    slug,
    nameDe: `Pflanze ${i}`,
    nameAltDe: [],
    nameBotanical: null,
    family: 'Testaceae',
    category: 'Gemüse',
    minSpacingCm: null,
    rowSpacingCm: null,
    depthCm: null,
    sunRequirement: 'sonnig',
    waterNeeds: 'mittel',
    climateZoneMin: null,
    climateZoneMax: null,
    sowOutdoorDoyStart: null,
    sowOutdoorDoyEnd: null,
    sowIndoorDoyStart: null,
    sowIndoorDoyEnd: null,
    plantDoyStart: null,
    plantDoyEnd: null,
    harvestDoyStart: null,
    harvestDoyEnd: null,
    daysToHarvest: null,
    nitrogenFixing: false,
    perennial: false,
    notesDe: null,
    iconEmoji: null,
    dataSource: 'own-research',
  };
}

const plants80 = Array.from({ length: 80 }, (_, i) => basePlant(i + 1));

mkdirSync(__dirname, { recursive: true });

// 1) Full valid bundle (≥80 plants, 1 valid canonical companion)
const full = {
  schemaVersion: 'plant-db.v1',
  plants: plants80,
  companions: [
    {
      plantASlug: 'plant-001',
      plantBSlug: 'plant-002',
      relationship: 'companion',
      source: 'own-research',
      notes: null,
    },
  ],
};
writeFileSync(join(__dirname, 'plant-db-v1.full.json'), JSON.stringify(full, null, 2) + '\n', 'utf8');

// 2) Invalid: self-companion (plantASlug === plantBSlug)
const selfCompanion = {
  schemaVersion: 'plant-db.v1',
  plants: plants80,
  companions: [
    {
      plantASlug: 'plant-001',
      plantBSlug: 'plant-001',
      relationship: 'companion',
      source: 'own-research',
      notes: null,
    },
  ],
};
writeFileSync(
  join(__dirname, 'plant-db-v1.invalid-self-companion.json'),
  JSON.stringify(selfCompanion, null, 2) + '\n',
  'utf8',
);

// 3) Invalid: unknown slugs (one with unknown plantASlug, one with unknown plantBSlug)
const unknownSlug = {
  schemaVersion: 'plant-db.v1',
  plants: plants80,
  companions: [
    {
      plantASlug: 'nonexistent-a',
      plantBSlug: 'plant-001',
      relationship: 'companion',
      source: 'own-research',
      notes: null,
    },
    {
      plantASlug: 'plant-002',
      plantBSlug: 'nonexistent-b',
      relationship: 'companion',
      source: 'own-research',
      notes: null,
    },
  ],
};
writeFileSync(
  join(__dirname, 'plant-db-v1.invalid-unknown-slug.json'),
  JSON.stringify(unknownSlug, null, 2) + '\n',
  'utf8',
);

// 4) Invalid: forbidden dataSource "gartenplaner" on first plant
const gartenplanerPlants = [
  { ...basePlant(1), dataSource: 'gartenplaner' },
  ...plants80.slice(1),
];
const gartenplaner = {
  schemaVersion: 'plant-db.v1',
  plants: gartenplanerPlants,
  companions: [],
};
writeFileSync(
  join(__dirname, 'plant-db-v1.invalid-gartenplaner.json'),
  JSON.stringify(gartenplaner, null, 2) + '\n',
  'utf8',
);

// eslint-disable-next-line no-console
console.log('Wrote 4 fixtures to', __dirname);
