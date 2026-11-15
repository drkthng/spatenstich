<!-- GSD:project-start source:PROJECT.md -->
## Project

**Kleingarten-App**

Persönlicher digitaler Kleingarten-Assistent für deutsche Kleingärtner. Zwei Personen (Dirk + Partnerin) pflegen über eigene Konten und Geräte (Android-Handys + Desktop-Browser) denselben Garten in einem exakten 2D-Plan-Editor, mit Aussaatkalender und Aufgabenliste. **Seit dem Pivot vom 2026-11-13 nutzt die App die Claude-API über Dirks eigenen API-Schlüssel (Budget 100 $/Monat)** für Foto-Abgleich und Aufgaben-Sortierung. Die Claude.ai-Import-Bridge bleibt als zweiter Weg.

**Core Value:** Ein Gartenplan, den beide gemeinsam exakt pflegen können, und eine App, die daraus sagt, was heute zu tun ist. Der Editor ist das Herzstück.

### Constraints

- **Tech Stack:** Expo (React Native) mit Web-Export — web-first PWA für Android Chrome und Desktop-Browser, kein nativer Build
- **Backend:** Supabase (Frankfurt, EU) — Postgres + Auth + Realtime + Edge Functions. DSGVO-konform.
- **KI nur serverseitig:** Claude-API-Aufrufe ausschließlich aus einer Supabase Edge Function mit dem offiziellen Anthropic-SDK. Der API-Schlüssel ist ein Server-Secret und darf nie in Client-Code, Bundle, Commit oder Log stehen (Repo ist public). Jede Anfrage wird pro Garten im Verbrauchsbuch erfasst; Monatsgrenze 100 $. Standardmodell `claude-opus-5-5`.
- **KI ändert den Plan nie ohne Bestätigung:** Vorschläge laufen durch die bestehende Sichtung.
- **Offline:** App startet und zeigt letzten Plan und die Grund-Aufgabenliste ohne Netz. Sync, Foto-Abgleich und KI-Sortierung erfordern Verbindung.
- **Plan-Rendering:** SVG im Web-DOM, ein `PlanEditor` mit Pointer-Events für Finger und Maus; Skia wird entfernt.
- **Lokale Persistenz:** IndexedDB hinter `StorageAdapter`. Sync-Layer: eigene Outbox, Last-Write-Wins nach Bearbeitungszeit (2-User Shared Garden).
- **Datenschutz:** Fotos verlassen das Gerät nur zur Analyse (Edge Function → Anthropic API) und werden nicht gespeichert; gespeichert werden nur Befunde. EU-Hosting für gespeicherte Daten.
- **Design:** „Feldführer" (Sketch 001, `.planning/sketches/MANIFEST.md`, Tokens in `.planning/sketches/themes/feldfuehrer.css`).
- **Monorepo:** pnpm workspaces mit `app/`, `supabase/` (Migrations + Edge Functions), `packages/shared`.
- **Timeline:** Nutzbar zum Vorkultur-Start der Saison 2027 (Ende Februar 2027). Reihenfolge: Editor zuerst.
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

**v2.0 (aktuell, Phase 20+):** Web-first PWA (Android Chrome + Desktop-Browser).
Kein nativer Build in v2.0 (D-01) — `eas-build.yml` laeuft nur noch manuell
(`workflow_dispatch`) bis Phase 29. Die tatsaechlich installierte Version dieses
SDK-Mixes ist Ist-Stand (D-13: kein Upgrade in Phase 20 ausser den in Masterplan
Anhang A genannten Entfernungen/Ergaenzungen):

**Betrieb (Phase 20.4):** Deploy-Ziel ist **Cloudflare Pages** (`spatenstich.pages.dev`,
Direct Upload aus GitHub Actions bei jedem Push auf `master`); Hosting/Backend bleibt
Supabase Free (Frankfurt), wach gehalten durch einen GitHub-Zeitplan alle drei Tage plus
einen taeglichen Task-Scheduler-Ping vom 24/7-PC (Keep-alive).

## Recommended Stack (Zielzustand ab Phase 29 — SDK-Upgrade, siehe MASTERPLAN-v2.md)
| Library / Tool | Version | Purpose | Confidence |
|---|---|---|---|
| Expo SDK | 55 (stable Feb 2026) | Universal app framework, web export | HIGH |
| React Native | 0.83 (via SDK 55) | Core native runtime | HIGH |
| React | 19.2 (via SDK 55) | UI framework | HIGH |
| Expo Router | 4.x (via SDK 55) | File-based routing + web SSR scaffolding | HIGH |
| @shopify/react-native-skia | latest (~1.x) | SVG/canvas plan editor (hardware-accelerated) | HIGH |
| react-native-gesture-handler | 2.x | Touch/pan/pinch gestures for plan editor | HIGH |
| react-native-reanimated | 3.x | Worklet animations tightly coupled with Skia | HIGH |
| NativeWind | 4.x | Tailwind-based styling across native + web | MEDIUM |
| react-native-reusables | latest | Headless component primitives built on NativeWind | MEDIUM |
| Zustand | 5.x | Global state (garden plan, user profile, sync queue) | HIGH |
| TanStack Query | 5.x | Server state / Supabase fetching + cache invalidation | HIGH |
| @supabase/supabase-js | 2.49.5+ | Postgres + Auth + Storage + Realtime | MEDIUM |
| expo-sqlite | 15.x (bundled SDK 55) | Local structured storage, offline plan persistence | MEDIUM |
| expo-file-system | latest | Photo queue offline storage | HIGH |
| expo-image-picker | latest | Photo selection for manual attachments | HIGH |
| expo-secure-store | latest | Token storage for auth | HIGH |
| TypeScript | 5.x | Type safety throughout | HIGH |
| pnpm workspaces | 9.x | Monorepo: app/, supabase/, packages/shared | MEDIUM |
| Deno (Supabase Edge Functions) | 2.x | Server-side utilities and the only place Claude API calls are made | HIGH |
## What NOT to Use
| Rejected | Why Not |
|---|---|
| react-native-svg (for plan editor) | Static SVG renderer. No GPU acceleration, no worklet-level hit-testing. Will drop frames above ~50 elements with gestures. Use only for decorative icons. |
| Tamagui | Heavier compiler setup, smaller community, slower issue resolution. Good technology but wrong fit for solo-dev MVP on tight timeline. |
| Redux Toolkit | Over-engineered for single-user app. 3x boilerplate vs Zustand for the same outcome. |
| Jotai | Atomic model creates indirection for a plan canvas that is inherently one cohesive object. Zustand slices are simpler. |
| SWR | Weaker offline mutation support vs TanStack Query. No React Native community samples. |
| expo-sqlite without abstraction | Web alpha status + COOP/COEP header requirement means direct use will break in some hosting environments. Wrap behind an interface from day one. |
| Expo Webpack | Deprecated. Expo Router on Metro is the only supported web path in SDK 52+. |
| `@supabase/supabase-js` < 2.49.5 | Broken under Metro ES module resolution (RN 0.79+). The `ws` stream import error blocks all Supabase usage, not just Realtime. |
| react-native-reanimated v4 | Not yet stable with NativeWind v4 on SDK 53-54. Stay on v3 until compatibility is confirmed on SDK 55. |
| Pl@ntNet client-side | Not used — plant identification goes through the Claude API in the Edge Function. |
| Anthropic SDK in client | The API key must never reach a device or the bundle. Call Claude only from the Supabase Edge Function. |
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
