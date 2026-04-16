import de from '../i18n/de.json';
describe('de.json', () => {
  it('is valid JSON and contains common.ok', () => {
    expect(de).toBeTruthy();
    expect((de as Record<string, Record<string, string>>)['common']?.['ok']).toBe('OK');
  });
});
