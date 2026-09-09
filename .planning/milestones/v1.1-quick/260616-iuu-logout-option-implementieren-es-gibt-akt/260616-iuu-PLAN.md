---
phase: quick-260616-iuu
plan: "01"
type: execute
wave: 1
depends_on: []
files_modified:
  - app/app/(app)/index.tsx
  - packages/shared/src/i18n/de.json
  - app/src/components/__tests__/home-settings-button.test.tsx
autonomous: true
requirements: [QUICK-260616-IUU]
must_haves:
  truths:
    - "Vom Home-Screen aus erreicht der Nutzer den Einstellungen-Screen (und damit die bestehende Abmelden-Funktion) per Tippen auf ein Zahnrad-Icon im Header — in beiden Render-Branches (Plan-View und Empty-State)."
    - "Das Zahnrad-Icon ist sowohl im Account- als auch im Lokal-Modus sichtbar (Einstellungen ist in beiden Modi nützlich)."
    - "Die bestehende Abmelde-Logik in settings.tsx bleibt unverändert."
  artifacts:
    - path: "app/app/(app)/index.tsx"
      provides: "SettingsButton-Komponente + Rendering in beiden Header-Branches"
      contains: "home-settings-button"
    - path: "packages/shared/src/i18n/de.json"
      provides: "i18n-Label für das Einstellungen-Icon"
      contains: "settingsButtonLabel"
    - path: "app/src/components/__tests__/home-settings-button.test.tsx"
      provides: "Render-/Navigations-Test für den Settings-Entry-Point"
      contains: "home-settings-button"
  key_links:
    - from: "app/app/(app)/index.tsx"
      to: "/(app)/settings"
      via: "router.push im SettingsButton"
      pattern: "router\\.push\\('/\\(app\\)/settings'"
---

<objective>
Den Logout für den Nutzer erreichbar machen. Der komplette Abmelde-Flow existiert bereits und funktioniert (`app/app/(app)/settings.tsx`, Account-Modus: `settings-logout` → Inline-Bestätigung → `signOut()` → `router.replace('/(auth)')`). Der einzige Defekt: Nichts navigiert zum Einstellungen-Screen — der Home-Header hat nur einen Profil-Button, und `profile/index.tsx` verlinkt nicht weiter. Auf Mobile (Expo Go, keine URL-Leiste) ist `/(app)/settings` damit faktisch unerreichbar.

Dieser Plan ergänzt einen Zahnrad-Button (lucide `Settings`) im Home-Header neben dem bestehenden `ProfileButton`, in BEIDEN Render-Branches, der zu `/(app)/settings` navigiert. Muster: exakt analog zum `ProfileButton` aus Quick 260611-jrl.

Purpose: Nutzer kann sich abmelden — der fehlende Einstiegspunkt wird geschlossen.
Output: Settings-Icon im Home-Header (beide Branches, beide Modi sichtbar), neuer i18n-Key, Render-/Navigations-Test.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

# Home-Screen — Einstiegspunkt fehlt (hier wird der Button ergänzt, beide Render-Branches)
@app/app/(app)/index.tsx

# Settings-Screen — Logout-Flow EXISTIERT BEREITS, NICHT anfassen (nur als Navigationsziel referenziert)
@app/app/(app)/settings.tsx

# Bewährtes Test-Muster: Route-Screen aus dem components-Jest-Projekt rendern, expo-router + Stores mocken
@app/src/components/__tests__/preview-navigation.test.tsx

# Component-Test-Setup — mockt bereits lucide-react-native (Proxy → No-op für JEDES Icon, inkl. Settings) und NativeWind
@app/src/components/__tests__/setup.ts

# i18n — der "home"-Namespace (enthält bereits profileButtonLabel) bekommt settingsButtonLabel
@packages/shared/src/i18n/de.json
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Settings-Icon im Home-Header (beide Branches) + i18n-Label + Navigations-Test</name>
  <files>app/app/(app)/index.tsx, packages/shared/src/i18n/de.json, app/src/components/__tests__/home-settings-button.test.tsx</files>
  <behavior>
    - Test 1 (Empty-State): Bei `useAuthStore`-Mock mit `mode: 'account'`, `activeGardenId: null` (kein Plan → Empty-State-Branch) rendert HomeScreen genau einen Button mit testID `home-settings-button`. `fireEvent.press` darauf ruft `router.push('/(app)/settings')` auf.
    - Test 2 (Lokal-Modus): Bei `mode: 'local'`, `activeGardenId: null` ist `home-settings-button` ebenfalls vorhanden und navigiert zu `/(app)/settings` (Einstellungen ist auch im Lokal-Modus erreichbar — Migration/Sync/Datenschutz).
    - Negativ-Assertion (Schutz vor Regression): Der bestehende `home-profile-button` bleibt vorhanden und navigiert weiterhin zu `/(app)/profile` (nicht versehentlich überschrieben).
  </behavior>
  <action>
(1) `packages/shared/src/i18n/de.json` — im bestehenden `"home"`-Namespace (direkt nach `"profileButtonLabel"`, ~Zeile 231) einen neuen Key `"settingsButtonLabel"` mit Wert `"Einstellungen"` ergänzen. ECHTE UTF-8-Zeichen verwenden, gültiges JSON wahren (Komma nach dem vorherigen Eintrag, keine anderen Einträge anfassen). Dies ist der accessibilityLabel-Text des Icons.

