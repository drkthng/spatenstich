---
phase: quick-260611-jrl
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - app/app/(app)/index.tsx
  - packages/shared/src/i18n/de.json
autonomous: true
requirements: [QUICK-jrl-01]
must_haves:
  truths:
    - "Im Home-Screen mit vorhandenem Plan ist ein Profil-Icon erreichbar, das zu /(app)/profile navigiert"
    - "Im Home-Screen ohne Plan (Empty-State) ist dasselbe Profil-Icon erreichbar"
    - "Das Profil-Icon ist ein Touch-Target von mindestens 44px mit deutschem accessibilityLabel"
    - "Über /(app)/profile sind die bisher verwaisten Screens (PLZ/Klimazone, Archetyp, Vereinsregeln) wieder erreichbar"
  artifacts:
    - path: "app/app/(app)/index.tsx"
      provides: "Profil-Zugang in beiden Render-Branches des Home-Screens"
      contains: "home-profile-button"
    - path: "packages/shared/src/i18n/de.json"
      provides: "Deutsches Label für das Profil-Icon"
      contains: "profileButtonLabel"
  key_links:
    - from: "app/app/(app)/index.tsx"
      to: "/(app)/profile"
      via: "router.push in onPress des Profil-Buttons"
      pattern: "router\\.push\\('/\\(app\\)/profile'"
---

<objective>
Der Home-Screen (`app/app/(app)/index.tsx`) verlinkt aktuell nur Import, Plan und Kalender. Die existierenden Screens `/(app)/profile` (inkl. `/profile/plz` für PLZ/Klimazone, `/profile/archetype`, `/profile/vereinsregeln`) und `/(app)/settings` sind von nirgendwo erreichbar — auf Mobile (Expo Go, keine URL-Leiste) faktisch unzugänglich. UAT-Test 5 (Klimazonen-Verschiebung) war dadurch blockiert.

Dieser Plan ergänzt ein Profil-Icon im Home-Header, das per `router.push('/(app)/profile')` zum Profil-Übersichtsscreen navigiert. Beide Render-Branches des Home-Screens (Plan vorhanden + Empty-State) erhalten den Zugang. Bestehende Header-Struktur, Styling-Patterns (NativeWind, stone-Palette) und das i18n-`de.json`-Pattern werden respektiert.

Purpose: Verwaiste Profil-/Einstellungs-Screens auf Mobile wieder erreichbar machen; UAT-Blocker auflösen.
Output: Geänderter Home-Screen mit Profil-Zugang in beiden Branches + neuer deutscher i18n-Key.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@./CLAUDE.md
@.planning/todos/pending/2026-06-11-home-navigation-profil-settings-fehlt.md

# Zu ändernde Datei — hat ZWEI Render-Branches (Plan-View ScrollView ab Zeile 74, Empty-State View ab Zeile 128)
@app/app/(app)/index.tsx

# Ziel-Screen der Navigation (existiert bereits, Route /(app)/profile)
@app/app/(app)/profile/index.tsx

# In-Repo-Präzedenz für lucide-Icon in Pressable mit accessibilityRole/accessibilityLabel/testID + 44px-Target
@app/app/(app)/settings.tsx

# i18n: bestehende "home"-Namespace (Zeilen 228-231) — neuer Key hier ergänzen
@packages/shared/src/i18n/de.json
</context>

<tasks>

<task type="auto">
  <name>Task 1: i18n-Label ergänzen + Profil-Icon in beiden Home-Branches einbauen</name>
  <files>packages/shared/src/i18n/de.json, app/app/(app)/index.tsx</files>
  <action>
Zwei Änderungen, beide klein und minimal-invasiv:

(1) `packages/shared/src/i18n/de.json` — im bestehenden `"home"`-Namespace (aktuell `emptyTitle`/`emptySubtitle`, ~Zeile 228) einen neuen Key `"profileButtonLabel"` mit Wert `"Profil und Einstellungen"` ergänzen. ECHTE UTF-8-Zeichen verwenden (hier keine Umlaute nötig, aber JSON-Validität wahren: gültiges Komma nach vorherigem Eintrag, keine ASCII-Ersetzungen anderswo anfassen). Dies ist der accessibilityLabel-Text des Icons.

