# M07 — Pivot to manual planning + Claude.ai project bridge

> Spec-driven, GSD format. Front-loaded: read top-down, stop when you have enough.

## Task

Remove all in-app AI photo-analysis from Spatenstich. Replace with a user-guided manual garden-plan creation flow, **plus** a one-way bridge that lets an external Claude.ai project handle photo analysis and emit structured payloads the app can import.

The Claude.ai project lives on Dirk's personal Max subscription and is **not** part of Spatenstich's product surface. From the app's perspective, imports are just "user-supplied structured data." The bridge is what makes the parallel workflow feel native.

## Context

**Why we're pivoting**
- Original plan called for Claude Vision API + Pl@ntNet inside the app. Both are pay-per-token / pay-per-call. Out of scope for v1 economics.
- Replacement: manual garden planning in-app, AI work happens in Dirk's claude.ai "Spatenstich Garden" project on his Max plan, results bridge into the app via structured import.

**Workflow (target)**
1. **In garden, on phone**: Dirk opens claude.ai mobile app → "Spatenstich Garden" project → snaps photos → conversational analysis grounded in BKleingG / Saxon RKO / Leipzig regs → project emits a `spatenstich-import.v1` JSON payload at the end of each useful turn.
2. **Transfer**: Dirk exports the payload as a `.json` file (Claude file-creation feature on Max), shares to Spatenstich via OS share sheet — or pastes the JSON block via fallback paste input.
3. **At home/in app**: Spatenstich shows an import preview screen. Dirk picks which beds, plants, observations, and compliance flags to accept. Accepted entities become drafts that the manual garden-plan editor can use as building blocks.

**Stack**
- Expo / React Native client (iOS + Android)
- Supabase backend, Frankfurt region, RLS on every table
- No new third-party services introduced by this milestone

## Constraints

- **Hard:** zero outbound AI calls from the app. No Anthropic SDK, no Pl@ntNet, no Replicate, nothing.
- **Hard:** import flow must function offline-first on mobile (Kleingarten signal is unreliable).
- **Hard:** photo source files stay on the user's device or in their claude.ai chat. Spatenstich imports analysis, not images. (User can manually attach a thumbnail to a bed later if they want.)
- **Soft:** schema should be readable enough that Dirk can hand-edit a payload before import if Claude misidentified something.
- **Soft:** keep manual entry the default path. Import is a power-user accelerator, not a required workflow.

## Deliverables

1. **`docs/specs/M07-claude-ai-bridge.md`** (this doc, finalized)
2. **`schemas/spatenstich-import.v1.json`** — JSON Schema for the import payload
3. **`prompts/garden-project-system-prompt.md`** — companion Claude.ai project system prompt (to be authored next; this milestone produces the contract it must satisfy, not the prompt itself)
4. **Code changes**:
   - Removal: Claude Vision client, Pl@ntNet client, associated env vars, screens, tests, telemetry events
   - Addition: `ImportFromClaudeAiScreen`, share-intent handler, JSON validator, Supabase tables for drafts + provenance

## Data contract — `spatenstich-import.v1`

Stable shape that the Claude.ai project must emit. Versioned because it will evolve.

```jsonc
{
  "schemaVersion": "spatenstich-import.v1",
  "capture": {
    "timestamp": "2026-05-08T14:32:00+02:00",
    "location": { "lat": 51.34, "lon": 12.37 },   // optional, EXIF or user-provided
    "photoRefs": ["IMG_2415.jpg"],                 // filename hints only, no payload
    "chatReference": "https://claude.ai/chat/..."  // optional, for provenance
  },
  "beds": [
    {
      "localId": "bed-a",
      "label": "Hochbeet Nordseite",
      "approxDimensions": { "lengthCm": 200, "widthCm": 80 },
      "sunExposure": "halfShade",      // full | half | shade | mixed
      "soilNotes": "lehmig, mulchig",
      "confidence": 0.85
    }
  ],
  "plants": [
    {
      "localId": "plant-1",
      "bedRef": "bed-a",
      "scientificName": "Beta vulgaris subsp. cicla",
      "commonNameDe": "Mangold",
      "stageEstimate": "vegetative",   // seedling | vegetative | flowering | fruiting | senescent
      "healthNotes": "leichter Schneckenfraß",
      "confidence": 0.72
    }
  ],
  "observations": [
    {
      "localId": "obs-1",
      "bedRef": "bed-a",
      "kind": "pest",                  // pest | disease | weather | soil | structural | other
      "summary": "Schnecken aktiv, Nachtschäden",
      "suggestedActions": ["Schneckenkorn Eisen-III", "Bierfalle"]
    }
  ],
  "complianceFlags": [
    {
      "regulation": "BKleingG §1 Abs. 1",
      "status": "compliant",           // compliant | warn | violation
      "note": "Gartennutzung gärtnerisch, kein dominanter Rasen"
    }
  ],
  "freeFormNotes": "Markdown allowed here for anything that doesn't fit the schema."
}
```

**Required:** `schemaVersion`, `capture.timestamp`, at least one of `beds | plants | observations`.
**Stable IDs:** every entity has a `localId` so re-imports can update rather than duplicate.

