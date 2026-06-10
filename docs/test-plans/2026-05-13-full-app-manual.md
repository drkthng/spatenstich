# Spatenstich — Full Manual Smoke Test Plan

**Date:** 2026-05-13
**Build state:** Post Phase 7 (Plan-Editor + Drafts-Integration live)
**Supabase:** project `vitrqkzxkiqvadqfzrcx` (Frankfurt, EU). Migrations 001–018 all live.
**Code commit:** `31d2c57` on branch `ci/test-pr`.

This plan is for **intentional, hostile testing** — not happy-path clicking. Every section has "things to break" and edge cases. Report back with pass/fail per section and any unexpected behavior.

---

## What's actually shippable right now

After Phase 7, the user-facing app surface is:

| Feature | iOS | Web | Notes |
|---|---|---|---|
| Sign up / Sign in (Account mode) | ✓ | ✓ | Supabase auth — email+password |
| Local-only mode (no account) | ✓ | ✓ | Uses SecureStore + AsyncStorage |
| Onboarding: PLZ → Klimazone, Archetyp | ✓ | ✓ | German PLZ → climate zone lookup |
| Profile + Settings | ✓ | ✓ | |
| Shared Garden create | ✓ | ✓ | RLS member-check |
| Invite-code flow + join-garden | ✓ | ✓ | |
| Home screen | ✓ | ✓ | Empty state + static plan preview |
| Import via Share-Intent (Claude.ai → app) | ✓ | ✗ | Native-only |
| Import via Paste-fallback | ✓ | ✓ | Large textarea for JSON |
| Import Preview screen | ✓ | ✓ | Confidence chips, entity toggles |
| Draft-Sichtungs-Screen (`/(app)/import/review`) | ✓ | ✓ | Phase 6.5 |
| Plan-Editor (`/(app)/plan`) | ✓ | ⚠ | **Phase 7 NEW.** Skia + gestures. Web likely degraded — see §3.6 |
| Drafts tray inside editor | ✓ | ⚠ | Only if editor loads |
| Offline-first + sync | ✓ | ⚠ | expo-sqlite web is alpha |

