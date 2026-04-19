// Phase 1 + Phase 2 assertions for de.json
// MUST preserve Phase 1 assertions (common.ok === 'OK', errors.network) to avoid regression.
import deJson from '../i18n/de.json';

// Cast to generic record via unknown — de.json structure is nested, treat as free-form for tests.
const de = deJson as unknown as Record<string, any>;

describe('de.json', () => {
  // ── Phase 1 regression guards ────────────────────────────────
  it('is valid JSON and contains common.ok (Phase 1)', () => {
    expect(de).toBeTruthy();
    expect(de['common']?.['ok']).toBe('OK');
  });

  it('contains errors.network (Phase 1)', () => {
    expect(de['errors']?.['network']).toBeTruthy();
  });

  // ── Phase 2 new keys ─────────────────────────────────────────
  it('auth.choice.create_account === "Account erstellen"', () => {
    expect(de['auth']?.['choice']?.['create_account']).toBe('Account erstellen');
  });

  it('auth.choice.local_start === "Lokal starten"', () => {
    expect(de['auth']?.['choice']?.['local_start']).toBe('Lokal starten');
  });

  it('common.disclaimer_body matches /Empfehlungen ohne Gewähr/ AND /BKleingG-Compliance/', () => {
    const body: string = de['common']?.['disclaimer_body'];
    expect(body).toMatch(/Empfehlungen ohne Gewähr/);
    expect(body).toMatch(/BKleingG-Compliance/);
  });

  it('common.error_network exists', () => {
    expect(de['common']?.['error_network']).toBeTruthy();
  });

  it('profile.bkleingg.no_plan exists', () => {
    expect(de['profile']?.['bkleingg']?.['no_plan']).toBeTruthy();
  });

  it('rules.upload.loading_title exists', () => {
    expect(de['rules']?.['upload']?.['loading_title']).toBeTruthy();
  });

  it('auth.register.submit === "Konto erstellen"', () => {
    expect(de['auth']?.['register']?.['submit']).toBe('Konto erstellen');
  });

  it('auth.login.submit === "Anmelden"', () => {
    expect(de['auth']?.['login']?.['submit']).toBe('Anmelden');
  });

  it('profile.plz.submit === "Klimazone übernehmen"', () => {
    expect(de['profile']?.['plz']?.['submit']).toBe('Klimazone übernehmen');
  });

  it('rules.confirm.bkleingg_group references BKleingG', () => {
    expect(de['rules']?.['confirm']?.['bkleingg_group']).toMatch(/BKleingG/);
  });

  it('settings.logout === "Abmelden"', () => {
    expect(de['settings']?.['logout']).toBe('Abmelden');
  });

  it('app.index.placeholder exists', () => {
    expect(de['app']?.['index']?.['placeholder']).toBeTruthy();
  });
});
