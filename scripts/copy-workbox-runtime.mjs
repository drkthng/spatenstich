#!/usr/bin/env node
// Kopiert die von workbox-sw zur Laufzeit per importScripts() geladenen
// Workbox-Runtime-Dateien aus node_modules nach app/public/workbox-v7.4.1/,
// damit expo export sie wie Icons/Manifest/_headers automatisch nach dist/
// mitkopiert — kein CDN-Aufruf zur Laufzeit (DSGVO/EU-Hosting, Offline-Start
// DEPLOY-07: der Service Worker darf keine externe Netzwerkabhängigkeit haben).
//
// Hintergrund (Phase 20 Plan 03 Task 2, RESEARCH Open Question 1): `workbox
// injectManifest` bündelt KEINE ES-Module-Importe (verifiziert gegen
// workbox-build 7.4.1 Quellcode: "This method will not compile or bundle your
// swSrc file"). app/sw-src.js registriert Workbox deshalb klassisch über
// importScripts('/workbox-v7.4.1/workbox-sw.js') statt über `import`-Statements
// — workbox-sw lädt seine Abhängigkeiten (core, strategies, routing,
// precaching) selbst rekursiv über denselben modulePathPrefix nach, sobald
// sw-src.js auf workbox.precaching/workbox.routing zugreift.
//
// Idempotent, ohne Argumente lauffähig. Läuft vor `expo export` in
// app/package.json build:web.
import { copyFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(REPO_ROOT, 'app/public/workbox-v7.4.1');

// [sourcePackageDir, sourceFileName, destFileName]
const FILES = [
  ['workbox-sw', 'workbox-sw.js', 'workbox-sw.js'],
  ['workbox-core', 'workbox-core.prod.js', 'workbox-core.prod.js'],
  ['workbox-strategies', 'workbox-strategies.prod.js', 'workbox-strategies.prod.js'],
  ['workbox-routing', 'workbox-routing.prod.js', 'workbox-routing.prod.js'],
  ['workbox-precaching', 'workbox-precaching.prod.js', 'workbox-precaching.prod.js'],
];

function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  for (const [pkg, src, dest] of FILES) {
    const srcPath = path.join(REPO_ROOT, 'node_modules', pkg, 'build', src);
    const destPath = path.join(OUT_DIR, dest);
    copyFileSync(srcPath, destPath);
    console.log(`✓ ${pkg}/build/${src} -> ${path.relative(REPO_ROOT, destPath)}`);
  }
  console.log(`\nWorkbox-Runtime-Dateien aktuell (workbox-cli 7.4.1) in ${path.relative(REPO_ROOT, OUT_DIR)}/`);
}

main();
