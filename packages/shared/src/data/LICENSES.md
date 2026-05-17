# Plant Database Source Attribution

**Phase:** 8 — Plant-DB Foundation
**Updated:** Wave 0 stub (2026-05-17)

The `plants.json` bundle in this directory is curated from multiple sources. Per CONTEXT D-06 + PLANT-DB-09, every plant + companion entry's `dataSource` field MUST be one of the following allowed values. The literal string `"gartenplaner"` is FORBIDDEN as a value because the Gartenplaner CSV's license is unclear; facts from that CSV must be re-verified from public sources and tagged `"own-research"`.

## Allowed `dataSource` Values

| Value | License | Use |
|-------|---------|-----|
| `gardeneus` | MIT (https://github.com/gardeneus/gardeneus) | Schema-Vorlage, Botanical names, Family assignments |
| `garden-planner` | MIT (https://github.com/ref-garden-planner) | Companion/Avoid arrays |
| `own-research` | n/a (re-derived facts) | German names + Mischkultur-Beziehungen re-verified from Wurzelwerk, Kleingartenkompendium, OBI Garten, Permakultur-Plattform, BKleingG resources |
| `merged` | mixed | Multi-source consensus on a field |

## Forbidden

- `"gartenplaner"` (literal value): The Gartenplaner CSV (`D:\AiProjects\ref-Gartenplaner\Pflanznachbarn.csv` + `aussaatkalender.csv`) has no explicit MIT/permissive license. Facts (plant names, companion relationships) are not copyrightable, so we may use them — but the source attribution must be `"own-research"` after re-verification from a primary source.

## Per-Source Counts (Wave 2 Curation, 2026-05-17)

Counts of `dataSource` / `source` field values across the curated `plants.json` bundle.

### plants[].dataSource

| Value | Count | Notes |
|-------|-------|-------|
| `gardeneus` | 1 | Schema-Vorlage + Botanical-Family-Zuordnung (busch-bohne anchor verbatim) |
| `garden-planner` | 0 | (Reserved for direct lifts from ref-garden-planner; none in this wave — all facts re-verified) |
| `own-research` | 78 | German names + Mischkultur-Beziehungen re-verified from Wurzelwerk, Kleingartenkompendium, OBI, Permakultur-Plattform, BKleingG |
| `merged` | 11 | Multi-source consensus (tomate, basilikum, erdbeere, brokkoli, kartoffel, kürbis-hokkaido, mais, stangen-bohne, tagetes anchor pairs) |

### companions[].source

| Value | Count |
|-------|-------|
| `gardeneus` | 6 |
| `garden-planner` | 0 |
| `own-research` | 25 |
| `merged` | 7 |

**Total plants:** 90
**Total companion pairs:** 38

*(Counts computed via `node -e 'const b=require("./plants.json");...'` after Wave 2 commit.)*

## Enforcement

- Build-time: JSON Schema enum on `dataSource` rejects any non-allowed literal at ajv-validate time.
- Test-time: `plants.smoke.test.ts` PLANT-DB-09 anchor explicitly asserts `expect(allowed.has(p.dataSource)).toBe(true)`.

*This file is a PR-review aid; no runtime code depends on it.*
