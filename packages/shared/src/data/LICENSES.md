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

## Enforcement

- Build-time: JSON Schema enum on `dataSource` rejects any non-allowed literal at ajv-validate time.
- Test-time: `plants.smoke.test.ts` PLANT-DB-09 anchor explicitly asserts `expect(allowed.has(p.dataSource)).toBe(true)`.

*This file is a PR-review aid; no runtime code depends on it.*
