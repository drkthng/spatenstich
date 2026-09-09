---
slug: web-rebuild-checkpoint
task: "Commit and push: Web-App Rückbau Checkpoint — Router + Auth-Guard funktionieren"
status: in-progress
created: 2026-04-30
---

# Quick Task: Web Rebuild Checkpoint — Commit & Push

## Description

Commit all uncommitted web fixes from the incremental rebuild session:
- Root layout with Expo Router Stack (replaces Hello World)
- AuthProvider integration
- Imperative auth guard (router.replace instead of Redirect — fixes web "navigate before mount" crash)
- LogBox suppression for web
- global.css import for NativeWind
- Platform-specific storage files (index.web.ts / index.native.ts)
- Entry point fix (app/index.js)

## Tasks

1. Stage all relevant changed/new files
2. Commit with descriptive message
3. Push to remote

## Files Changed

- `app/app/_layout.tsx` — rebuilt with Router + AuthProvider + imperative guard
- `app/app/_layout.tsx.bak` — backup of full layout (reference)
- `app/index.js` — entry point fix (Bundle 404)
- `app/src/storage/index.web.ts` — web-only storage adapter
- `app/src/storage/index.native.ts` — native-only storage adapter
- `app/src/storage/index.ts` — deleted (replaced by platform-specific files)
- `app/app.config.ts` — config adjustments
- `app/metro.config.js` — Metro config fixes
- `app/package.json` — main entry point
- `app/tailwind.config.js` — darkMode: 'class'
- `app/tsconfig.json` — path adjustments
- `app/.gitignore` — new
