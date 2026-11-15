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
  // Phase 38: plain German. "Account" is "Konto"; texts no screen used are gone
  // (auth.choice.local_start, profile.bkleingg.*, app.index.*).
  it('auth.choice.create_account === "Konto erstellen"', () => {
    expect(de['auth']?.['choice']?.['create_account']).toBe('Konto erstellen');
  });

  it('common.disclaimer_body says: no warranty, and names the law in full', () => {
    const body: string = de['common']?.['disclaimer_body'];
    expect(body).toMatch(/Empfehlungen ohne Gewähr/);
    expect(body).toMatch(/Bundeskleingartengesetz/);
  });

  it('common.error_network exists', () => {
    expect(de['common']?.['error_network']).toBeTruthy();
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

  it('rules.confirm.bkleingg_group names the law in full', () => {
    expect(de['rules']?.['confirm']?.['bkleingg_group']).toMatch(/Bundeskleingartengesetz/);
  });

  it('settings.logout === "Abmelden"', () => {
    expect(de['settings']?.['logout']).toBe('Abmelden');
  });

  it('rules.confirm.edit keys exist for inline edit UI', () => {
    const edit = de['rules']?.['confirm']?.['edit'];
    expect(edit?.['titel_label']).toBeTruthy();
    expect(edit?.['wert_label']).toBeTruthy();
    expect(edit?.['einheit_label']).toBeTruthy();
    expect(edit?.['save']).toBeTruthy();
    expect(edit?.['cancel']).toBeTruthy();
  });
});
