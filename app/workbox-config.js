// Workbox injectManifest config — Phase 20 Plan 03 Task 2 (DEPLOY-03).
// Läuft NACH `expo export --platform web` (siehe package.json build:web-Script);
// globDirectory muss auf das frisch erzeugte dist/ zeigen, sonst ist das
// Precache-Manifest leer (RESEARCH key_link).
module.exports = {
  globDirectory: 'dist',
  globPatterns: ['**/*.{html,js,css,png,svg,ico,json,woff2}'],
  swSrc: 'sw-src.js',
  swDest: 'dist/sw.js',
  // Reserve oberhalb der aktuellen Bundle-Groesse (~5.94 MB nach Plan 20-02).
  maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
};
