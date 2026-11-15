// Phase 6.5: i18n review-keys test (Crit-7).
// Asserts presence of all required de.import.review.* keys + UTF-8 umlauts.

process.env['EXPO_PUBLIC_SUPABASE_URL'] = 'https://test.example';
process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] = 'test-anon-key';

import de from '@spatenstich/shared/i18n/de';

describe('i18n review-keys', () => {
  const review = (de as any).import?.review;

  it('defines de.import.review block', () => {
    expect(review).toBeDefined();
  });

  it('defines title', () => {
    expect(typeof review.title).toBe('string');
    expect(review.title.length).toBeGreaterThan(0);
    expect(review.title).toBe('Import-Vorschläge sichten');
  });

  it('defines accept / dismiss / edit / done', () => {
    expect(review.accept).toBe('Annehmen');
    expect(review.dismiss).toBe('Verwerfen');
    expect(review.edit).toBe('Bearbeiten');
    expect(review.done).toBe('Fertig');
  });

  it('defines autoPromoteToggle and names the threshold in words', () => {
    expect(typeof review.autoPromoteToggle).toBe('string');
    // Phase 38: "ab 80 %" instead of the sign for "greater than or equal".
    expect(review.autoPromoteToggle).toMatch(/ab 80 %/);
    expect(review.autoPromoteToggle).not.toMatch(/≥/);
  });

  it('defines emptyState / promoting / promoteError', () => {
    expect(typeof review.emptyState).toBe('string');
    expect(review.emptyState.length).toBeGreaterThan(0);
    expect(typeof review.promoting).toBe('string');
    expect(review.promoting.length).toBeGreaterThan(0);
    expect(typeof review.promoteError).toBe('string');
    expect(review.promoteError.length).toBeGreaterThan(0);
  });

  it('defines editForm.{labelPlaceholder, lengthPlaceholder, widthPlaceholder, save, cancel}', () => {
    expect(review.editForm).toBeDefined();
    expect(review.editForm.labelPlaceholder).toBe('Bezeichnung');
    expect(review.editForm.lengthPlaceholder).toBe('Länge (cm)');
    expect(review.editForm.widthPlaceholder).toBe('Breite (cm)');
    expect(review.editForm.save).toBe('Speichern');
    expect(review.editForm.cancel).toBe('Abbrechen');
  });

  it('uses real UTF-8 umlauts (not ASCII replacements)', () => {
    // Länge contains ä
    expect(review.editForm.lengthPlaceholder).toMatch(/ä/);
    // promoting "Wird übernommen …" contains ü
    expect(review.promoting).toMatch(/ü/);
    // promoteError "Übernahme fehlgeschlagen…" contains Ü
    expect(review.promoteError).toMatch(/Ü/);
  });
});
