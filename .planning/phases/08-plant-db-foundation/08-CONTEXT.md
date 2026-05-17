# Phase 8: Plant-DB Foundation - Context

**Gathered:** 2026-05-17
**Status:** Ready for planning
**Mode:** `--auto` — Claude selected recommended defaults; user can override before planning by editing this file.

<domain>
## Phase Boundary

Zentrale, deutschsprachige Pflanzen-Datenbank mit allen Infos die Phase 9 (Companion-Hinweis) und Phase 10 (Aussaatkalender) brauchen. Ziel: 100-120 für deutsche Kleingärten relevante Pflanzen mit reichem Schema, ready-to-query.

**Im Scope:**
- Schema-Design (Tabellen `plants` + `plant_companions`)
- Migration 019 (DDL + Constraints + RLS)
- Daten-Seed: JSON-Datei in `packages/shared/src/data/plants.json` + Companion-Pairs aus mehreren Quellen gemerged
- Seed-Mechanismus (Edge Function oder idempotente DB-Migration)
- TypeScript-Types in shared package
- Repo + Hook für Lookup (`plantRepo.ts`, `usePlants()`)
- Offline-First: JSON-Bundle als Cold-Start-Fallback, danach Supabase als Source-of-Truth
- Smoke-Tests: Daten-Qualitätsprüfung (Familien stimmen, kein Pflanze-mit-sich-selbst-Companion, etc.)

**NICHT im Scope (kommt in Phase 9 + 10):**
- UI für Companion-Hinweise (Phase 9)
- UI für Aussaatkalender (Phase 10)
- Saatgut-Inventar (Phase 13 v1.2)
- Crop-Family-Rotation-History (Phase 15 v1.3)
- Foto-IDs / Plant-ID-API (M07-Pivot ausgeschlossen — nie)

</domain>

<decisions>
## Implementation Decisions

### Datenmodell

- **D-01:** **Supabase als Source-of-Truth + JSON-Bundle als Offline-Fallback.** Zwei `plants`-bezogene Tabellen in Supabase. `packages/shared/src/data/plants.json` enthält gleichen Datensatz für Cold-Start (App startet immer mit Pflanzen verfügbar, auch ohne Netz). TanStack Query lädt aus Supabase und cached lokal nach First-Launch.

- **D-02:** **`plants`-Tabelle Schema** (Migration 019, Section 1):
  ```sql
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
  slug            text UNIQUE NOT NULL     -- e.g. 'tomate', 'busch-bohne', stabil für JSON-Refs
  name_de         text NOT NULL            -- Deutscher Hauptname, z.B. "Tomate"
  name_alt_de     text[]                   -- Synonyme: "Paradeiser", "Liebesapfel"
  name_botanical  text                     -- "Solanum lycopersicum"
  family          text NOT NULL            -- "Solanaceae" (für Phase 15 Fruchtfolge)
  category        text NOT NULL            -- enum: Gemüse | Kraut | Beere | Obstbaum | Blume
  min_spacing_cm  integer                  -- Pflanzabstand
  row_spacing_cm  integer                  -- Reihenabstand (oft != min_spacing)
  depth_cm        decimal                  -- Pflanztiefe
  sun_requirement text NOT NULL            -- enum: sonnig | halb_schattig | schattig
  water_needs     text NOT NULL            -- enum: niedrig | mittel | hoch
  climate_zone_min integer                 -- 5-9 USDA-Zone (DE: 6-8 typisch)
  climate_zone_max integer
  -- Phänologie (relative zu Frost-Daten oder ISO-DOY-Bereiche)
  sow_outdoor_doy_start integer            -- Day-of-year start (z.B. 90 = 31. März)
  sow_outdoor_doy_end   integer            -- (z.B. 180 = 28. Juni)
  sow_indoor_doy_start  integer            -- Vorkultur im Haus
  sow_indoor_doy_end    integer
  plant_doy_start  integer                 -- Auspflanzen ins Beet
  plant_doy_end    integer
  harvest_doy_start integer
  harvest_doy_end   integer
  days_to_harvest  integer                 -- Tage Saat→Ernte (für Succession-Berechnung)
  -- Nice-to-have
  nitrogen_fixing  boolean DEFAULT false   -- Bohnen, Erbsen → Phase 15
  perennial        boolean DEFAULT false   -- Obstbäume, Beerensträucher
  notes_de         text                    -- Freitext-Anbauhinweise auf Deutsch
  icon_emoji       text                    -- 🍅 für UI-Polish
  data_source      text NOT NULL           -- "gardeneus" | "garden-planner" | "gartenplaner" | "own-research" | "merged"
  created_at       timestamptz DEFAULT now()
  updated_at       timestamptz DEFAULT now()
  ```

