# Stack Research: Kleingarten-App

**Researched:** 2026-04-14
**Overall confidence:** MEDIUM-HIGH (most critical choices verified via official docs + multiple sources)

---

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

---

## Key Findings

1. **Expo SDK 55 is the correct target (not 53).** Released 2026-02-25, ships RN 0.83 + React 19.2. SDK 55 drops legacy architecture entirely — new architecture is mandatory. Plan with this constraint from day one.

2. **Use @shopify/react-native-skia, not react-native-svg, for the plan editor.** The 200-element / 60 fps requirement rules out react-native-svg, which is designed for static vector display. Skia runs on the GPU thread via worklets, handles pan/pinch natively, and is the foundation of the Flutter renderer — the performance story is proven. react-native-svg is fine for static icons elsewhere in the app.

3. **NativeWind v4 + react-native-reusables beats Tamagui for this project.** Tamagui's compiler advantage is real but its complexity overhead (compiler config, theme tokens, limited community components) outweighs benefits for a solo-dev MVP. NativeWind v4 has 5x the weekly downloads (~403k vs ~75k), shares Tailwind vocabulary with web, and react-native-reusables provides copy-paste-and-own component primitives. The main caveat: stay on Reanimated v3 with SDK 53-54; SDK 55 compatibility needs verification.

4. **Supabase JS has a known Metro package-exports incompatibility.** With RN 0.79+ (included in SDK 53+), Metro enables `package.json:exports` by default, and `@supabase/supabase-js` triggers `ws/stream` resolution errors. Fix: pin to `supabase-js >= 2.49.5` (which addresses this) OR add `unstable_enablePackageExports: false` in metro.config.js as a temporary escape hatch. Verify the fix is in the stable release before cutting the first sprint.

5. **Zustand for global state, TanStack Query for server state — use both.** Zustand holds plan canvas state, offline operation queue, and user profile. TanStack Query wraps all Supabase calls with cache + optimistic updates. Redux Toolkit is overkill for a single-user MVP; Jotai's atomic model adds complexity without benefit here since the plan canvas is one large interconnected object.

6. **expo-sqlite web support is alpha and requires COOP/COEP headers.** The web export target is desktop-browser (not mobile web), so this is essential. You need `Cross-Origin-Embedder-Policy: credentialless` and `Cross-Origin-Opener-Policy: same-origin` headers served from your hosting. EAS Hosting supports this via app config. Without these headers, `SharedArrayBuffer` is unavailable and expo-sqlite web throws at runtime. Build an abstraction layer (`packages/shared/storage`) that accepts the same interface — fall back to IndexedDB on web if needed for environments where headers can't be set.

7. **pnpm monorepo + Expo SDK 55: use `node-linker=hoisted`.** SDK 52+ auto-configures `EXPO_USE_METRO_WORKSPACE_ROOT`. However, pnpm's default isolated installs still cause native build errors and dependency resolution failures (confirmed active issues in SDK 53-54). The safe path: add `node-linker=hoisted` in `.npmrc` at the repo root. Duplicate-version detection via `pnpm why react-native` is mandatory before each native build.

8. **Gesture stack for plan editor: Skia + Gesture Handler + Reanimated v3.** React Native Gesture Handler's `Pan`, `Pinch`, and `Tap` compose cleanly with Skia's `Canvas`. Run hit-testing and transform math on the UI thread via Reanimated worklets — never cross the JS bridge per drag frame. This is the only path to guaranteed 60 fps on 200 elements.

9. **Claude Vision calls exclusively via Supabase Edge Functions (Deno).** The PROJECT.md constraint is correct. Never expose the Anthropic API key client-side. Edge Functions also enable per-user rate limiting (50/100/200 soft/hard limits from PROJECT.md) without a separate server. Store raw + parsed AI responses in Postgres for debugging and cache replay.

10. **Expo SDK 55 web export is Metro-bundled (no Webpack).** Static export via `npx expo export --platform web` targets Expo Router's file-based routes. SSR is experimental in SDK 55; stick to static export for MVP. EAS Hosting is the simplest deployment path and natively supports the COOP/COEP headers needed for expo-sqlite.

---

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

---

## Open Questions

1. **NativeWind v4 + Reanimated v3 compatibility on SDK 55** — the confirmed-working combination is SDK 53 + NativeWind 4.1.23 + Reanimated 3.17.5. SDK 55 ships RN 0.83 which may require Reanimated v4. Needs a proof-of-concept spike before styling work begins.

2. **expo-sqlite web on EAS Hosting** — the COOP/COEP header approach is documented but involves alpha-quality WASM SQLite in the browser. Spike needed in M1 to decide: expo-sqlite-web vs IndexedDB via a shared storage interface.

3. **Supabase JS 2.49.5+ stable fix** — the fix was in a `-next.1` pre-release at research time. Verify the stable release exists before the first Supabase integration sprint.

4. **Skia bundle size on web** — Skia ships WASM for web (~7-10 MB). Acceptable for a desktop-browser target (Dirk on desktop), but worth measuring with `expo export --platform web` + bundle analysis (Expo Atlas) early.

5. **pnpm + EAS Build** — EAS Build has reported issues detecting pnpm lockfiles in monorepo setups (open issue #3247 in eas-cli). The hoisted node-linker strategy mitigates this, but EAS Build compatibility must be verified before committing to CI/CD setup.

---

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
