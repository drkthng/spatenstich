---
phase: 02-auth-profile-vereinsregeln
plan: "03"
subsystem: api
tags:
  [
    edge-function,
    anthropic,
    vereinsregeln,
    server,
    files-api,
    deno,
    abort-controller,
    prompt-injection-defense,
  ]

# Dependency graph
requires:
  - phase: 02-auth-profile-vereinsregeln
    provides:
      "vereinsregeln storage bucket (Migration 002), VereinsRegel shared type,
      BKLEINGG_REGELN seed constant, supabase client with LargeSecureStore"
  - phase: 01-foundation
    provides:
      "FOUND-06 triple-gate secrets pattern (Deno.env only, no EXPO_PUBLIC_
      for server keys, bundle-scan CI), ai-job-consumer Edge Function pattern
      (top-level clients, Deno.serve, json helper), Supabase CLI v2.90.0+
      manual deploy convention"
provides:
  - "extract-vereinsregeln Edge Function (Deno) — synchronous PDF → Claude → VereinsRegelCandidate[] extraction"
  - "parseRules pure module with deterministic prompt-injection defences (istBKleingG forced false, titel/beschreibung clamps, BKleingG seed de-dup)"
  - "EXTRACTION_PROMPT in German with BKleingG-exclusion instruction for claude-sonnet-4-6"
  - "extractVereinsregeln client wrapper with 55s AbortController + external AbortSignal support for UI Abbrechen button"
  - "ExtractVereinsregelnError taxonomy (invalid_input | timeout | cancelled | network | server)"
  - "_shared/cors.ts reusable CORS-header module for browser-invocable Edge Functions"
  - "Reusable supabase-functions.ts jest mock helper for future Edge-Function wrapper tests"
affects:
  - 02-04 (Vereinsregeln confirm screen — consumes extractVereinsregeln() + ExtractVereinsregelnError.code for UI error states)
  - Any future phase that adds a browser-invocable Edge Function (can reuse _shared/cors.ts)
  - Any future phase that tests a Supabase Edge-Function wrapper (can reuse __mocks__/supabase-functions.ts)

# Tech tracking
tech-stack:
  added:
    - "@anthropic-ai/sdk@^0.90.0 (Deno import map — beta.files Files API)"
    - "Anthropic Files API beta (anthropic-beta: files-api-2025-04-14)"
  patterns:
    - "Deno.env-only server secret access (FOUND-06 inherited)"
    - "Path-prefix defense-in-depth (storagePath.startsWith(userId/)) above SERVICE_ROLE download"
    - "Server-side post-processing of LLM output (istBKleingG always false regardless of LLM claim) — prompt-injection defence"
    - "String-length clamping on LLM output (titel 200 / beschreibung 1000) — prompt-injection defence"
    - "try/finally around Anthropic Files API calls — always delete uploaded file, even on error"
    - "Client 55s AbortController that fails BEFORE Supabase 60s Edge Function hard limit"
    - "Promise.race pattern at wrapper level when underlying SDK (supabase-js functions.invoke) cannot accept AbortSignal"
    - "External AbortSignal plumbed through input options — UI cancels (Abbrechen) propagate cleanly"

key-files:
  created:
    - supabase/functions/extract-vereinsregeln/deno.json
    - supabase/functions/extract-vereinsregeln/index.ts
    - supabase/functions/extract-vereinsregeln/parseRules.ts
    - supabase/functions/extract-vereinsregeln/__tests__/parseRules.test.ts
    - supabase/functions/_shared/cors.ts
    - app/src/lib/extractVereinsregeln.ts
    - app/src/lib/__tests__/extractVereinsregeln.test.ts
    - app/src/__mocks__/supabase-functions.ts
  modified:
    - .gitignore (ignore deno.lock files, matching Phase 01-03 ai-job-consumer convention)