- **D-03:** **`plant_companions`-Tabelle Schema** (Migration 019, Section 2):
  ```sql
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
  plant_a_id  uuid NOT NULL REFERENCES plants(id) ON DELETE CASCADE
  plant_b_id  uuid NOT NULL REFERENCES plants(id) ON DELETE CASCADE
  relationship text NOT NULL CHECK (relationship IN ('companion', 'incompatible', 'neutral'))
  source       text NOT NULL             -- "gartenplaner" | "gardeneus" | "garden-planner" | "merged" | "own-research"
  notes        text                       -- Begründung, optional
  created_at   timestamptz DEFAULT now()
  UNIQUE (plant_a_id, plant_b_id)
  CHECK (plant_a_id < plant_b_id)         -- canonical ordering — speichert jede Beziehung 1×
  ```
  **Speicher-Konvention:** Beziehungen werden **kanonisch** (kleinere UUID first) gespeichert. Query-Helper `getCompanionsFor(plantId)` macht UNION von beiden Richtungen.

- **D-04:** **RLS für `plants` und `plant_companions`**: Read-only für authentifizierte User. Keine Mutationen vom Client; Updates nur via Migration oder Service-Role Edge Function. Policy `plants_read_all`: `auth.uid() IS NOT NULL`. Lokaler Modus (kein Account) liest aus dem JSON-Bundle — nie aus Supabase — also keine RLS-Probleme.

### Daten-Inhalt

- **D-05:** **Pflanzen-Auswahl: 100-120 Einträge fokussiert auf deutsche Kleingärten** (Klimazone 7a-8a, Mitteldeutschland inkl. Leipzig wo Dirk seinen Garten hat). Verteilung ungefähr:
  - **Gemüse (~45):** Tomate, Gurke, Zucchini, Kürbis (3 Arten), Möhre, Pastinake, Rote Beete, Radieschen, Rettich, Sellerie, Knollensellerie, Petersilienwurzel, Weißkohl, Rotkohl, Blumenkohl, Brokkoli, Rosenkohl, Wirsing, Grünkohl, Kohlrabi, Pak Choi, Mangold, Spinat, Kopfsalat, Eichblattsalat, Rucola, Feldsalat, Pflücksalat, Endivie, Buschbohne, Stangenbohne, Erbse, Zuckererbse, Mais, Aubergine, Paprika, Chili, Kartoffel, Topinambur, Lauch, Frühlingszwiebel, Speisezwiebel, Knoblauch, Schalotte, Artischocke
  - **Kräuter (~20):** Basilikum, Petersilie (glatt + kraus), Schnittlauch, Thymian, Rosmarin, Oregano, Salbei, Liebstöckel, Dill, Kümmel, Koriander, Estragon, Bohnenkraut, Pfefferminze, Zitronenmelisse, Kerbel, Lavendel, Borretsch, Kapuzinerkresse, Tagetes
  - **Beeren (~10):** Erdbeere, Himbeere, Brombeere, Johannisbeere rot, Johannisbeere schwarz, Johannisbeere weiß, Stachelbeere, Heidelbeere, Holunder, Sanddorn
  - **Obstbäume (~8):** Apfel, Birne, Süßkirsche, Sauerkirsche, Pflaume, Mirabelle, Quitte, Walnuss
  - **Klassische Mischkultur-Begleiter (~5):** Ringelblume, Studentenblume (= Tagetes, ggf. nur einmal), Borretsch (auch in Kräuter), Kapuzinerkresse (auch in Kräuter), Sonnenblume, Phacelia (Gründüngung)