## Milestones

Sequenced. Each must close before the next opens. No parallel work — too easy to drift the contract.

### M07.1 — Removal

- Delete Claude Vision API client, Pl@ntNet client, env vars (`ANTHROPIC_API_KEY`, `PLANTNET_API_KEY`), associated screens, related test fixtures, telemetry events.
- Update onboarding to drop AI promises.
- README + privacy policy scrubbed of AI-call language.

**Acceptance**
- `grep -ri "anthropic\|plantnet\|vision" src/` returns no functional code, only comments referencing the historical pivot.
- App builds and ships green on iOS + Android.
- App makes zero outbound network calls beyond Supabase + Expo update channel.

### M07.2 — Schema & spec

- Author `schemas/spatenstich-import.v1.json` (JSON Schema, draft 2020-12).
- Three reference payloads in `schemas/examples/`: `full.json`, `minimal.json`, `edge-cases.json` (low confidence, missing optional fields, multilingual notes).
- This spec doc finalized and merged.

**Acceptance**
- All three example payloads validate against the schema.
- Schema review with Dirk → signed off in PR.

### M07.3 — Companion project prompt

- Write `prompts/garden-project-system-prompt.md` for the claude.ai "Spatenstich Garden" project.
- Must cover: BKleingG, Saxon RKO, Leipzig allotment-specific rules, plant-ID heuristics for Central European climate zone 7a, output format constraint (every photo-analysis turn ends with a fenced ` ```json ` block conforming to v1).
- Include setup instructions for Dirk: project name, knowledge files to attach (BKleingG text, RKO text, Leipzig Pachtvertrag template), preferred model (Opus 4.7).

**Acceptance**
- Three test garden photos → three valid v1 payloads on first try, no manual reformatting needed.
- Prompt explicitly refuses to emit a payload if photo is unclear, instead asking for a re-shot. (Don't fabricate; ask.)

### M07.4 — Import flow (app)

- New screen: `ImportFromClaudeAiScreen`.
- **Two entry paths:**
  - **Share intent (preferred):** register app as handler for `application/json` files and a custom URL scheme `spatenstich://import`. User shares JSON file from claude.ai (file-creation export) → OS share sheet → Spatenstich.
  - **Paste fallback:** large textarea for cases where share isn't available (e.g., desktop claude.ai chat, sync to phone via clipboard manager).
- **Preview screen:** parsed entities rendered as a diff against current garden state. User toggles which to accept. Confidence below threshold (0.6) shown with warning chip.
- **Persistence:** Supabase tables `imports`, `import_items`, `bed_drafts`, `plant_drafts`, `observation_drafts`, all RLS-scoped to user.

**Acceptance**
- Round-trip test: hand-crafted payload → share intent → preview → confirm → entities visible as drafts in garden editor.
- Invalid payload shows actionable error (`schemaVersion missing`, `unknown bedRef`, etc.) with a "Copy current schema" button that puts the schema on the clipboard so Dirk can paste it back into the claude.ai project to re-align.
- All imports tagged with `source: "claude-ai-project"`, `importedAt`, optional `chatReference`.

### M07.5 — Drafts as plan-editor building blocks

- Imported drafts surface in the manual garden-plan editor as a "Recent imports" tray.
- User can drag a bed draft onto the plan canvas; accepting a plant draft into a bed lifts it to a real planted entity.
- Drafts not promoted within 30 days flagged in a "Stale imports" view, never auto-deleted.

**Acceptance**
- User can build a complete garden plan entirely from imported drafts, no manual entry required.
- Provenance preserved on every promoted entity (`importedFrom: "import-uuid"`).

## Out of scope (M07)

- Two-way sync (Spatenstich state → Claude.ai context). Maybe M09.
- Automatic re-analysis on photo update.
- Multi-user import sharing.
- Web/desktop Spatenstich client.
- Pl@ntNet replacement of any kind.

## Risks & mitigations

- **Schema drift between project prompt and app.** The claude.ai project prompt has no formal link to the app's schema repo. → App rejects unknown `schemaVersion` with "Copy current schema" affordance. Schema changes bump version; old versions get a one-release deprecation warning before removal.
- **Hallucinated plants accepted as truth.** → Confidence field required per plant; preview warns below 0.6; user must explicitly accept low-confidence items (no bulk-accept-all for those).
- **Photo geo-metadata leaks via claude.ai.** Out of app's control but documented in the project setup guide. Dirk's call whether to strip EXIF before upload.
- **User loses the JSON file before importing.** → claude.ai chat history is the source of truth; project prompt instructs Claude to retain the last payload and re-emit on request ("re-emit last payload as JSON").

## Definition of done (milestone-wide)

- All five sub-milestones closed
- Spec doc, schema, prompt, code, tests merged
- Dirk completes one full real-world dry run: photo in garden → claude.ai analysis → JSON export → share to Spatenstich on his phone → garden plan updated → no manual re-entry needed
- README "How to use the Claude.ai bridge" section shipped

---
*Created: 2026-05-08 — M07 Pivot (Manual Planning + Claude.ai Bridge)*