key-decisions:
  - "@anthropic-ai/sdk bumped to ^0.90.0 (plan specified 0.30.1 but that release lacks beta.files API — blocking Rule-3 deviation)"
  - "deno.lock files excluded from the repo (matches Phase 01-03 ai-job-consumer convention — the installed version isn't committed either)"
  - "VereinsRegelCandidate declared locally in both extractVereinsregeln.ts AND parseRules.ts rather than promoted to @spatenstich/shared this phase — avoids inter-plan file conflict with Plan 02-01 (packages/shared). Plan 02-04 will promote."
  - "CI workflow deploy step (plan AC-8) intentionally NOT added — Phase 01-03 did not actually introduce a supabase functions deploy job (CI only runs PR-checks); deploying extract-vereinsregeln follows the same manual Supabase-CLI pattern as ai-job-consumer. Documented in Deviations."
  - "anthropic.beta.files.delete called with 3-arg form (fileID, undefined, { headers }) — SDK 0.90.0 signature places headers in 3rd RequestOptions arg, NOT in 2nd FileDeleteParams arg"
  - "Promise.race pattern instead of passing AbortSignal directly to supabase.functions.invoke — supabase-js 2.103.2 does not support AbortSignal on functions.invoke; our controller races the invoke promise at the wrapper layer"

patterns-established:
  - "Pattern: Server-side post-processing of LLM output (prompt-injection defense). parseRules deterministically stamps istBKleingG=false and clamps string lengths, REGARDLESS of what the LLM emits. Applied as T-2-03-02 and T-2-03-10 mitigation."
  - "Pattern: Edge Function path-prefix guard. Even when using SERVICE_ROLE (which bypasses RLS), enforce tenant isolation explicitly with storagePath.startsWith(\`\${userId}/\`). Defense-in-depth above the bucket RLS policy."
  - "Pattern: try/finally around external API resource allocation. Anthropic Files API upload wraps the messages.create call in try + a finally that always attempts delete() — even if Claude errors, no orphaned file."
  - "Pattern: Typed error taxonomy for client wrappers. ExtractVereinsregelnError.code gives the UI a stable switch key instead of message-substring matching. Reusable shape for future Edge-Function wrappers."
  - "Pattern: Reusable jest mock helper co-located in app/src/__mocks__/. supabase-functions.ts exports mockInvoke + supabase shim; future wrapper tests reuse the same module."

requirements-completed: [RULES-01]

# Metrics
duration: ~35min
completed: 2026-04-19
---

# Phase 02 Plan 03: Vereinsregeln-Extraktion Edge Function Summary

**Synchroner Deno Edge Function `extract-vereinsregeln` (PDF → Anthropic Files API → claude-sonnet-4-6 → VereinsRegelCandidate[]) mit deterministischer parseRules-Post-Processing-Schicht und 55s-AbortController-Client-Wrapper.**

## Performance

- **Duration:** ~35 min (inkl. SDK-Version-Debug)
- **Started:** 2026-04-19T17:48:02+02:00
- **Completed:** 2026-04-19T18:02:11+02:00
- **Tasks:** 3 (alle autonomous / TDD)
- **Files created:** 8
- **Files modified:** 1 (.gitignore)

## Accomplishments