- **D-06:** **Daten-Quellen-Strategie & License-Hygiene:**
  - **Gardeneus** (MIT): Schema-Vorlage, Englische Namen + Familien-Zuordnung (frei copyable)
  - **garden-planner** (MIT): Companion/Avoid-Arrays (frei copyable)
  - **Gartenplaner** (License unclear ⚠): Wir KOPIEREN keine CSV-Zeilen verbatim. Wir nehmen die deutschen Pflanzennamen + Mischkultur-Beziehungen als FAKTEN auf (Fakten sind nicht copyrightbar) und re-recherchieren aus Public-Domain-Quellen (BKleingG-Texten, Naturschutzbund, Mein Schöner Garten, etc.). Jede Quelle pro Datenfeld dokumentiert in `data_source`.
  - **Eigene Recherche**: Wo Quellen uneinig sind oder Daten fehlen, dokumentierte Eigenrecherche mit Begründung.

- **D-07:** **Companion-Konflikt-Resolution**: Wenn Quelle A sagt "X+Y companion" und Quelle B sagt "X+Y incompatible" → **konservativ: `relationship = 'neutral'`** mit `notes = "Quellen uneinig: A sagt companion, B sagt incompatible"`. Phase 9 zeigt weder roten noch grünen Banner für `neutral`.

### Code-Architektur

- **D-08:** **TypeScript-Types in `packages/shared/src/types/plants.ts`**:
  ```typescript
  export interface PlantRow {
    id: string; slug: string; nameDe: string; nameAltDe: string[]; nameBotanical: string | null;
    family: string; category: 'Gemüse'|'Kraut'|'Beere'|'Obstbaum'|'Blume';
    minSpacingCm: number | null; rowSpacingCm: number | null; depthCm: number | null;
    sunRequirement: 'sonnig'|'halb_schattig'|'schattig'; waterNeeds: 'niedrig'|'mittel'|'hoch';
    climateZoneMin: number | null; climateZoneMax: number | null;
    sowOutdoorDoyStart: number | null; sowOutdoorDoyEnd: number | null;
    sowIndoorDoyStart: number | null; sowIndoorDoyEnd: number | null;
    plantDoyStart: number | null; plantDoyEnd: number | null;
    harvestDoyStart: number | null; harvestDoyEnd: number | null;
    daysToHarvest: number | null; nitrogenFixing: boolean; perennial: boolean;
    notesDe: string | null; iconEmoji: string | null;
    dataSource: string; createdAt: string; updatedAt: string;
  }
  export interface PlantCompanionRow {
    id: string; plantAId: string; plantBId: string;
    relationship: 'companion'|'incompatible'|'neutral';
    source: string; notes: string | null;
  }
  ```

- **D-09:** **Repo in `app/src/lib/plantRepo.ts`**: Functions `loadAllPlants()`, `loadPlantBySlug(slug)`, `loadCompanionsFor(plantId)` (returns `{ companions: PlantRow[], incompatible: PlantRow[], neutral: PlantRow[] }`), `searchPlants(query)` (fuzzy match auf `nameDe` + `nameAltDe`).

- **D-10:** **Hook in `app/src/hooks/usePlants.ts`** mit TanStack Query. Erste Query lädt JSON-Bundle synchron (instant), parallel Supabase-Request; bei Erfolg merged. Cache: 24h stale, 7 Tage gc.

- **D-11:** **JSON-Bundle bei `packages/shared/src/data/plants.json`** — versioniert mit Schema-Version-Header (`{ "schemaVersion": "plant-db.v1", "plants": [...], "companions": [...] }`). Build-Zeit-Validation via ajv (gleiche Pattern wie spatenstich-import.v1).

### Migration + Seed

