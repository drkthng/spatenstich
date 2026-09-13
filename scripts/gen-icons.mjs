#!/usr/bin/env node
// Erzeugt aus app/assets/icon.svg die sieben PWA-Icon-Dateien unter app/public/icons/.
// Phase 20 Plan 03 Task 2 (DEPLOY-03). Idempotent, ohne Argumente lauffähig.
//
// Ausgabe:
//   icon-192.png            192x192, purpose "any"       (Papier-Hintergrund, Motiv)
//   icon-512.png            512x512, purpose "any"
//   icon-192-maskable.png   192x192, purpose "maskable"   (Sicherheitsrand auf Papierfarbe)
//   icon-512-maskable.png   512x512, purpose "maskable"
//   icon-512-mono.png       512x512, purpose "monochrome" (einfarbig auf transparentem Grund)
//   favicon-32.png          32x32
//   favicon.ico             32x32, PNG-in-ICO-Container (von Windows Vista+ unterstützt)
//
// Die maskable-Variante nutzt dieselbe SVG wie "any": das Motiv liegt bereits
// innerhalb der inneren 80% des Quell-SVGs (Sicherheitsrand ist im Quellbild
// eingebacken), zusätzliches Padding hier würde das Motiv nur unnötig verkleinern.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const SVG_PATH = path.join(REPO_ROOT, 'app/assets/icon.svg');
const OUT_DIR = path.join(REPO_ROOT, 'app/public/icons');
const PAPER = '#F6F1E7';
const ERDE = '#5B4636';

function readSvg() {
  return readFileSync(SVG_PATH, 'utf8');
}

// Monochrome-Variante: Hintergrund-Rect entfernen (transparenter Grund), Motiv
// bleibt einfarbig (das Quell-SVG verwendet ohnehin nur ERDE für Motiv-Fills/Strokes).
function toMonochromeSvg(svg) {
  return svg.replace(/<rect[^>]*fill="#F6F1E7"[^>]*\/>\s*/, '');
}

// Minimaler PNG-in-ICO-Container (ICONDIR + ein ICONDIRENTRY + rohe PNG-Bytes).
// Von Windows Vista+ und allen modernen Browsern unterstützt — kein externer
// ICO-Encoder nötig.
function pngToIco(pngBuffer, size) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type = icon
  header.writeUInt16LE(1, 4); // image count

  const entry = Buffer.alloc(16);
  entry.writeUInt8(size >= 256 ? 0 : size, 0); // width (0 = 256)
  entry.writeUInt8(size >= 256 ? 0 : size, 1); // height (0 = 256)
  entry.writeUInt8(0, 2); // color count (0 = no palette)
  entry.writeUInt8(0, 3); // reserved
  entry.writeUInt16LE(1, 4); // color planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(pngBuffer.length, 8); // size of image data
  entry.writeUInt32LE(header.length + entry.length, 12); // offset of image data

  return Buffer.concat([header, entry, pngBuffer]);
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const svg = readSvg();
  const monoSvg = toMonochromeSvg(svg);

  const renders = [
    { file: 'icon-192.png', svg, size: 192 },
    { file: 'icon-512.png', svg, size: 512 },
    { file: 'icon-192-maskable.png', svg, size: 192 },
    { file: 'icon-512-maskable.png', svg, size: 512 },
    { file: 'icon-512-mono.png', svg: monoSvg, size: 512 },
    { file: 'favicon-32.png', svg, size: 32 },
  ];

  for (const { file, svg: srcSvg, size } of renders) {
    const buf = await sharp(Buffer.from(srcSvg))
      .resize(size, size)
      .png()
      .toBuffer();
    writeFileSync(path.join(OUT_DIR, file), buf);
    console.log(`✓ ${file} (${size}x${size})`);
  }

  const faviconPngBuf = await sharp(Buffer.from(svg)).resize(32, 32).png().toBuffer();
  const icoBuf = pngToIco(faviconPngBuf, 32);
  writeFileSync(path.join(OUT_DIR, 'favicon.ico'), icoBuf);
  console.log('✓ favicon.ico (32x32, PNG-in-ICO)');

  console.log(`\nAlle sieben Icon-Dateien erzeugt in ${path.relative(REPO_ROOT, OUT_DIR)}/`);
}

main().catch((err) => {
  console.error('gen-icons.mjs failed:', err);
  process.exit(1);
});
