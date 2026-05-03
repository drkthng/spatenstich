---
status: resolved
trigger: "Vereinsregeln speichern geht nicht"
created: 2026-04-30
updated: 2026-04-30
---

## Symptoms

- **Expected:** Vereinsregeln in DB speichern, im Garten-Profil anzeigen, PDF-Import verarbeiten und speichern
- **Actual:** Nichts passiert — Button reagiert, aber Daten werden nicht gespeichert / gehen verloren
- **Error messages:** Keine bekannt
- **Platform:** Web (Browser)
- **Timeline:** Hat nie funktioniert

## Current Focus

- hypothesis: CONFIRMED — Two disjoint stores; profileStore.vereinsregeln never populated after saves; confirm screen silently swallows save errors
- test: Trace data flow from confirm.tsx handleSave through vereinsregelnRepo to storage and back to profile overview
- expecting: profileStore.vereinsregeln always empty; vereinsregelnStore.rules correctly persisted to repo but not bridged back to profileStore
- next_action: done
- reasoning_checkpoint: Fix applied and verified — TypeScript clean, all 17 vereinsregeln tests pass, profileStore tests pass

## Evidence

- timestamp: 2026-04-30T21:15 | profileStore.ts has `vereinsregeln: VereinsRegel[]` and `setVereinsregeln` action, but `setVereinsregeln` is NEVER called from application code (only tests)
- timestamp: 2026-04-30T21:15 | useProfile.ts returns `vereinsregeln` from profileStore; profile/index.tsx uses it to show "Regeln einrichten" banner or count
- timestamp: 2026-04-30T21:15 | loadProfile() in profileRepo.ts does NOT load vereinsregeln — only displayName, plz, klimazone, archetype
- timestamp: 2026-04-30T21:15 | confirm.tsx handleSave calls saveVereinsregeln(rules, mode, userId) which writes to repo, but NEVER calls profileStore.setVereinsregeln()
- timestamp: 2026-04-30T21:15 | confirm.tsx handleSave silently catches all errors with empty catch block — no user feedback on save failure
- timestamp: 2026-04-30T21:15 | vereinsregelnStore has its own `rules` and `hydrated` state, correctly loaded by useVereinsregeln hook, but disconnected from profileStore

## Eliminated

- Storage adapter bug: IndexedDbAdapter.writeWithOutbox correctly handles vereinsregeln entity with id=gardenId keypath
- vereinsregelnRepo save logic: Both local mode (KV blob) and account mode (writeWithOutbox) write paths are correctly implemented
- Zustand rehydration race: authStore persists mode/userId/activeGardenId, so they are available on subsequent visits

## Resolution

### Root Cause

Two disconnected Zustand stores: `profileStore.vereinsregeln` is read by the profile overview page but never written to. The actual save flows through `vereinsregelnStore` + `vereinsregelnRepo`, which persist data correctly but never bridge it back to `profileStore`. Additionally, `confirm.tsx` silently swallows save errors (empty catch block), giving the user no feedback if the save actually fails (e.g., `no_active_garden` in account mode before garden resolution completes).

### Fix Applied

1. **useProfile.ts** — Now hydrates `profileStore.vereinsregeln` from `vereinsregelnRepo.loadVereinsregeln()` on mount, so the profile overview shows the correct count on app start.
2. **useVereinsregeln.ts** — After loading rules from repo, also bridges them into `profileStore.setVereinsregeln()`.
3. **confirm.tsx** — After successful save, calls `useProfileStore.getState().setVereinsregeln(rules)`. Also replaced the empty `catch {}` with user-visible error messages (German) and a `saveError` state displayed as inline text.
4. **checklist.tsx** — After successful save, calls `useProfileStore.getState().setVereinsregeln(merged)`.
5. **upload.tsx** — After merging extracted rules, calls `useProfileStore.getState().setVereinsregeln(merged)`.
