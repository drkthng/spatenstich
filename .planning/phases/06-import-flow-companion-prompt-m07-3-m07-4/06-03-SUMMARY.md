---
phase: 06-import-flow-companion-prompt-m07-3-m07-4
plan: 03
subsystem: ui
tags: [expo-share-intent, import-flow, zustand, nativewind, expo-document-picker, expo-clipboard, react-native]

# Dependency graph
requires:
  - phase: 06-import-flow-companion-prompt-m07-3-m07-4
    plan: 02
    provides: importValidator (validatePayload), importRepo (saveImport), importStore (useImportStore)
provides:
  - Switch UI primitive (forwardRef, NativeWind-compatible, #4A7C59 green)
  - ImportEntityCard component (confidence chip + toggle + warning)
  - ImportErrorState component (validation errors + clipboard schema copy)
  - Import Entry screen (paste + file picker + share-intent file URI)
  - Import Preview screen (sectioned cards, confidence-based selection, sticky footer)
  - ShareIntentProvider in AppLayout for OS JSON file sharing
  - Home screen import button (empty state + plan view)
  - de.json "import" i18n key (UTF-8, full section labels + home + preview strings)
affects:
  - 06-04 (promotion flow reads bed_drafts/plant_drafts/observation_drafts written by saveImport)
  - future phases reading import data

# Tech tracking
tech-stack:
  added:
    - expo-share-intent@4.1.2 (OS share-sheet JSON file reception)
  patterns:
    - ShareIntentProvider wraps AppLayout; resetShareIntent() called immediately after push to prevent re-navigation loop
    - Payload passed via Zustand importStore between screens (NOT navigation params)
    - t() helper: key.split('.').reduce over de JSON object — consistent across all screens
    - validatePayload gates all import entry paths before state or navigation

key-files:
  created:
    - app/src/components/ui/switch.tsx
    - app/src/components/ImportEntityCard.tsx
    - app/src/components/ImportErrorState.tsx
    - app/app/(app)/import/index.tsx
    - app/app/(app)/import/preview.tsx
  modified:
    - app/app/(app)/_layout.tsx
    - app/app/(app)/index.tsx
    - app/app.config.ts
    - packages/shared/src/i18n/de.json
    - app/package.json

key-decisions:
  - "expo-share-intent@4.1.2 has unmet peer expo-constants@>=17.1.5 (found 17.0.8) — accepted as non-blocking peer warning; functionality intact"
  - "pnpm install failed with ENOENT on expo-image-picker nested node_modules on Windows; fixed by removing the directory before reinstall"
  - "ImportPayload.complianceFlags and freeFormNotes accessed via (payload as any) — these fields exist in schema but may not be in shared TypeScript type yet; safe cast"
  - "confidence filtering uses (e as any).confidence for observation entities since ImportPayloadObservation may not declare confidence in TS type"

patterns-established:
  - "Switch primitive: React.forwardRef wrapper over RN Switch with fixed brand colors — same pattern as button.tsx"
  - "Entity cards: ImportEntityCard accepts generic entity shape with localId/label/confidence; confidence drives TrafficLightBadge state"
  - "Import flow: Entry (validate) → importStore.setPayload → Preview (toggle) → saveImport → Home"

requirements-completed: [IMPORT-04, IMPORT-05, IMPORT-06, IMPORT-07]

# Metrics
duration: 35min
completed: 2026-05-09
---

# Phase 06 Plan 03: Import UI Screens Summary

**Full import flow UI: paste/share-intent/file-picker entry with AJV validation, confidence-based entity preview with toggles, and OS JSON share-sheet integration via expo-share-intent**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-05-09T09:20:00Z
- **Completed:** 2026-05-09T09:57:49Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- Switch primitive with #4A7C59 / #A8A29E / #FFFFFF brand colors following forwardRef pattern
- ImportEntityCard with TrafficLightBadge confidence chips (green ≥0.8, amber 0.6–0.79, red <0.6) and toggle; red+selected shows manual review warning
- ImportErrorState with InlineBanner + 2s clipboard "Kopiert!" feedback for schema copy
- Import Entry screen: paste textarea (onBlur validation), file picker (expo-document-picker), share-intent file URI param — all paths go through validatePayload
- Import Preview screen: sectioned Beete/Pflanzen/Beobachtungen cards, confidence <0.6 defaults OFF, Regelprüfung section grayed (opacity-50), sticky footer
- AppLayout wrapped with ShareIntentProvider; resetShareIntent() prevents re-navigation loop
- Home screen "Aus Claude.ai importieren" button in both empty state and plan view
- de.json "import" key with full UTF-8 German strings including Umlaute

## Task Commits

1. **Task 1: Switch + ImportEntityCard + ImportErrorState + i18n** - `af17d7d` (feat)
2. **Task 2: Import screens + share-intent + Home button** - `4968209` (feat)

## Files Created/Modified

- `app/src/components/ui/switch.tsx` — NativeWind-compatible Switch primitive, forwardRef
- `app/src/components/ImportEntityCard.tsx` — Card with confidence chip + toggle + warning
- `app/src/components/ImportErrorState.tsx` — Validation errors with schema clipboard copy
- `app/app/(app)/import/index.tsx` — Import Entry screen (paste / file picker / share-intent)
- `app/app/(app)/import/preview.tsx` — Import Preview screen (entity cards, confirm/cancel)
- `app/app/(app)/_layout.tsx` — Added ShareIntentProvider wrapper + useShareIntentContext
- `app/app/(app)/index.tsx` — Added import button in empty state and plan view
- `app/app.config.ts` — Added expo-share-intent plugin with iOS + Android config
- `packages/shared/src/i18n/de.json` — Added "import" top-level key
- `app/package.json` — Added expo-share-intent@4.1.2

## Decisions Made

- expo-share-intent@4.1.2 has unmet peer `expo-constants@>=17.1.5` (project uses 17.0.8) — accepted as non-blocking warning; share-intent functionality is unaffected at runtime.
- pnpm install ENOENT on Windows caused by nested `node_modules` inside `expo-image-picker`; fixed by removing the directory then reinstalling.
- `(payload as any).complianceFlags` and `(payload as any).freeFormNotes` used because these optional fields exist in the JSON schema but may not yet be declared in the shared TypeScript `ImportPayload` type — safe cast for MVP.

## Deviations from Plan

None — plan executed exactly as written. The pnpm install ENOENT was an environment issue resolved without code changes.

## Issues Encountered

- **pnpm ENOENT on Windows:** `pnpm add expo-share-intent@4.1.2` failed with `ENOENT: no such file or directory, scandir 'node_modules/expo-image-picker_tmp_N'` — a Windows filesystem issue where pnpm tries to create a temp dir inside `expo-image-picker/node_modules/`. Fixed by removing `node_modules/expo-image-picker` then running `pnpm install` from root. No code impact.

## Known Stubs

None — all data flows are wired: validatePayload → importStore.setPayload → preview renders live payload → saveImport persists selected drafts.

## Threat Flags

No new threat surface beyond what was modeled in the plan's `<threat_model>`. T-06-08 and T-06-09 mitigations applied: all entry paths (paste, file picker, share-intent URI) pass through `validatePayload` before any state update or navigation.

## Next Phase Readiness

- Import flow end-to-end complete: Dirk can paste JSON, share a .json file, or open via file picker → see preview → confirm → drafts saved
- Ready for Phase 06-04: promotion flow (bed_drafts/plant_drafts → accepted plan elements)
- No blockers

---
*Phase: 06-import-flow-companion-prompt-m07-3-m07-4*
*Completed: 2026-05-09*