(2) `app/app/(app)/index.tsx` — Profil-Icon-Zugang in BEIDE Render-Branches einbauen. Den Befund respektieren: es gibt zwei separate Return-Blöcke (Plan-View ScrollView ab ~Zeile 74; Empty-State View ab ~Zeile 128), jeder mit eigenem Status-Label-Block (`home-auth-status`). Vorgehen:

- Import ergänzen: `import { User } from 'lucide-react-native';` (Pattern wie EditorToolbar.tsx — Named-Import einzelner Icons). `Pressable` aus `react-native` mit importieren (aktuell werden nur `View, Text, ScrollView` importiert).
- Eine lokale, im File definierte Komponente `ProfileButton` (oben in der Datei, oberhalb `HomeScreen`) erstellen, die den Router per Prop oder via `useRouter` direkt nutzt. Empfehlung: `useRouter()` innerhalb `ProfileButton` aufrufen (vermeidet Prop-Drilling), `onPress={() => router.push('/(app)/profile' as any)}`. Der `as any`-Cast folgt dem bestehenden Datei-Muster (alle anderen `router.push`-Calls im File casten ebenfalls).
- `ProfileButton` rendert ein `<Pressable>` mit: `accessibilityRole="button"`, `accessibilityLabel={t('home.profileButtonLabel')}`, `testID="home-profile-button"`, NativeWind-Klassen für mindestens 44px Touch-Target (z. B. `className="min-w-[44px] min-h-[44px] items-center justify-center"`), und als Kind das `<User>`-Icon mit stone-Palette-Farbe (z. B. `color="#78716C"` = stone-500, passend zu den bestehenden `text-stone-*`-Tönen; `size={24}`).
- Platzierung Plan-View-Branch (ScrollView): Den bestehenden Status-Label-Block (`self-end mb-2`, ~Zeile 81-85) zu einer Header-Zeile umbauen ODER eine eigene oberste Zeile ergänzen, die rechtsbündig den `ProfileButton` zeigt. Empfehlung: eine `<View className="self-stretch flex-row items-center justify-between mb-2">` als erstes Kind des ScrollView-Contents — links der vorhandene `statusLabel`-Text (falls vorhanden, sonst leeres `<View />` als Spacer), rechts der `ProfileButton`. Vorhandene `testID="home-auth-status"` und Styling des Status-Texts beibehalten.
- Platzierung Empty-State-Branch (View): Hier liegt `home-auth-status` aktuell `absolute top-4 right-4`. Den `ProfileButton` ebenfalls oben rechts platzieren, ohne mit dem Status-Label zu kollidieren — z. B. einen `<View className="absolute top-4 right-4 flex-row items-center gap-3">` der sowohl Status-Text (falls vorhanden) als auch `ProfileButton` enthält. Den bestehenden absoluten Status-Block durch diese kombinierte Zeile ersetzen, `testID="home-auth-status"` am Text-Element erhalten.
- KEINE Code-Fences hier — Umsetzung nach Datei-Lektüre; Struktur/Reihenfolge der bestehenden Buttons (Import/Plan/Kalender) NICHT verändern.

Hinweis: lucide-react-native ist ESM — in der App (Metro/Expo) bereits in EditorToolbar etc. problemlos genutzt, kein zusätzliches Setup nötig.
  </action>
  <verify>
    <automated>node -e "const d=require('./packages/shared/src/i18n/de.json'); if(!d.home || !d.home.profileButtonLabel){process.exit(1)} console.log('i18n key ok:', d.home.profileButtonLabel)"</automated>
  </verify>
  <done>de.json enthält `home.profileButtonLabel` als gültiges JSON; `index.tsx` rendert in beiden Render-Branches ein `Pressable` mit testID `home-profile-button`, accessibilityRole="button", deutschem accessibilityLabel und navigiert per `router.push('/(app)/profile')`.</done>
</task>

<task type="auto">
  <name>Task 2: Typecheck + Gate-Verifikation (beide Branches, Navigation, a11y)</name>
  <files>app/app/(app)/index.tsx</files>
  <action>