**Known pre-existing baseline issues** (not regressions, don't block runtime):
- 5 unit test files fail: auth, migrateLocalToAccount.rowtables, useSyncStatus (×2). Documented in `.planning/phases/07-…/deferred-items.md`. Runtime auth + sync flows are fine.

---

# Part 1 — Web Browser Test Plan

## 1.0 Setup

```bash
# From repo root D:\AiProjects\garden-app
pnpm install          # if you haven't recently
pnpm --filter app web # runs `expo start --web` on Metro
```

Open the URL Metro prints (typically `http://localhost:8081`).

**Recommended browser:** Chrome (best DevTools, Skia/WASM behavior most observable). Also test in Firefox + Safari if you have them.

**Pre-test cleanup:**
1. Open DevTools → Application → Storage → "Clear site data" (wipe AsyncStorage + IndexedDB)
2. Open Network tab, leave it open during testing — watch for failed requests
3. Open Console tab, leave it open — watch for red errors

**Two test modes to cover separately:**
- **Account mode:** real Supabase auth. Use a fresh email like `test+web1@example.com`.
- **Local-only mode:** skip auth, work without backend.

---

## 1.1 Cold start + first impression

| # | Step | Expected | Things to break |
|---|------|----------|-----------------|
| 1.1.1 | Load `http://localhost:8081` cold (after cache clear) | Splash → routes to `/(auth)` if not signed in | Watch Console for red errors; reload mid-load |
| 1.1.2 | DevTools → Network → check for failed asset loads (404, CORS) | All assets 200 | Look for fonts not loading (Lato/Inter family) |
| 1.1.3 | DevTools → Console → no red errors on initial render | Clean console | Yellow warnings OK; red = report |
| 1.1.4 | Resize browser to 320px wide (smallest phone) | Layout adapts, no horizontal scroll | Layout breaks at <360px is a finding |
| 1.1.5 | Resize to 1920px wide (desktop) | Content max-width respected, doesn't stretch full-width awkwardly | |
| 1.1.6 | DevTools → Device Mode → iPhone 14 Pro | App renders close to native | This is your "wife's desktop browser" rehearsal |

---

## 1.2 Auth flow

### 1.2.1 Sign Up (Account mode)
1. Click "Account erstellen" / sign-up CTA
2. Enter `test+web1@example.com` and a password
3. Submit
4. **Expected:** Either (a) email verification screen, OR (b) auto-signed-in if Supabase has no email-confirm requirement
5. **Try to break:**
   - Submit empty email → expect inline error
   - Submit invalid email format → inline error
   - Submit weak password (e.g. "abc") → inline error
   - Hit Enter mid-form before completing → no crash
   - Submit twice fast (double-click) → only one request fires (check Network)
   - Use special chars in password (`äöü`, `'<>`, emoji) → either accepted or clear error

### 1.2.2 Sign In
1. Sign out (settings → sign out, or clear storage)
2. Sign back in with same credentials
3. **Expected:** Lands on Home screen with garden context restored
4. **Try to break:**
   - Wrong password → clear German error, not 500
   - Non-existent email → handled gracefully
   - Sign in while offline (DevTools → Network → Offline) → reasonable error, app doesn't lock up

### 1.2.3 Local-only mode
1. Clear storage, reload
2. Choose "Lokal weitermachen" / equivalent
3. **Expected:** Skips auth, goes to onboarding or home
4. **Try to break:**
   - Sign out from local-only — should just clear state, no error
   - Switch from local → account later via Settings → "Konto verknüpfen"

---

## 1.3 Onboarding

1. After first sign-up/local-mode entry, onboarding should fire
2. **Steps to test:**
   - Enter PLZ (German postal code): try `04317` (Leipzig), `10115` (Berlin), `80331` (München)
   - **Expected:** Klimazone auto-resolves (something like "7a" or "8a")
   - **Try to break:**
     - Enter invalid PLZ (`00000`, `99999`, `abc`, ` ` blank) → graceful error
     - Enter 4-digit PLZ → handled (Germany has 5-digit, but Austria/CH overlap)
     - Enter PLZ then immediately submit before lookup completes
3. Archetyp picker: choose any archetype
4. Submit → lands on Home

---

## 1.4 Shared Garden

1. Home → "Shared Garden anlegen" / equivalent
2. Create a garden, name it "Test Garden Web"
3. Note the invite code shown
4. **Try to break:**
   - Create garden with empty name → blocked
   - Create garden with emoji name → either accepted or clearly rejected
   - Try to create a second garden — should it block or allow? (Phase 2.5 D-...)
   - Note: testing the actual invite-code-join flow needs a 2nd account or 2nd browser

### 1.4.1 Invite flow (cross-browser test)
1. In Chrome: log in as user A, create garden, copy invite code
2. In Firefox/Safari (or incognito Chrome): sign up as user B, paste invite code into "Garten beitreten"
3. **Expected:** User B is now a member of user A's garden
4. **Try to break:**
   - Bad invite code → clear error
   - Used invite code → handled (expired? or one-time?)
   - User B tries to join their own garden if they already have one — what happens?

---

## 1.5 Home screen

1. **Empty state** (fresh garden, no plan elements): German empty-state copy visible, "Plan öffnen" CTA, "Aus Claude.ai importieren" CTA
2. **With elements:** the static SVG GardenPlanView preview renders (sketch-warm palette)
3. **Try to break:**
   - Resize browser → preview SVG scales
   - Have a garden with 0 plan elements but with drafts → does Home indicate "Du hast offene Importe"?

---

## 1.6 Import flow (Paste-fallback path — web has no Share-Intent)

This is the **main happy path on web** — your wife on Desktop.

### 1.6.1 Setup the Claude.ai project
1. Open Claude.ai in another tab
2. Have ONE pre-canned valid JSON payload ready. The schema is `spatenstich-import.v1`. Use one of:
   - `schemas/examples/full.json` (full payload)
   - `schemas/examples/minimal.json` (minimal)
   - `schemas/examples/edge-cases.json` (low confidence)
3. Copy the JSON to clipboard

### 1.6.2 Run the import
1. Home → "Aus Claude.ai importieren" → lands on `/(app)/import`
2. Paste the JSON into the textarea
3. **Expected:** Inline validation message — either "Bereit zur Vorschau" or "Schema-Fehler: …"
4. Click "Weiter" / "Vorschau"
5. **Expected:** Preview screen showing each entity as a card with:
   - Label (bed name / plant species / observation summary)
   - Confidence chip (green ≥0.8, yellow 0.6-0.79, red <0.6)
   - Toggle per entity
6. Verify red-confidence entities default to OFF
7. Click "Übernehmen" → drafts saved to Supabase (Account) or local SQLite (Local mode)
8. **Try to break:**
   - Paste invalid JSON (missing `schemaVersion`) → German error + "Schema kopieren" button
   - Paste empty textarea → blocked
   - Paste partial JSON → validation error with specific complaint
   - Paste valid JSON with unknown `bedRef` (orphan plant) → specific error
   - Paste payload with 50+ entities → preview still renders without freezing
   - Click "Übernehmen" twice fast → only one save (idempotency)
   - Submit while DevTools → Network → Offline → write goes to outbox, not lost

### 1.6.3 After import: confirm redirect
1. After "Übernehmen" → expected redirect to `/(app)/import/review` (Phase 6.5-05 wiring)
2. **Expected:** Sichtungs-Screen shows the drafts you just imported
3. **Try to break:** hit back button mid-redirect

---

## 1.7 Draft review (`/(app)/import/review`)

1. From import or via direct navigation
2. **Expected:** 3 sections (Beete / Pflanzen / Beobachtungen), each draft as a `DraftReviewCard` with Annehmen / Verwerfen / Edit buttons
3. **Auto-Promote toggle:** flip it on
4. **Expected:** drafts with confidence ≥ 0.8 (threshold pinned in `reviewSettingsStore`) auto-promote
5. **Try to break:**
   - Accept a bed-draft → it becomes a `plan_element` row in Supabase, draft marked `promoted`
   - Accept a plant-draft → modal to pick parent bed (Phase 6.5 P03)
   - Verwerfen a draft → marked `dismissed`, removed from list
   - Edit a draft → inline form, save → updated row
   - Auto-Promote ON + a 0.5-confidence draft → does NOT auto-promote (only ≥0.8)
   - Refresh page mid-review → state persists from Supabase
   - Open same screen in 2nd tab → both tabs see the same drafts; accept in tab 1 → tab 2 stale until refresh (LWW)

---

## 1.8 Plan Editor (`/(app)/plan`) — **THE NEW PHASE 7 SURFACE**

> ⚠ **Honest expectation:** the editor is Skia-based with `react-native-gesture-handler`. On native iOS it's first-class. On web it's CanvasKit-WASM which requires COOP/COEP headers Metro doesn't set by default. **Expect issues.** This section is partly about confirming or refuting that expectation.

### 1.8.1 Can the route load at all?
1. Home → "Plan öffnen" CTA → navigates to `/(app)/plan`
2. **Possible outcomes:**
   - **a) Loads fully:** Canvas renders, you see grid, palette, toolbar. → Pass; continue to 1.8.2
   - **b) Loads but blank canvas:** Skia mounted but draws nothing. → Report; check DevTools Console for "CanvasKit not loaded" / SharedArrayBuffer errors
   - **c) Hard crash with red screen:** Skia or gesture-handler can't load on web. → Expected per CONTEXT D-09; report verbatim error
