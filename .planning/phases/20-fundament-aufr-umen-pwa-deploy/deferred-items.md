# Phase 20 Plan 01 — Deferred Items (out of scope)

Pre-existing lint violations found while executing Task 1 (ESLint-Overrides) that are
**outside this plan's declared `files_modified` scope** and are NOT part of the
Masterplan WP 20.1 violation list (CONTEXT.md / Task 2 file list). Per the executor's
scope-boundary rule, these were logged, not fixed.

## `react/display-name` / `import/first` / `@typescript-eslint/no-require-imports`
outside `**/__tests__/**` and `**/__mocks__/**`

Task 1's automated `<verify>` checks that no occurrence of these three rule IDs remains
anywhere in `pnpm --filter app run lint` output. After adding the test/mock override
(confirmed working — zero occurrences remain inside `__tests__`/`__mocks__` paths), three
occurrences remain in production files that are pre-existing, not introduced by this
plan, and not listed in this plan's `files_modified`:

1. **`app/app/_layout.tsx`** (root layout — distinct from `app/app/(app)/_layout.tsx`,
   which IS in this plan's scope) — lines 8, 12-19: `require('react-native')` for
   `LogBox` inside an `if (Platform.OS === 'web')` block (import/first + no-require-imports).
   Trivial fix available (LogBox is already re-exported by the top-level `react-native`
   import), but out of this plan's file scope.
2. **`app/src/components/editor/CrossPlatformColorPicker.tsx:56`** —
   `require('reanimated-color-picker')` inside a lazy-load IIFE. **Intentional**:
   in-file comment documents this as "lazy-require ... never at module top" per
   Phase 09.1 RESEARCH §Pattern 9, to avoid breaking the Metro web bundle. Converting
   to a static import would reintroduce that regression — architectural change,
   out of scope for WP 20.1.
3. **`app/src/components/editor/CrossPlatformDatePicker.tsx:46`** — same pattern,
   `require('@react-native-community/datetimepicker')`, same documented reason.

**Verdict:** Task 1's config change works correctly for its actual purpose (silencing
noise in test/mock files). The literal automated `<verify>` grep is scoped too broadly
(whole-package lint output) relative to the plan's own `files_modified` list and the
Masterplan's WP 20.1 violation inventory, neither of which mention these three files.
Fixing #2/#3 would require either a targeted `@typescript-eslint/no-require-imports`
`allow: [...]` rule config (which would violate Task 1's own acceptance criterion of
"exactly one additional config block") or converting the lazy-require pattern to a
dynamic `import()` — both are scope/architecture decisions for a future plan, not this
one. #1 is trivially fixable but is not in `files_modified` for this plan and touching
it provides no acceptance-criteria benefit while #2/#3 remain, so it was left alone
per the scope-boundary rule.

**Recommendation:** If a fully clean `react/display-name|import/first|no-require-imports`
grep across the whole package is required later, address in a phase that also revisits
the CrossPlatform*.tsx lazy-loading strategy (e.g. Phase 22 per Anhang A, which already
touches `reanimated-color-picker`).