- **Server:** Edge Function `extract-vereinsregeln` lädt PDFs aus `vereinsregeln`-Bucket (SERVICE_ROLE, Pfad-Präfix-Guard), lädt via Anthropic Files API beta hoch (`anthropic-beta: files-api-2025-04-14`), ruft `claude-sonnet-4-6` mit strukturiertem EXTRACTION_PROMPT (DE), parst das Ergebnis deterministisch, löscht die Anthropic-Datei garantiert im `finally`.
- **Prompt-Injection-Hardening:** `parseRules` erzwingt serverseitig `istBKleingG: false` auf jedem Kandidaten; titel ist auf 200 Zeichen, beschreibung auf 1000 Zeichen geklampt; BKleingG-Seed-Titel werden deduppt.
- **Client:** `extractVereinsregeln()`-Wrapper mit 55s-internem AbortController, externem `signal?: AbortSignal`-Hook (für UI-„Abbrechen" aus Plan 02-04) und typisierter `ExtractVereinsregelnError` mit 5-Variant-Code-Taxonomie.
- **FOUND-06-Triple-Gate:** 0 `CLAUDE_API_KEY`/`sk-ant`-Vorkommen in `app/src/**`, 0 `EXPO_PUBLIC_` in Edge Function, SDK-Key ausschließlich via `Deno.env.get('CLAUDE_API_KEY')`.
- **Tests:** 8/8 Deno-Tests (parseRules) + 7/7 Jest-Tests (extractVereinsregeln) grün.
- **Wiederverwendbar:** `_shared/cors.ts` und `__mocks__/supabase-functions.ts` stehen zukünftigen Browser-invocable Edge Functions bzw. deren Tests zur Verfügung.

## Task Commits

Jede Task wurde atomar committet:

1. **Task 2-03-01 RED — parseRules Deno-Tests** — `51cde28` (test)
2. **Task 2-03-01 GREEN — parseRules + EXTRACTION_PROMPT** — `aed3faf` (feat)
3. **Task 2-03-02 — Edge Function + CORS shared module** — `cde46bb` (feat)
4. **Task 2-03-03 RED — extractVereinsregeln client tests** — `e4e157f` (test)
5. **Task 2-03-03 GREEN — extractVereinsregeln client wrapper** — `7457b9f` (feat)

_Hinweis: Plan-Frontmatter `type: execute`; Tasks 2-03-01 und 2-03-03 sind TDD (`tdd="true"`), jeweils RED-vor-GREEN-Commit-Paar._

## Files Created/Modified

**Server (Deno / Supabase Edge Functions):**
- `supabase/functions/extract-vereinsregeln/index.ts` — Haupt-Handler (CORS, Input-Validation, Pfad-Präfix-Guard, Storage-Download, Anthropic-Files-Upload, claude-sonnet-4-6-Call, parseRules, Response-Mapping, garantierter File-Delete in `finally`).
- `supabase/functions/extract-vereinsregeln/parseRules.ts` — Reines Modul (kein I/O). `EXTRACTION_PROMPT` + `parseRules(rawText) → VereinsRegelCandidate[]`. Stanzt serverseitig `source: 'pdf_extraction'` und `istBKleingG: false`, klampt Längen, dedupt BKleingG-Seed.
- `supabase/functions/extract-vereinsregeln/deno.json` — Import-Map (`@supabase/supabase-js@2.103.2`, `@anthropic-ai/sdk@^0.90.0`, `nodeModulesDir: "auto"`).
- `supabase/functions/extract-vereinsregeln/__tests__/parseRules.test.ts` — 8 Deno-Tests für parseRules + EXTRACTION_PROMPT.
- `supabase/functions/_shared/cors.ts` — Shared CORS-Header für Browser-invocable Edge Functions (Allow-Origin `*`, POST+OPTIONS).

**Client (Expo/React Native):**
- `app/src/lib/extractVereinsregeln.ts` — Wrapper mit 55s-AbortController, externem AbortSignal, `ExtractVereinsregelnError`-Taxonomie, lokalem `VereinsRegelCandidate`-Typ.
- `app/src/lib/__tests__/extractVereinsregeln.test.ts` — 7 Jest-Tests (happy / server / network / timeout / cancel / invalid_input).
- `app/src/__mocks__/supabase-functions.ts` — Wiederverwendbarer jest-Mock `{ supabase: { functions: { invoke: mockInvoke } } }`.

**Root:**
- `.gitignore` — Ignore `deno.lock` (Phase-01-03-ai-job-consumer-Konvention).

## Decisions Made

- **`@anthropic-ai/sdk@^0.90.0`** statt des vom Plan vorgeschriebenen `^0.30.1`: Die 0.30.1-Release exportiert `anthropic.beta.files` nicht; dies ist **Rule-3-blocking** (Deviation #1). Getestet, deno-check bestanden.
- **Kein CI-Deploy-Job**: Plan AC-8 forderte „deploy extract-vereinsregeln neben enqueue-ai-job". Phase 01-03 hat aber nie einen solchen Deploy-Step zur CI hinzugefügt (Entscheidung `supabase functions invoke removed in CLI v2.90.0 — manual deploy`). Wir folgen derselben manuellen Pattern; keine neue Infrastruktur.
- **`VereinsRegelCandidate` lokal deklariert** (nicht in `@spatenstich/shared`): vermeidet Datei-Konflikt mit Plan 02-01. Plan 02-04 kann den Typ promoten, sobald er breiter konsumiert wird.
- **`anthropic.beta.files.delete(fileID, undefined, { headers })`** — 3-arg-Form: In SDK 0.90.0 gehört `headers` in das optionale `RequestOptions` (3. Arg), nicht in `FileDeleteParams` (2. Arg).
- **`Promise.race` im Client-Wrapper** — `supabase-js 2.103.2` akzeptiert kein AbortSignal in `functions.invoke`; unser Controller race-t daher auf Wrapper-Ebene gegen ein `abortPromise`, das bei `controller.abort(reason)` rejected.
- **`nodeModulesDir: "auto"` in deno.json** nötig, damit `deno check` die transitiven OpenAI-Type-Imports der `@supabase/functions-js`-Edge-Runtime-Shim-Datei auflösen kann.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `@anthropic-ai/sdk@^0.30.1` fehlt `beta.files` API**
- **Found during:** Task 2-03-02 (`deno check index.ts` vor dem Commit)
- **Issue:** Plan schrieb SDK 0.30.1 vor. Diese Version hat kein `beta.files.upload` / `beta.files.delete` — TS2339 „Property 'files' does not exist on type 'Beta'". Edge Function nicht typisierbar.
- **Fix:** deno.json auf `@anthropic-ai/sdk@^0.90.0` gebumpt (erste stabile Version mit Files-API-Typen). `deno check index.ts` → 0 Type-Errors.
- **Files modified:** `supabase/functions/extract-vereinsregeln/deno.json`
- **Verification:** `deno check index.ts` Exit 0 + alle parseRules-Tests weiter 8/8 grün.
- **Committed in:** `cde46bb`

**2. [Rule 3 - Type] `FileDeleteParams` akzeptiert kein `headers`-Feld**
- **Found during:** Task 2-03-02 (direkt nach SDK-Bump)
- **Issue:** TS2353 „'headers' does not exist in type 'FileDeleteParams'" bei `anthropic.beta.files.delete(id, { headers: {...} })`. Signatur in 0.90.0 ist `delete(fileID, params?, options?)` — `headers` muss in `options` (3. Arg).
- **Fix:** Call angepasst zu `delete(uploaded.id, undefined, { headers: { 'anthropic-beta': ANTHROPIC_BETA } })`.
- **Files modified:** `supabase/functions/extract-vereinsregeln/index.ts`
- **Verification:** `deno check index.ts` Exit 0.
- **Committed in:** `cde46bb`

**3. [Rule 3 - Blocking] `nodeModulesDir: "auto"` fehlte — OpenAI-Typen im edge-runtime-Shim nicht auflösbar**
- **Found during:** Task 2-03-02 (erstes `deno check`)
- **Issue:** `Failed resolving types. Could not find a matching package for 'npm:openai@^4.52.5' in the node_modules directory.` Die `@supabase/functions-js`-Edge-Runtime-`.d.ts` referenziert transitive OpenAI-Typen; ohne node_modules-Resolution scheitert Type-Check.
- **Fix:** `nodeModulesDir: "auto"` zu `deno.json` hinzugefügt + `deno install` — Deno installiert Dependencies lokal.
- **Files modified:** `supabase/functions/extract-vereinsregeln/deno.json`
- **Verification:** Nächster `deno check` Exit 0.
- **Committed in:** `cde46bb`

**4. [Rule 3 - Blocking] Plan AC-8 (CI-Deploy-Step) basiert auf falscher Annahme**
- **Found during:** Task 2-03-02 (vor Commit; `.github/workflows/ci.yml` inspiziert)
- **Issue:** Plan forderte: „Add `supabase functions deploy extract-vereinsregeln` sibling-step neben dem existierenden `enqueue-ai-job`-Deploy in `ci.yml`." Tatsächlich gibt es in `ci.yml` gar keinen Edge-Function-Deploy-Step — Phase 01-03 hat bewusst `manual deploy via Supabase-CLI` gewählt (Summary 01-03 Entscheidung: _„supabase functions invoke removed in CLI v2.90.0 — function invocation verified via supabase functions list"_). Es gibt kein existierendes Pattern, das wir erweitern könnten.
- **Fix:** AC-8 weggelassen; Deployment folgt Phase-01-03-Konvention (manuelles `supabase functions deploy extract-vereinsregeln --project-ref $REF --no-verify-jwt` aus dem `user_setup`-Abschnitt des Plans).
- **Files modified:** keine (bewusst keine `.github/workflows/ci.yml`-Änderung).
- **Verification:** Phase-01-03-Summary liest sich konsistent; kein GitHub-Secret für Supabase-Deploy existiert, d.h. ein CI-Step hätte ohnehin nichts deployen können.
- **Committed in:** `cde46bb` (Commit-Message dokumentiert die Deviation).

**5. [Rule 2 - Correctness] `deno.lock`-Dateien ignoriert statt committed**
- **Found during:** Task 2-03-02 (git status)
- **Issue:** `deno install` generierte `deno.lock` auf Root + in Funktion-Directory. `packages/shared` + existierende `ai-job-consumer` committen keine `deno.lock`-Dateien — würde neue Konvention einführen.
- **Fix:** `deno.lock` zu `.gitignore` hinzugefügt mit Kommentar zum Pattern-Source (Phase 01-03 ai-job-consumer).
- **Files modified:** `.gitignore`
- **Verification:** `git status --short` zeigt keine deno.lock-Dateien mehr als untracked.
- **Committed in:** `cde46bb`

---

**Total deviations:** 5 auto-fixed (5x Rule 3 blocking + 1x Rule 2 correctness; eine Überschneidung bei #5).
**Impact on plan:** Alle Deviationen waren für Korrektheit zwingend; keine Scope-Creep. Der Wegfall von AC-8 reduziert den Plan-Umfang korrekt auf die ohnehin bestehende Deployment-Konvention.

## Issues Encountered

- **Deno 2.x fehlte auf Windows** — in der vorherigen Session via `scoop install deno` installiert (2.7.12). Keine Wiederholung in dieser Session nötig.
- **Deno 2.x kennt `--allow-none` nicht mehr** — für parseRules-Tests `--allow-read` verwendet (die Tests brauchen keinerlei Permissions, aber Deno 2.x verlangt explizites Flag-Set oder nichts).

## User Setup Required

Deployment folgt der Phase-01-03-Manual-CLI-Konvention. Im Einzelnen (aus `02-03-PLAN.md` `user_setup`):

1. **CLAUDE_API_KEY** muss in Supabase-Dashboard → Edge Functions → Manage Secrets vorhanden sein (aus Phase 01-03 `FOUND-06` bereits gesetzt). **NICHT** als GitHub-Secret hinterlegen.
2. **Deploy**: `supabase functions deploy extract-vereinsregeln --project-ref vitrqkzxkiqvadqfzrcx --no-verify-jwt` (Projekt-Ref wie Phase 01-03).
3. **Verify**: Supabase-Dashboard → Edge Functions → Status `ACTIVE` für `extract-vereinsregeln`.
4. **Smoke**: Upload eines Test-PDFs nach `vereinsregeln/<user-id>/test.pdf`, Dashboard-Invoke mit `{ "storagePath": "<user-id>/test.pdf", "userId": "<user-id>" }`, Response muss `{ rules: [...] }` mit 200 liefern.

## Threat Mitigation Verification

Alle 5 High-Severity-Threats aus `<threat_model>` umgesetzt:

- **T-2-03-01 (Spoofing, Edge Function POST)** — Pfad-Präfix-Guard `storagePath.startsWith(${userId}/)` vor Storage-Read erzwungen, `index.ts:55-57`.
- **T-2-03-02 (Tampering, istBKleingG)** — `parseRules` stanzt `istBKleingG: false` deterministisch; Test 5 verifiziert dies.
- **T-2-03-04 (Info Disclosure, CLAUDE_API_KEY-Leak)** — FOUND-06-Triple-Gate: `Deno.env.get('CLAUDE_API_KEY')` genau einmal im Edge Function, 0x in `app/src/**`, 0x `EXPO_PUBLIC_` in der Function.
- **T-2-03-08 (DoS, Bucket-Abuse)** — Bucket-Size-Limit 10 MB aus Plan 02-01-Migration 002 gilt weiter; kein zusätzliches Buffering oberhalb dieses Limits.
- **T-2-03-09 (Privilege Escalation, Path-Traversal)** — gleiche Pfad-Präfix-Guard wie T-2-03-01; Supabase SDK normalisiert `..`-Traversierung.
- **T-2-03-10 (Prompt-Injection: LLM behauptet BKleingG)** — `parseRules` verwirft LLM-`istBKleingG`-Werte komplett + BKleingG-Titel-Dedupe. Test 5 + Test 7 verifizieren.

## Self-Check: PASSED

Dateien existieren:
- `supabase/functions/extract-vereinsregeln/deno.json` FOUND
- `supabase/functions/extract-vereinsregeln/index.ts` FOUND
- `supabase/functions/extract-vereinsregeln/parseRules.ts` FOUND
- `supabase/functions/extract-vereinsregeln/__tests__/parseRules.test.ts` FOUND
- `supabase/functions/_shared/cors.ts` FOUND
- `app/src/lib/extractVereinsregeln.ts` FOUND
- `app/src/lib/__tests__/extractVereinsregeln.test.ts` FOUND
- `app/src/__mocks__/supabase-functions.ts` FOUND
- `.gitignore` MODIFIED

Commits existieren:
- `51cde28` FOUND (RED — parseRules tests)
- `aed3faf` FOUND (GREEN — parseRules + EXTRACTION_PROMPT)
- `cde46bb` FOUND (Edge Function + CORS + deno.json + gitignore)
- `e4e157f` FOUND (RED — extractVereinsregeln tests)
- `7457b9f` FOUND (GREEN — extractVereinsregeln wrapper)

Verification passes:
- `deno check index.ts` Exit 0
- `deno test parseRules.test.ts` 8/8 passed
- `pnpm --filter app test -- extractVereinsregeln.test` 7/7 passed
- `pnpm --filter app run typecheck` clean
- `grep CLAUDE_API_KEY app/src/` 0 matches
- `grep EXPO_PUBLIC_ supabase/functions/extract-vereinsregeln/` 0 matches

## Next Phase Readiness

Plan 02-04 kann sofort starten:

```typescript
import { extractVereinsregeln, ExtractVereinsregelnError } from '@/lib/extractVereinsregeln';

// In der Confirm-Screen-Komponente:
const controller = new AbortController();
try {
  const candidates = await extractVereinsregeln({ storagePath, userId, signal: controller.signal });
  setCandidates(candidates);
} catch (e) {
  if (e instanceof ExtractVereinsregelnError) {
    switch (e.code) {
      case 'timeout':       showError('Zu langsam'); break;
      case 'cancelled':     /* user hit Abbrechen */ break;
      case 'server':        showError(e.message); break;
      case 'network':       showError('Keine Verbindung'); break;
      case 'invalid_input': /* bug */ break;
    }
  }
}

// Abbrechen-Button:
<Pressable onPress={() => controller.abort()}>Abbrechen</Pressable>
```

**Blocker:** Keine. Edge Function muss vorher manuell deployed sein (siehe User Setup).

---
*Phase: 02-auth-profile-vereinsregeln*
*Completed: 2026-04-19*