- **D-12:** **Migration 019** = Schema only (CREATE TABLE plants + plant_companions + Indizes + RLS).
- **D-13:** **Seed-Mechanismus:** Separate Edge Function `seed-plants` (idempotent: löscht & re-inserted oder upsert by slug). Aufruf manuell nach Migration-Push. JSON wird vom Function aus dem `packages/shared/src/data/plants.json` File gelesen (kopiert ins Function-Deployment).
- **D-14:** **Seed-Idempotenz:** `INSERT ... ON CONFLICT (slug) DO UPDATE SET ...` für `plants`; für `plant_companions` clear-and-rebuild (Tabelle ist klein, einfacher als diff).
- **D-15:** **Migration-Push-Gate**: Pattern von Phase 6.5 P05 + Phase 7 P06: pre-flight `migration list --linked` → `db push --dry-run --yes` → real push. Bei Fehler checkpoint:human-action.

### Daten-Qualität

- **D-16:** **Smoke-Tests in Wave-0** (Jest, neue Project `plants` oder im `node`-Project):
  - JSON-Bundle parst gegen Schema (ajv)
  - Mindestens 80 Pflanzen
  - Jede Pflanze hat: slug (unique), nameDe (non-empty), family, category
  - Bekannte Anker-Tests: Tomate hat Familie `Solanaceae`; Erdbeere hat `Rosaceae`; Buschbohne ist `nitrogenFixing=true`; Apfel ist `perennial=true`; Tomate.companions enthält Basilikum
  - Companion-Tabelle: keine Self-References (plant_a_id !== plant_b_id), kanonische Ordnung (plant_a_id < plant_b_id)

- **D-17:** **Daten-Pflege-Workflow für die Zukunft**: JSON-Datei editieren → PR → Smoke-Tests müssen grün sein → merge → Edge Function neu deployen → seed-plants manuell triggern. Nicht direkt in Supabase Dashboard editieren — geht sonst beim nächsten Seed verloren.

### Roadmap Bookkeeping

- **D-18:** **REQUIREMENTS.md Phase→Plan-Mapping wird in Phase 8 Wave 1 inline aktualisiert** (Migration 019 + new PLANT-DB-* requirements registry naturally touch REQUIREMENTS.md anyway). Specifically: (a) insert 9 new PLANT-DB-01..PLANT-DB-09 entries mapped to Phase 8; (b) re-map SEED-02..SEED-06 from `Phase 8` to `Phase 13` (Saatgut-Inventar pivot per ROADMAP); (c) re-map CAL-01..CAL-06 from `Phase 9` to `Phase 10` (Aussaatkalender pivot per ROADMAP). The CAL-* and SEED-* re-mappings are part of the **v1.1 hot-path roadmap restructure dated 2026-05-17**, bundled here for one-pass file edit rather than spread across multiple phases. Authority: ROADMAP.md as of 2026-05-17 (which already reflects the new phase numbering); REQUIREMENTS.md catches up.

### Claude's Discretion
- Exakte Pflanzenliste-Reihenfolge (alphabetisch im JSON für Diff-Lesbarkeit)
- Genaue DOY-Werte pro Pflanze (Mitteldeutschland-Standardwerte; spätere Klimazonenspezifische Variation in Phase 10)
- icon_emoji-Auswahl pro Pflanze (Unicode 14+ unterstützt fast alles)
- Wave-Aufteilung (Vermutlich: W0 test scaffold, W1 Migration + Types, W2 JSON-Datenpflege + Smoke-Tests, W3 Repo + Hook + Edge Function + Push)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase-Spezifikation
- `.planning/ROADMAP.md` §"Phase 8: Plant-DB Foundation" — 6 Success Criteria
- `.planning/roadmap-proposal-2026-05-17.md` §"Phase 8 — Plant-DB Foundation" — Strategische Begründung + Lift-Strategie

