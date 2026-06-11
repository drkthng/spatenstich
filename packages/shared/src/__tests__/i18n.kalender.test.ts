// Phase 10 Plan 01: assertions for de.json kalender.* keys
// Mirrors i18n.test.ts structure (import + cast pattern)
import deJson from '../i18n/de.json';

// Cast to generic record via unknown — de.json structure is nested, treat as free-form for tests.
const de = deJson as unknown as Record<string, any>;

describe('de.json kalender keys', () => {
  it('kalender.title === "Aussaatkalender"', () => {
    expect(de['kalender']?.['title']).toBe('Aussaatkalender');
  });

  it('kalender.aufWelchemBeet === "Auf welchem Beet?"', () => {
    expect(de['kalender']?.['aufWelchemBeet']).toBe('Auf welchem Beet?');
  });

  it('kalender.legende hat alle 4 AktionsTypen (Vorkultur, Direktsaat, Auspflanzen, Ernte)', () => {
    const l = de['kalender']?.['legende'];
    expect(l?.['vorkultur']).toBeTruthy();
    expect(l?.['direktsaat']).toBeTruthy();
    expect(l?.['auspflanzen']).toBeTruthy();
    expect(l?.['ernte']).toBeTruthy();
  });

  it('kalender.detail.mindestabstand enthält {cm}', () => {
    const val: string = de['kalender']?.['detail']?.['mindestabstand'];
    expect(val).toContain('{cm}');
  });

  it('kalender.detail.sonnenbedarf enthält {value}', () => {
    const val: string = de['kalender']?.['detail']?.['sonnenbedarf'];
    expect(val).toContain('{value}');
  });

  it('alle Pflicht-Keys des kalender-Objekts sind Strings', () => {
    const need = [
      'title', 'kwLabel', 'dieseWoche', 'jahresuebersicht', 'filterMeinePflanzen',
      'klimazoneLabel', 'aufWelchemBeet', 'zuPlanHinzufuegen', 'planOeffnen',
      'hinzugefuegtBanner', 'nochNichtImPlan', 'plzFehlt', 'plzJetztEingeben',
      'keinBeetImPlan',
    ];
    for (const k of need) {
      expect(typeof de['kalender']?.[k]).toBe('string');
    }
  });

  it('kalender.kwLabel enthält {kw} und {year}', () => {
    const val: string = de['kalender']?.['kwLabel'];
    expect(val).toContain('{kw}');
    expect(val).toContain('{year}');
  });
});