3. Check DevTools → Console for messages like:
   - `Cannot use 'SharedArrayBuffer'` → needs COOP/COEP headers (known Skia Web limitation)
   - `Module not found: @shopify/react-native-skia/lib/web` → Skia Web bundle missing
   - Any other red errors → copy verbatim

### 1.8.2 If editor loads — try every interaction
1. **Grid toggle (toolbar Grid3x3 icon):** click → grid lines appear/disappear
2. **Layer toggle (Eye icon, 3-state cycle):** click through `both → infra-only → seasonal-only → both`
3. **Palette tab switch:** Beete / Pflanzen / Infrastruktur — each tab shows different swatches
4. **Mouse-drag from palette onto canvas:** does it place an element? (touch-events vs mouse-events on web — may behave differently than iOS long-press)
5. **Click an element:** selection highlight (sky-500 outline) appears
6. **Drag a selected element:** moves
7. **Undo button:** reverts last action; click 5 times → 5 actions reverted (zundo limit 20)
8. **Redo button:** redoes
9. **Polygon mode (TrianglePlay icon):** click → enters polygon mode; click 3+ points on canvas → polygon-in-progress dashes; click "Beet abschließen" (CheckSquare) → polygon committed to bed element
10. **Cancel polygon (X icon):** clears in-progress polygon
11. **Manual save (Save icon):** writes pending elements immediately
12. **Auto-save observation:** mutate element, wait 5s, watch Network tab → request fires after debounce
13. **Delete (Trash2 icon):** removes selected element