### Reference-Repos (geklont in `D:\AiProjects\`)
- `D:\AiProjects\gardeneus\app\db\plants.ts` — 78 Pflanzen Schema-Vorlage (MIT, frei copyable)
- `D:\AiProjects\gardeneus\app\lib\plant-families.ts` — 18 Familien-Definitionen (für Phase 15 wichtig, jetzt nur Familien-Strings)
- `D:\AiProjects\gardeneus\app\lib\companion-scoring.ts` — Beet-Empfehlungs-Algorithmus (für Phase 9)
- `D:\AiProjects\ref-garden-planner\index.html` lines ~1975-2811 — 55 Pflanzen JSON + Banner-Pattern (MIT, frei copyable)
- `D:\AiProjects\ref-Gartenplaner\Pflanznachbarn.csv` — 28 deutsche Pflanzen + Mischkultur-Pairs (License unclear — nur als Faktenquelle, nicht copy)
- `D:\AiProjects\ref-Gartenplaner\aussaatkalender.csv` — 84 Pflanzen Aussaat-Wochen (License unclear — nur als Faktenquelle, nicht copy)

### Existing Code (Integration Points)
- `supabase/migrations/20260513000018_plan_elements_layer.sql` — Vorlage für Migration 019 (DO-block invariant pattern, RLS, section divider style)
- `app/src/lib/gardenPlanRepo.ts` — Pattern für Repo-Funktionen (loadX, writeX mit assertAccount)
- `packages/shared/src/types/entities.ts` — Vorlage für Type-Definitionen
- `packages/shared/src/validators/spatenstich-import-v1.ts` — Pattern für ajv-Schema-Validation
- `app/src/lib/__tests__/i18n.review-keys.test.ts` — Pattern für JSON-Daten-Smoke-Tests
- `supabase/functions/*` — Existing Edge Functions als Pattern für `seed-plants` Function

### Prior Phase Contexts
- `.planning/phases/06.5-draft-sichtung-promotion/06.5-PATTERNS.md` — Pattern-Mapping für Migration + Mapper
- `.planning/phases/07-plan-editor-drafts-integration-m2-m07-5/07-CONTEXT.md` — D-16 Migration 018 Pattern (relevant für 019)
- `.planning/phases/06-import-flow-companion-prompt-m07-3-m07-4/06-CONTEXT.md` D-17..D-19 — Tabellen mit garden-scoped RLS (Plant-DB ist global, nicht garden-scoped, anderes Pattern)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Migration-Pattern** (Phase 6.5 P02 + Phase 7 P02): DO-block invariants, section dividers, idempotent ADD COLUMN. Migration 019 folgt exakt diesem Pattern.
- **Repo + assertAccount** (Phase 4 + Phase 6.5): pattern für CRUD-Funktionen. Pflanzen sind global lesbar (keine garden-scope) — `assertAccount` muss adaptiert werden (Account-required für Supabase-Path, optional für JSON-Bundle-Fallback).
- **ajv-Validator** (Phase 5 spatenstich-import): pattern für Schema-Validation auf Modul-Ebene.
- **TanStack Query** (Phase 1+): bereits installiert, Query-Pattern etabliert in importStore.
- **Test-Scaffold-Pattern** (Phase 6.5 P01): Wave-0 it.todo() Stubs → spätere Waves filling.

### Established Patterns
- **JSON-Bundle im shared package**: `packages/shared/src/i18n/de.json` ist das Vorbild — versioned, type-safe, lokal verfügbar.
- **Edge Function für Seed**: nicht etabliert — wäre die erste Edge Function nach M07-Cleanup. Vielleicht stattdessen reine SQL-Migration mit eingebettetem JSON (`COPY FROM PROGRAM` oder pure INSERTs).
- **Read-only Tabellen**: Migration 015 hat ai_tables gedroppt (gleiches Konzept: Tables die nicht via App geschrieben werden). RLS-Pattern dafür ist: `FOR SELECT TO authenticated USING (true);` ohne WRITE-Policy.

### Integration Points
- Phase 9 (Companion-Hinweis) liest via `loadCompanionsFor(plantId)` → muss in Phase 8 fertig sein
- Phase 10 (Aussaatkalender) liest via `loadPlantBySlug(slug)` und filtert nach `sowOutdoorDoyStart/End` × Klimazone
- Phase 13 (Saatgut-Inventar) v1.2 wird Plant-DB für Autocomplete nutzen (`searchPlants(query)`)

