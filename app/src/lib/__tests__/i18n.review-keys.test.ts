// Phase 6.5 Plan 01: Wave-0 test scaffold — Crit-7 i18n keys.
// Tests filled in by Plan 03 (i18n de.json extension).
// Pattern: read-only JSON assertion via @spatenstich/shared/i18n/de.
//
// Covers:
//   Crit-7 (alle import.review.* keys vorhanden, non-empty, UTF-8 Umlaute).

process.env['EXPO_PUBLIC_SUPABASE_URL'] = 'https://test.example';
process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] = 'test-anon-key';

describe('i18n review-keys', () => {
  it.todo('defines de.import.review.title');
  it.todo('defines de.import.review.accept / dismiss / edit / done');
  it.todo('defines de.import.review.autoPromoteToggle');
  it.todo('defines de.import.review.emptyState / promoting / promoteError');
  it.todo('defines de.import.review.editForm.{labelPlaceholder, lengthPlaceholder, widthPlaceholder, save, cancel}');
  it.todo('all review.* string values are non-empty and contain UTF-8 umlauts where expected (ä/ö/ü/ß)');
});
