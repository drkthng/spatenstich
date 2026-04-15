<!-- GSD:project-start source:PROJECT.md -->
## Project

**Kleingarten-App**

Persönlicher digitaler Kleingarten-Assistent für deutsche Kleingärtner. Die App übersetzt eine reale Parzelle per Foto-Analyse in einen interaktiven 2D-Plan und kombiniert jahreszyklische Aussaat-/Pflanzplanung mit rechtlich-regulatorischem Kontext (BKleingG + Vereinssatzungen). MVP für Einzelnutzer (Dirk), optimiert für iPhone und Desktop-Browser.

**Core Value:** Foto rein → Plan und Kalender raus: Die KI-gestützte Überführung einer realen Parzelle in einen digital planbaren, regelkonformen Kleingarten-Assistenten.

### Constraints

- **Tech Stack:** Expo (React Native) mit Web-Export — eine Codebase für iOS, Android, Desktop-Browser
- **Backend:** Supabase (Frankfurt, EU) — Postgres + Auth + Storage + Edge Functions. DSGVO-konform.
- **Offline:** App startet und zeigt letzten Plan ohne Netz; Foto-Queue offline. KI-Calls und Sync erfordern Verbindung.
- **Plan-Rendering:** SVG-basiert (react-native-svg / natives SVG im Web). Bei > 50 Elementen: Upgrade auf @shopify/react-native-skia erwogen.
- **Lokale Persistenz:** expo-sqlite (strukturierte Daten) + expo-file-system (Foto-Queue). Sync-Layer: eigene simple Operation-Log-Queue, Last-Write-Wins (Single-User).
- **KI-Budget:** Soft-Limit 50 Claude-Calls/User/Tag, Hard-Limit 200/Tag.
- **Datenschutz:** Fotos verschlüsselt at-rest, Geo-Daten opt-in, DSGVO-Konformität (EU-Hosting).
- **Monorepo:** pnpm workspaces mit `app/`, `supabase/` (Migrations + Edge Functions), `packages/shared`.
- **Timeline:** MVP-Ziel Ende Juni 2026 (realistisch mit Buffer). Harte Deadline: Saison 2026 muss nutzbar sein.
- **Pl@ntNet API:** Nichtkommerzielle Nutzung frei; bei Kommerzialisierung Vereinbarung nötig.
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Recommended Stack
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
| expo-camera / expo-image-picker | latest | Guided photo capture flow (M1) | HIGH |
| expo-secure-store | latest | Token storage for auth | HIGH |
| TypeScript | 5.x | Type safety throughout | HIGH |
| pnpm workspaces | 9.x | Monorepo: app/, supabase/, packages/shared | MEDIUM |
| Deno (Supabase Edge Functions) | 2.x | Server-side Claude Vision + Pl@ntNet calls | HIGH |
## Key Findings
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
| Pl@ntNet client-side | API key must remain server-side. Route through Edge Functions same as Claude calls. |
## Open Questions
## Sources
- [Expo SDK 55 Changelog](https://expo.dev/changelog/sdk-55)
- [Expo SDK 53 Changelog](https://expo.dev/changelog/sdk-53) — Metro package.json exports default-on
- [Expo Monorepo Guide](https://docs.expo.dev/guides/monorepos/) — pnpm hoisted config
- [React Native Skia](https://shopify.github.io/react-native-skia/) — Skia gestures docs
- [Shopify: Getting Started with RN Skia](https://shopify.engineering/getting-started-with-react-native-skia)
- [SW Mansion: You Might Not Need react-native-svg](https://blog.swmansion.com/you-might-not-need-react-native-svg-b5c65646d01f)
- [Supabase JS Metro issue #1403](https://github.com/supabase/supabase-js/issues/1403) — ws/stream error with RN 0.79
- [Expo: Libraries incompatible with Metro ES Module resolution](https://github.com/expo/expo/discussions/36551)
- [expo-sqlite SQLite docs](https://docs.expo.dev/versions/latest/sdk/sqlite/)
- [expo-sqlite web SharedArrayBuffer issue #38481](https://github.com/expo/expo/issues/38481)
- [NativeWind installation docs](https://www.nativewind.dev/docs/getting-started/installation)
- [NativeWind vs Tamagui vs twrnc 2026](https://www.pkgpulse.com/blog/nativewind-vs-tamagui-vs-twrnc-react-native-styling-2026)
- [pnpm + Expo monorepo issue: isolated deps failing](https://github.com/expo/expo/issues/41806)
- [EAS CLI pnpm lockfile detection issue #3247](https://github.com/expo/eas-cli/issues/3247)
- [React Native 0.83 release notes](https://reactnative.dev/blog/2025/12/10/react-native-0.83)
- [TanStack Query offline-first sample (Expo + SQLite)](https://github.com/kapobajza/React_Native_Offline_first_sample)
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