(2) `app/app/(app)/index.tsx` — den Import von `lucide-react-native` um `Settings` erweitern (aktuell `import { User } from 'lucide-react-native';` → `import { Settings, User } from 'lucide-react-native';`). Analog zur bestehenden `ProfileButton`-Komponente (Zeilen 20–33) eine lokale `SettingsButton`-Komponente im selben File definieren: ruft `useRouter()` selbst auf, rendert ein `<Pressable>` mit `onPress={() => router.push('/(app)/settings' as any)}`, `accessibilityRole="button"`, `accessibilityLabel={t('home.settingsButtonLabel')}`, `testID="home-settings-button"`, identischer 44px-Touch-Target-Klasse (`className="min-w-[44px] min-h-[44px] items-center justify-center"`) und als Kind das `<Settings>`-Icon mit gleicher stone-Palette wie ProfileButton (`size={24} color="#78716C"`). KEINE Modus-Bedingung — der Button ist in beiden Modi sichtbar (er steht außerhalb der mode-abhängigen `statusLabel`-Logik). Den Logout NICHT in den Lokal-Modus bringen — der lebt korrekt account-only in settings.tsx.

(3) In BEIDEN Render-Branches `<SettingsButton />` direkt vor `<ProfileButton />` in dieselbe Header-Zeile setzen, damit Zahnrad links neben Profil-Icon steht: im Plan-View-Branch innerhalb der Header-Zeile (~Zeile 104, aktuell nur `<ProfileButton />` rechts) — den `<ProfileButton />` so umbauen, dass beide Buttons in einem `flex-row items-center gap-3`-Container rechts liegen; im Empty-State-Branch im bestehenden `absolute top-4 right-4 flex-row items-center gap-3`-Container (~Zeile 150) `<SettingsButton />` direkt vor `<ProfileButton />` einfügen. Bestehende Buttons (Import/Plan/Kalender) und deren Reihenfolge bleiben unverändert. settings.tsx NICHT verändern.

(4) Test `app/src/components/__tests__/home-settings-button.test.tsx` neu anlegen, Muster aus `preview-navigation.test.tsx` übernehmen (components-Jest-Projekt, jsdom, setup.ts mockt lucide + NativeWind). Mocks: `jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, replace: jest.fn() }) }))`; `jest.mock('@/src/lib/supabase', ...)` mit `supabase.auth.getSession` → `Promise.resolve({ data: { session: null } })`; `jest.mock('@/src/lib/gardenPlanRepo', ...)` (loadDimensions/loadAcceptedElements als jest.fn, im Empty-State mit `activeGardenId: null` nie aufgerufen); `jest.mock('@/src/stores/authStore', () => ({ useAuthStore: (sel) => sel({ mode, activeGardenId: null }) }))` — `mode` pro Testfall über eine veränderbare Variable steuern (vgl. stable-store-Muster im Referenztest). HomeScreen via `import HomeScreen from '../../../app/(app)/index';` laden. Mit `findByTestId('home-settings-button')` (loading-Phase abwarten), `fireEvent.press`, dann `await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/(app)/settings'))`. KEINE fenced code blocks in der Implementierung außerhalb der Testdatei selbst.
  </action>
  <verify>
    <automated>node -e "const d=require('./packages/shared/src/i18n/de.json'); if(!d.home||!d.home.settingsButtonLabel){process.exit(1)} console.log('i18n ok:', d.home.settingsButtonLabel)"</automated>
    <automated>pnpm --filter app test -- home-settings-button</automated>
    <automated>pnpm --filter app typecheck</automated>
  </verify>
  <done>de.json enthält `home.settingsButtonLabel` als gültiges JSON mit echten UTF-8-Zeichen; `index.tsx` rendert in BEIDEN Render-Branches einen `SettingsButton` (testID `home-settings-button`, accessibilityRole="button", deutsches accessibilityLabel) der per `router.push('/(app)/settings')` navigiert und in beiden Modi sichtbar ist; der neue Test bestätigt Navigation zu `/(app)/settings` (Account- und Lokal-Modus) und dass `home-profile-button` weiterhin zu `/(app)/profile` führt; `home-settings-button` Test grün; typecheck exit 0; settings.tsx UNVERÄNDERT.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| keine neue | Navigation zu einem bereits existierenden, intern gerouteten Screen (`/(app)/settings`). Kein neuer Netzwerk-Endpunkt, keine Auth-Änderung, kein neuer Input. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-iuu-01 | Elevation of Privilege | SettingsButton-Navigation | accept | Reine clientseitige Navigation zu vorhandener Route; Zugriffsschutz unverändert über bestehenden GuardedStack. Keine neue Angriffsfläche. |
| T-iuu-02 | Tampering | npm/pip/cargo installs | accept | Keine neuen Pakete. `lucide-react-native` (Quelle des `Settings`-Icons) ist bereits Projekt-Dependency und in Verwendung (`User`-Icon). Kein Install-Schritt. |
</threat_model>

<verification>
- `home.settingsButtonLabel` existiert als gültiger UTF-8-String in de.json.
- `index.tsx` enthält eine `SettingsButton`-Komponente und rendert sie in beiden Render-Branches (Plan-View + Empty-State).
- `router.push('/(app)/settings'` ist in index.tsx vorhanden.
- Test `home-settings-button.test.tsx` grün (Account + Lokal navigieren zu /(app)/settings; profile-button unverändert).
- `pnpm --filter app typecheck` exit 0.
- `app/app/(app)/settings.tsx` ist unverändert (Logout-Flow intakt).
</verification>

<success_criteria>
- Vom Home-Screen aus erreicht der Nutzer in beiden Render-Branches und beiden Modi den Einstellungen-Screen per Zahnrad-Icon — und damit die bestehende Abmelden-Funktion.
- Der bestehende Logout-Flow in settings.tsx bleibt unangetastet.
- Neuer i18n-Key mit korrektem Deutsch; Test deckt die Navigation ab; typecheck sauber.
</success_criteria>

<output>
Create `.planning/quick/260616-iuu-logout-option-implementieren-es-gibt-akt/260616-iuu-SUMMARY.md` when done
</output>