### Open Constraints
- **Edge Function Deploy auf Supabase Frankfurt**: bisher nicht verwendet seit M07-Pivot — Edge Function Deploy-Pattern muss frisch validiert werden (Deno + supabase functions deploy).
- **Embedded JSON in SQL Migration**: alternative zu Edge Function. Datei kann groß werden (>100KB?). Supabase migration files haben kein Limit, aber Lesbarkeit leidet.
- **Erste real-world Edge Function in unserem Stack post-M07**: könnte ein Architektur-Entscheid für die Zukunft sein (z.B. Cron-getriggerte Wartung).

</code_context>

<specifics>
## Specific Ideas

- **Slug als stabile Referenz**: `tomate`, `busch-bohne`, `johannisbeere-rot`, `apfel-elstar`. Slugs sind in JSON Datei die primären Keys; UUIDs werden in Supabase generiert und sind nur intern. Hooks/Repos verwenden Slug als Public-API.
- **Tomate-Sub-Sorten**: bewusst NICHT individuell modelliert ("Sorten" werden in Phase 13 Saatgut-Inventar mit user-erstellten Sub-Einträgen behandelt). In Phase 8 ist "Tomate" eine Pflanze, "Cherry-Tomate" wäre eventuell eine separate wenn Datenunterschiede groß genug.
- **Mehrjährige Pflanzen** (Obstbäume, Beeren): haben oft keine sinnvollen `days_to_harvest` (nicht jährlich gesät) — Felder bleiben NULL. Phase 10 muss damit umgehen.
- **Gründüngung** (Phacelia): als Kategorie "Blume" mit nitrogen_fixing=true. Spezialfall.
- **Companion-Beziehungen als symmetrisch behandeln**: wenn Tomate+Basilikum companion → auch Basilikum+Tomate companion. Storage kanonisch (UUID-Sort), Query symmetrisch.
- **Pflanze-mit-sich-selbst-Companion**: DB-CHECK `plant_a_id < plant_b_id` verhindert das implizit.
- **Migration-Nummer 019**: Migration 018 ist live; 019 ist nächste freie.

</specifics>

<deferred>
## Deferred Ideas

- **Pflanzen-Sorten/Varietäten** (z.B. "Tomate Brandywine" vs "Tomate San Marzano") — kommt in Phase 13 Saatgut-Inventar via user-eigene Tüten-Einträge. Plant-DB hat nur die Hauptart.
- **Klimazone-spezifische Aussaatdaten**: jetzt globale Mitteldeutschland-Werte; Klimazonen-Anpassung in Phase 10 via Offset zu Frost-Daten.
- **Multilingual** (Englisch / Polnisch / etc.): nur Deutsch in v1.x.
- **Bilder pro Pflanze**: emoji als Placeholder; richtige Bilder vielleicht in Phase 14 (Modernes Design).
- **Pl@ntNet-Integration für Foto-ID**: explizit per M07-Pivot ausgeschlossen — nie.
- **User-Custom-Pflanzen** (eigene Pflanze hinzufügen): noch nicht in Plant-DB. Wenn User eine Pflanze hinzufügt die nicht in der DB ist, müsste sie als Freitext im Plan-Element-Label oder Saatgut-Inventar-Eintrag landen. Vielleicht in Phase 17 als "User-Plants"-Tabelle.
- **Multi-Garden-Cross-Reference** (Pflanzen verschiedener Gärten teilen sich diesselbe globale DB): das ist DAS Design ab Phase 8 — global, nicht garden-scoped.
- **Companion-Stärke** (z.B. "schwach companion" vs "stark companion"): in v1 binary (companion/incompatible/neutral). Nuancen später.

### Reviewed Todos (not folded)
Keine offenen Todos in `.planning/todos/pending/`.

</deferred>

---

*Phase: 08-plant-db-foundation*
*Context gathered: 2026-05-17*
*Mode: `--auto` (Claude selected recommended defaults)*
