---
phase: 04-garten-erfassung-m1
plan: 02
subsystem: ai-vision-integration
tags: [claude-vision, edge-function, json-parsing, budget-enforcement, files-api]
dependency_graph:
  requires: [04-01]
  provides: [production_claude_vision_call, parseElements_module, budget_enforcement, ai_results_population]
  affects: [04-03, 04-04]
tech_stack:
  added: ["@anthropic-ai/sdk (in ai-job-consumer deno.json)"]
  patterns: [files-api-upload-cleanup, fence-strip-json-parsing, budget-check-before-call, finally-cleanup]
key_files:
  created:
    - supabase/functions/ai-job-consumer/parseElements.ts
    - supabase/functions/ai-job-consumer/__tests__/parseElements.test.ts
  modified:
    - supabase/functions/ai-job-consumer/index.ts
    - supabase/functions/ai-job-consumer/deno.json
decisions:
  - "Budget counted per garden_id (not per user_id) - both garden members share the same budget since they work on one garden"
  - "Files API used for photo upload (not base64 inline) - matches extract-vereinsregeln pattern and reduces request payload size"
  - "Confidence defaults to 'medium' when invalid/missing - safe fallback for Element-Bestaetigung screen (pre-accepted)"
metrics:
  duration_minutes: 5
  completed: "2026-05-03T09:57:00Z"
  tasks: 2
  files_created: 2
  files_modified: 2
---

# Phase 04 Plan 02: Claude Vision Integration Summary

Production Claude Vision call in ai-job-consumer replacing Phase 1 mock, with Anthropic Files API upload/cleanup, budget enforcement (200/day hard, 50/day soft per garden), and robust JSON parsing via parseElements module.

## Completed Tasks

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | parseElements.ts - JSON parsing + validation module (TDD) | ac07cec | parseElements.ts, parseElements.test.ts |
| 2 | ai-job-consumer - Replace mock with production Claude Vision Call | 46c1562 | index.ts, deno.json |

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

1. **Budget per garden_id:** Budget is counted per garden (not per user) since both Dirk + Frau share the same garden. This matches the Shared Garden model from Pivot 2026-04-21.
2. **Files API over base64:** Photos uploaded via Anthropic Files API (not base64 inline encoding) to reduce request payload size. Pattern identical to extract-vereinsregeln.
3. **Confidence default 'medium':** Invalid or missing confidence values coerced to 'medium' — these elements are pre-accepted in the confirmation screen (D-06 discretion from Plan 01).

## Verification Results

- `deno test __tests__/parseElements.test.ts`: All 7 tests passed (0ms per test)
- `supabase functions deploy ai-job-consumer`: Deployed successfully (ACTIVE, version 2)
- `supabase functions list`: ai-job-consumer shows ACTIVE status
- Acceptance criteria: all 12 checks verified for Task 2, all 7 checks for Task 1
- No `_phase1_placeholder` or mock references remain in ai-job-consumer/index.ts
- No CLAUDE_API_KEY leakage in console.log/error statements (T-2-03-04)

## Threat Mitigations Applied

| Threat ID | Mitigation |
|-----------|-----------|
| T-4-02-01 | Payload validated (storage_paths + dimensions check) before proceeding |
| T-4-02-02 | Error messages use `err.message` only; CLAUDE_KEY never logged |
| T-4-02-03 | Files deleted in finally block for ALL uploaded file IDs |
| T-4-02-04 | Hard limit 200/day enforced BEFORE Claude call; job marked failed with 'daily_limit_exceeded' |
| T-4-02-05 | Storage paths come from ai_jobs.payload (set by SECURITY DEFINER RPC); SERVICE_ROLE download is path-isolated |
| T-4-02-06 | Output JSON-parsed and validated by parseElements — malformed output discarded |

## Self-Check: PASSED

All created files exist and both commits verified in git log.