Verifiziere die Änderung deterministisch. Es existiert KEIN jest-Projekt, das Tests unter `app/app/(app)/` matched (jest.config.ts deckt nur `src/**` ab), und es gibt keinen bestehenden Home-Screen-Test — daher kein neuer RTL-Screen-Test in diesem Quick-Task (das erforderte ein neues jest-Projekt = außerhalb des Scopes). Verifikation stattdessen über App-Typecheck (fängt fehlerhafte Imports/JSX) plus gezielte Gate-Greps:

1. App-Typecheck ausführen (Script aus app/package.json): `pnpm --filter app typecheck` — muss exit 0 liefern (validiert lucide-Import, Pressable-Import, JSX-Korrektheit).
2. Gate-Grep: genau ZWEI Vorkommen von `home-profile-button` (ein Button pro Branch) — bestätigt, dass beide Render-Pfade den Zugang haben.
3. Gate-Grep: mindestens ein `router.push('/(app)/profile'` — bestätigt das Navigationsziel.
4. Gate-Grep: `accessibilityRole="button"` und `accessibilityLabel` am/nahe dem Profil-Button vorhanden.

Falls Typecheck wegen vorbestehender, unrelated Fehler rot ist (siehe STATE.md zu früheren tsc-Eigenheiten), die NEU eingeführten Zeilen isoliert prüfen und im SUMMARY dokumentieren; der grep-basierte Strukturnachweis bleibt verbindlich.
  </action>
  <verify>
    <automated>pnpm --filter app typecheck</automated>
  </verify>
  <done>`pnpm --filter app typecheck` exit 0 (oder vorbestehende unrelated Fehler dokumentiert); `home-profile-button` erscheint zweimal in index.tsx (beide Branches); `router.push('/(app)/profile'` vorhanden; accessibilityRole/accessibilityLabel am Profil-Button gesetzt.</done>
</task>

</tasks>

<verification>
Strukturelle Gates (PowerShell/ripgrep, beide müssen erfüllt sein):
- Genau 2 Treffer für `home-profile-button` in `app/app/(app)/index.tsx` (Plan-View- + Empty-State-Branch).
- Mindestens 1 Treffer für `router.push('/(app)/profile'` in `index.tsx`.
- `home.profileButtonLabel` als gültiger String in `packages/shared/src/i18n/de.json`.
- `pnpm --filter app typecheck` exit 0 (vorbestehende unrelated Fehler explizit im SUMMARY ausweisen).

Manuelle UAT-Verifikation (durch Dirk, nach Merge — nicht Teil der automatischen Gates):
- Home mit Plan: Profil-Icon oben rechts sichtbar, Tap öffnet Profil-Übersicht.
- Home ohne Plan (Empty-State): Profil-Icon oben rechts sichtbar, Tap öffnet Profil-Übersicht.
- Von der Profil-Übersicht aus sind PLZ/Klimazone (`/profile/plz`), Archetyp und Vereinsregeln erreichbar — UAT-Test 5 entblockt.
</verification>

<success_criteria>
- Profil-Icon (lucide `User`, ≥44px Touch-Target, accessibilityRole="button", deutsches accessibilityLabel via `t('home.profileButtonLabel')`, testID `home-profile-button`) ist in BEIDEN Home-Render-Branches vorhanden.
- Tap navigiert via `router.push('/(app)/profile')` zur bestehenden Profil-Übersicht; die zuvor verwaisten Screens sind darüber wieder erreichbar.
- Bestehende Buttons (Import/Plan öffnen/Kalender) und deren Reihenfolge unverändert; Styling folgt NativeWind/stone-Palette und der bestehenden Header-Struktur.
- de.json bleibt gültiges JSON mit echten UTF-8-Zeichen; `home.profileButtonLabel` ergänzt.
- App-Typecheck grün (oder vorbestehende unrelated Fehler dokumentiert).
</success_criteria>

<output>
Create `.planning/quick/260611-jrl-home-header-profil-icon-erg-nzen-navigat/260611-jrl-SUMMARY.md` when done
</output>