### 1.8.3 Drafts tray inside editor
1. Open the bottom-sheet chip ("Letzte Importe" counter)
2. Snap points: 50% (half), 90% (full) — drag handle to test
3. Filter chips: `Alle` / `Aktuell` / `Stale` — switch and confirm filtering
4. Stale-badge: if you have an import older than 30 days, the card shows the badge; younger drafts don't
5. **Bed-draft promotion via tap-Annehmen (a11y fallback path, D-18):**
   - Tap "Annehmen" on a bed-draft card → screen-root Pan callback fires → element appears on canvas
   - Verify: new `plan_element` row in Supabase with `imported_from = draftId`, draft marked `promoted`
6. **Bed-draft promotion via drag (D-14 primary path):**
   - On web, long-press + drag may not work the same — try mouse-down-hold + drag
   - This is the path the iPhone test will hit harder

### 1.8.4 Things to try to break
- Place 50+ elements; does rendering slow? (web won't hit 60fps target but should stay usable)
- Pinch-zoom via trackpad pinch or Ctrl+scroll → may or may not work on web
- Rotate via two-finger gesture (trackpad) → likely web-incompatible
- Resize browser mid-edit → viewport recalculates?
- Reload mid-edit (no save) → unsaved changes lost? auto-save should have fired by 5s, so reload >5s after last edit should preserve
- Force quit browser → outbox queue should preserve writes
- Toggle layer to hide all → empty canvas, no crash
- Click empty area → deselects

---

## 1.9 Offline + sync

1. Open `/(app)/plan` with elements visible
2. DevTools → Network → Offline checkbox
3. Make several mutations (move element, add new bed, undo, etc.)
4. **Expected:** writes go into outbox; no immediate error
5. Network → Online again
6. **Expected:** outbox flushes; rows appear in Supabase
7. **Try to break:**
   - Edit same garden in 2nd browser tab simultaneously while offline in tab 1 → reconnect → LWW (last write wins by `updatedAt`)
   - Kill outbox mid-flush (back offline) → state consistent on next reconnect

---

## 1.10 Pass/Fail rubric for Web

Report per section:
- ✅ Pass — works as expected, no issues
- ⚠ Partial — works but with caveats (note them)
- ❌ Fail — broken; copy verbatim error
- ⏸ Blocked — couldn't test (note why)

| Section | Status | Notes |
|---|---|---|
| 1.1 Cold start | | |
| 1.2 Auth | | |
| 1.3 Onboarding | | |
| 1.4 Shared Garden | | |
| 1.5 Home | | |
| 1.6 Import paste-fallback | | |
| 1.7 Draft review | | |
| 1.8 Plan Editor (Skia) | | |
| 1.9 Offline + sync | | |

---

# Part 2 — iPhone Test Plan

This is the **first-class platform** — everything in Part 1 plus Plan-Editor in its native habitat.

## 2.0 Getting the app onto your iPhone

You have **three options** in increasing order of setup work. Choose based on what you have available.

### Option A — Expo Go (fastest, **may not work for Phase 7**)

**Why it may not work:** Phase 7 added `@shopify/react-native-skia@1.12.4` and `react-native-gesture-handler@2.31.2`. Both are pre-bundled in Expo Go for SDK 53, but the **specific Skia version** is locked to whatever Expo SDK 53's Expo Go ships. If their bundled version is < 1.12.4 or > 1.12.4 with breaking changes, the editor will fail to mount.

**Steps:**
1. On iPhone App Store, install **Expo Go**.
2. On your PC (Windows), terminal in repo root:
   ```bash
   pnpm --filter app start
   ```
3. Metro starts and prints a QR code in the terminal AND in the browser at `http://localhost:8081`.
4. On iPhone, open the **Camera** app → point at the QR code → tap the notification → opens in Expo Go.
5. App downloads + runs.
6. **If you see a "Skia version mismatch" or "gesture-handler native module not found" error:** Expo Go can't run Phase 7. Switch to Option B.

**Networking caveat:** iPhone and PC must be on the **same Wi-Fi**. If they're not, Metro can't reach the phone. Workaround: use `pnpm --filter app start --tunnel` to route through ngrok (slower but works across networks).

### Option B — EAS Build dev client (proper way, **recommended for Phase 7**)

This builds a custom development client `.ipa` containing your exact native deps (incl. Skia 1.12.4 + gesture-handler 2.31.2). Once installed, it's a one-time setup; reloads happen via Metro just like Expo Go.

**Prerequisites:**
- An Expo account (free tier OK): https://expo.dev/signup
- An Apple Developer account ($99/year) **OR** Expo's free internal-distribution path with a 7-day cert

**The current `eas.json` has a bug for your case:** the `development` profile is set to `ios: { simulator: true }` — that's for **macOS Simulator only, not real devices**. You need to either:
- Edit `app/eas.json` to add a new `development-device` profile, OR
- Override at build time with `--profile preview` (which is also `internal` distribution and works on real devices).

**Steps (using `preview` profile which is real-device compatible):**

```bash
# One-time setup (PC, terminal in repo root)
pnpm dlx eas-cli login           # sign in to Expo
pnpm dlx eas-cli build:configure # if it asks, accept defaults — eas.json already exists

# Register your iPhone with the Expo project (one-time, opens browser to add UDID via Apple)
pnpm dlx eas-cli device:create

# Build the IPA — this runs on Expo's cloud builders, takes ~10–25 min
cd app
pnpm dlx eas-cli build --profile preview --platform ios
```

When the build finishes:
1. EAS prints a URL like `https://expo.dev/.../builds/xxx`
2. Open that URL **on your iPhone's browser** (Safari)
3. Tap "Install" — iOS will ask you to trust the certificate (Settings → General → VPN & Device Management → trust the Expo cert)
4. App icon appears on home screen — tap to launch
5. On PC: `pnpm --filter app start` → Metro starts → app on phone connects automatically (same Wi-Fi)

**To improve:** edit `app/eas.json` and add a real-device development profile:
```json
"development-device": {
  "developmentClient": true,
  "distribution": "internal",
  "env": { "ENVIRONMENT": "dev" }
}
```
Then use `--profile development-device`.

### Option C — Local Xcode build (requires macOS + Xcode)

Only viable if you have a Mac available. Since you're on Windows 11, **skip this option**.

---

### Recommended for Phase 7 testing

→ **Option B with `preview` profile.** Setup cost ~30 min once; then iterate fast via Metro hot reload.

If you want to test today without the EAS setup wait, **try Option A first**. If the editor crashes on launch, fall back to Option B.

---

## 2.1 Phone setup before testing

1. Phone fully charged
2. **Two test gardens** ready (one with imports, one fresh) — easier to test edge cases
3. Have a **valid `spatenstich-import.v1` JSON** ready in your iCloud Notes or a draft email so you can quickly trigger Share-Intent
4. Open Settings → Accessibility → check "Reduce Motion" is OFF (we want full animations)
5. Open Settings → Battery → make sure low-power mode is OFF (artificially throttles iOS)
6. Settings → Display & Brightness → set brightness ~60% (consistent baseline)

---

## 2.2 Everything from Part 1 applies on iPhone

Run sections **1.1 → 1.7 + 1.9** on iPhone with these touch-specific additions:

- **Tap targets:** every button is ≥44×44pt per Apple HIG (this is in UI-SPEC). Tap accuracy should be perfect.
- **Keyboard handling:** when textarea is focused (e.g. paste-fallback), the keyboard should not cover the active field. Scroll behavior matters.
- **Swipe back gesture:** iOS edge-swipe-from-left should navigate back (Expo Router default)
- **Status bar:** dark/light content adapts to bg color
- **Safe areas:** notch + home indicator respected (no content under them)

---

## 2.3 Share-Intent flow (iPhone-only, the "right" import path)

This is the path your Claude.ai workflow expects.

1. Open Claude.ai in **Safari on iPhone** (not Chrome — Share-Intent works best in Safari)
2. Trigger your "Spatenstich Garden" Claude project, get a `spatenstich-import.v1` JSON output
3. Long-press the JSON code block → "Copy" OR open the share sheet on the message
4. **Expected:** Spatenstich app appears in the share sheet (it registered as a handler for `application/json` per Phase 6 D-08)
5. Tap Spatenstich → app opens directly to import preview
6. **Try to break:**
   - Share text that's NOT valid JSON → German error in app, no crash
   - Share a HTML page → graceful rejection
   - Share via Notes app instead of Safari → does Share-Intent still work?
   - Share while app is already open on a different screen → confirm `resetShareIntent()` fires (Phase 6 P03 pitfall — re-navigation loop should be gone)

---

## 2.4 Plan Editor on iPhone — **THE BIG ONE**

This is where Phase 7's value lives. On native this is supposed to be GPU-accelerated 60fps.

### 2.4.1 Mount + initial render
1. Home → "Plan öffnen" → editor mounts
2. **Expected:** sub-second mount; canvas + toolbar + palette visible
3. **Watch for:** any frame drop on initial render (one beachball spinner is acceptable; visible jank is not)

### 2.4.2 Single-finger interactions
1. **Tap empty canvas:** deselects (if anything was selected)
2. **Tap element:** sky-500 selection outline appears
3. **Pan canvas with one finger:** moves viewport
4. **Drag selected element:** element follows finger; releases at final position
5. **Try to break:**
   - Tap rapidly 10× on same element → no jitter, no duplicate selection
   - Drag element to edge of canvas → bounded or wraps?
   - Drag element off-canvas entirely → element stays at boundary or gets clipped?

### 2.4.3 Two-finger gestures
1. **Pinch in/out:** canvas zooms; clamp at 0.5×–4×
2. **Two-finger rotate:** rotates the selected element (NOT the canvas — Phase 7 D-04 + B1 revision)
   - Place a non-square bed → select it → rotate with two fingers → bed visibly rotates
   - On release, `provenance.rotateDeg` accumulates
   - Repeat: rotate twice → total rotation is sum (e.g., 45° + 30° = 75°)
3. **Try to break:**
   - Pinch + rotate simultaneously → both gestures should apply (Gesture.Simultaneous in EditorCanvas)
   - Pinch outside clamp range → bounces or stops at limit
   - Two-finger gesture with no element selected → no error, but rotation has no target

### 2.4.4 Long-press → drag from palette
1. Switch to "Beete" tab in palette
2. **Long-press** a swatch (~220ms hold; this is `activateAfterLongPress` setting)
3. **Expected:** card shows accent border (activated); now drag onto canvas
4. **Release:** element appears at drop point
5. **Try to break:**
   - Short tap (no long-press) → does nothing or shows hint
   - Long-press without dragging → released = nothing happens
   - Drag onto toolbar or palette area → released = no placement (only canvas is drop zone)
   - Multiple long-press starts in rapid succession → state recoverable

### 2.4.5 Polygon drawing
1. Toolbar → polygon-mode icon (TrianglePlay)
2. Tap 3 corner points on canvas
3. **Expected:** dashed line connects them; "Beet abschließen" CheckSquare button enables (was disabled before 3 points)
4. Tap "Beet abschließen"
5. **Expected:** polygon committed as bed element; bbox + corner points stored in `provenance`
6. **Try to break:**
   - Tap 2 points then "Beet abschließen" → button disabled, no commit
   - Tap 10 points then commit → all stored
   - Self-intersecting polygon (zigzag) → committed or rejected? (Phase 7 didn't specify — note behavior)
   - Cancel mid-polygon (X icon) → cleared, no element added
   - Tap "Plan öffnen" / navigate away mid-polygon → state lost? confirmed?

### 2.4.6 Undo/Redo
1. Make 5 mutations (place, move, rotate, delete, layer-toggle)
2. Undo 5 times
3. **Expected:** each undo reverts one action in reverse order; layer-toggle is NOT undone (per D-... — partialized out of history)
4. Redo 3 times
5. Make a new mutation → redo stack clears
6. **Try to break:**
   - 30 undos (limit is 20) → first 10 are gone; undo button disabled after the 20th
   - Undo with empty history → button disabled, no error

### 2.4.7 Auto-save
1. Move an element
2. **Watch:** SaveStateIndicator shows "saving" spinner briefly, then "saved" check after ~5s
3. **Watch network/SyncStatus badge:** outbox flushes
4. **Manual save:** tap Save icon → immediate flush, no 5s wait
5. **Try to break:**
   - Mutate, wait 4.9s, mutate again → debounce reset; new save fires 5s after last
   - Mutate, immediately force-quit app (Cmd-swipe up from app switcher) → reopen → element NOT present (Phase 7 EDIT-09 manual smoke 2)
   - Mutate, wait 6s for save, force-quit → reopen → element IS present
   - Mutate offline (airplane mode) → outbox accumulates → online → flushes
   - Mutate, then network → SaveStateIndicator shows "error red" with retry option

### 2.4.8 Drafts tray (the big new UX)
1. Have at least 2 imported drafts (1 fresh, 1 stale = `imported_at` > 30d)
2. Open drafts tray chip → snap to 50%
3. Drag handle up → snap to 90%
4. Drag handle down → snap to chip (collapsed)
5. **Filter chips:**
   - `Alle` → both visible
   - `Aktuell` → only fresh visible
   - `Stale` → only old visible; "Älter als 30 Tage" badge visible
6. **Bed-draft drag (primary path D-14):**
   - Long-press a bed-draft card → `bedDraftDragging` shared value set
   - Drag finger onto canvas at a specific location
   - Release
   - **Expected (Phase 7 DRAFT-02 manual smoke 3):** element appears within ±0.5m of finger position; `imported_from = draftId`; draft moves out of tray (status `promoted`)
7. **Bed-draft Annehmen-tap (a11y fallback D-18):**
   - Tap "Annehmen" button on a bed-draft card
   - **Expected:** element promoted (no specific coords; auto-layout via `nextFreeBedSlot`)
8. **Plant-draft promotion:**
   - Tap a plant-draft card
   - **Expected:** BedPickerModal opens, listing all bed elements
   - Select a bed → `promotePlantDraft` fires → plant becomes a real `plan_element` with `imported_from = plantDraftId`
9. **Verwerfen:** dismiss → draft marked `dismissed`, gone from tray
10. **Stale visual sanity (DRAFT-03 manual smoke 4):**
    - Open Supabase dashboard, manually update an `imports.imported_at` to `now() - interval '31 days'`
    - Pull-to-refresh drafts tray (if supported) or close+reopen
    - **Expected:** "Älter als 30 Tage" badge on the affected draft card

### 2.4.9 60fps stress test (EDIT-12 manual smoke 1) — **the headline criterion**
1. Need 200 elements. Quickest path:
   - Open Supabase SQL editor → paste a one-off INSERT generating 200 mock `plan_elements` rows (varied positions, mix of beds/plants/infra) — script template:
     ```sql
     INSERT INTO plan_elements (id, garden_id, element_type, x, y, width_m, height_m, layer, created_at, updated_at, created_by_user_id, updated_by_user_id)
     SELECT
       gen_random_uuid(),
       '<YOUR_GARDEN_ID>',
       (ARRAY['Beet','Pflanze','Weg','Zaun','Sonstiges'])[1 + (random() * 4)::int],
       random() * 20, random() * 20, 0.5 + random() * 2, 0.5 + random() * 2,
       CASE WHEN random() < 0.3 THEN 'seasonal' ELSE 'infrastructure' END,
       now(), now(),
       '<YOUR_USER_ID>', '<YOUR_USER_ID>'
     FROM generate_series(1, 200);
     ```
   - Sync pulls them; editor renders all 200
2. Open Xcode → Window → Devices and Simulators → select your iPhone → "Open Console" (or use Instruments)
3. In editor: pan + pinch continuously for 60 seconds
4. **Expected (Phase 7 EDIT-12):** median frame rate ≥ 58 fps over the 60s window
5. **If it drops below 58:** that's a finding. Phase 7's plan calls for viewport culling (Skia `Group` + element clipping); confirm in DevTools whether it's enabled.
6. **Try to break:**
   - Pan rapidly back and forth (whip the canvas) — should not jank
   - Pinch zoom from 0.5× to 4× → all 200 elements re-render smoothly
   - Toggle layer (hide half the elements) → frame rate improves
   - Toggle grid → no significant impact

---

## 2.5 Share-Intent + cross-device sync

This tests the **2-user Shared Garden Model** in real conditions.

1. **iPhone (you):** open editor, place 3 elements
2. **Web browser on PC (partner):** open same garden's editor (if web works) OR Home screen
3. **Expected:** within seconds, PC sees the 3 new elements (sync pull)
4. **Try to break:**
   - Simultaneous edits: iPhone moves element X, web deletes element X → LWW wins (whoever wrote latest `updatedAt`)
   - Phone offline → make 5 edits → web makes 3 edits → phone goes online → reconcile (LWW per row, no conflict UI)
   - Use the invite-code-flow to add a second account, then test from a second iPhone

---

## 2.6 Edge cases worth probing

| Scenario | Expected | Why this matters |
|---|---|---|
| Background app for 10 min, return | Token still valid; state restored | iOS aggressive memory mgmt |
| Receive a phone call mid-edit | Editor paused, returns cleanly | Audio interrupts on iPhone |
| Low-power mode ON during editing | App still works; framerate may drop | Realistic real-user condition |
| Switch to landscape (rotate phone) | Canvas re-layouts (may not be supported — note behavior) | UI-SPEC didn't specify landscape |
| Use external keyboard (Smart Keyboard / Bluetooth) | Text fields focusable; arrow keys may not move canvas | Accessibility |
| iOS Dark Mode | Colors invert appropriately; canvas keeps sketch-warm palette regardless | UI-SPEC §dark mode |
| Take screenshot during editing | No state corruption | Sanity |
| Use Reachability (one-handed mode) | Top toolbar accessible without two hands | Apple HIG |
| AirPlay to TV during editing | Mirror works; performance may drop | Less critical |
| Hold finger on screen for 30+ seconds with no gesture | No tooltip overlay or "is the screen frozen?" UX | Edge case for inactivity |
| Bash the screen with palm | No errant tap registers | Edge case |
| Toggle airplane mode mid-drag of bed-draft | Drop happens (local), syncs later | Offline resilience |

---

## 2.7 Pass/Fail rubric for iPhone

| Section | Status | Notes |
|---|---|---|
| 2.0 Got app on phone | | Option A / B / C used? |
| 2.1 Setup | | |
| 2.2 Part 1 sections on iPhone | | Notes per sub-section |
| 2.3 Share-Intent | | |
| 2.4.1 Editor mount | | |
| 2.4.2 Single-finger | | |
| 2.4.3 Two-finger pinch+rotate | | |
| 2.4.4 Long-press drag from palette | | |
| 2.4.5 Polygon drawing | | |
| 2.4.6 Undo/redo | | |
| 2.4.7 Auto-save + crash recovery | | |
| 2.4.8 Drafts tray | | |
| 2.4.9 **60fps @ 200 elements** | | The headline; report median FPS |
| 2.5 Cross-device sync | | |
| 2.6 Edge cases | | |

---

# Part 3 — Reporting back

After running the tests, save findings as:

```
.planning/phases/07-plan-editor-drafts-integration-m2-m07-5/07-MANUAL-TEST-REPORT.md
```

Structure:

```markdown
# Phase 7 Manual Test Report

**Date:** [date]
**Tester:** Dirk (+ partner if used)
**Build commit:** [commit SHA you tested]
**Devices:** [iPhone model + iOS version] + [browser + version]

## Web findings
[per section: pass/partial/fail/blocked + notes]

## iPhone findings
[per section]

## Headline: EDIT-12 60fps result
[median FPS over 60s @ 200 elements; pass if ≥58]

## Blockers discovered
[list any issues that prevent shipping]

## Findings to triage
[list issues that are real but not blockers — defer to next phase or quick fix]

## What worked surprisingly well
[positive surprises]
```

Then run `/gsd-debug <slug>` for any blockers and `/gsd-add-todo` for triage items.

---

# Quick reference card

| Need | Command |
|---|---|
| Start web dev server | `pnpm --filter app web` |
| Start iOS dev server (Metro) | `pnpm --filter app start` |
| Build IPA for iPhone | `cd app && pnpm dlx eas-cli build --profile preview --platform ios` |
| Register iPhone with Expo | `pnpm dlx eas-cli device:create` |
| Run all tests | `pnpm --filter app test` |
| Type-check | `pnpm --filter app typecheck` |
| Migration status | `pnpm --filter app exec supabase migration list --linked` |
| Reset web cache | DevTools → Application → "Clear site data" |
| Reset native cache | Long-press app icon → Delete; reinstall via Expo Go/EAS |

**Supabase project ref:** `vitrqkzxkiqvadqfzrcx` (Frankfurt) — keep this handy for SQL editor + dashboard work.
