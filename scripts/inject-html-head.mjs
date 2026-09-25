#!/usr/bin/env node
// Fallback-Patch für app/dist/index.html — Phase 20 Plan 03 Task 2 (DEPLOY-03).
// app/public/index.html WIRD von @expo/cli als HTML-Template honoriert (verifiziert
// gegen @expo/cli 0.24.24, siehe RESEARCH.md Pattern 1). Dieses Skript ist der
// vom Kontext geforderte Sicherheitsnetz-Fallback: es prüft NACH `expo export`,
// ob die erwarteten <head>-Tags vorhanden sind, und patcht nur, wenn sie fehlen.
//
// Läuft ohne Argumente (Pfad ist fest: app/dist/index.html relativ zum Repo-Root).
// Meldet auf der Konsole, ob gepatcht wurde oder nicht — dieser Satz gehört laut
// CONTEXT/Task 2 in die SUMMARY.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const DIST_INDEX = path.join(REPO_ROOT, 'app/dist/index.html');

function main() {
  if (!existsSync(DIST_INDEX)) {
    console.error(`inject-html-head.mjs: ${path.relative(REPO_ROOT, DIST_INDEX)} nicht gefunden — expo export lief nicht oder schrieb nach woanders.`);
    process.exit(1);
  }

  let html = readFileSync(DIST_INDEX, 'utf8');
  const original = html;

  const hasManifestLink = /<link[^>]*rel="manifest"[^>]*>/.test(html);
  const hasGermanLang = /<html[^>]*lang="de"[^>]*>/.test(html);
  const hasThemeColor = /<meta[^>]*name="theme-color"[^>]*content="#4A7C59"[^>]*>/.test(html);
  const hasFaviconLink = /<link[^>]*rel="icon"[^>]*href="\/icons\/favicon-32\.png"[^>]*>/.test(html);

  if (hasManifestLink && hasGermanLang && hasThemeColor && hasFaviconLink) {
    console.log('inject-html-head.mjs: app/dist/index.html enthält bereits alle erwarteten Kopf-Tags (Export-Template griff) — kein Patch nötig.');
    process.exit(0);
  }

  if (!hasGermanLang) {
    html = html.replace(/<html([^>]*)lang="[^"]*"([^>]*)>/, '<html$1lang="de"$2>');
    if (!/<html[^>]*lang="de"[^>]*>/.test(html)) {
      // No lang attribute at all — add one.
      html = html.replace(/<html([^>]*)>/, '<html$1 lang="de">');
    }
  }

  const missingHeadTags = [];
  if (!hasManifestLink) missingHeadTags.push('<link rel="manifest" href="/manifest.json">');
  if (!hasThemeColor) missingHeadTags.push('<meta name="theme-color" content="#4A7C59">');
  if (!hasFaviconLink) missingHeadTags.push('<link rel="icon" href="/icons/favicon-32.png">');

  if (missingHeadTags.length > 0) {
    html = html.replace('</head>', `${missingHeadTags.join('\n  ')}\n</head>`);
  }

  if (html === original) {
    console.log('inject-html-head.mjs: keine Änderung nötig.');
    process.exit(0);
  }

  writeFileSync(DIST_INDEX, html);
  console.log(`inject-html-head.mjs: app/dist/index.html gepatcht (fehlende Tags ergänzt: ${missingHeadTags.length > 0 ? missingHeadTags.join(', ') : 'lang="de"'}).`);
}

main();
