// Phase 38 (DESIGN3-08): privacy notes with the section about photos going to Anthropic, the
// Impressum with or without the operator's lines, and version and build.
import * as React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { version: '3.0.0' } } }));

import { buildLine, ImprintContent, PrivacyContent } from '../legal/LegalScreens';

describe('Datenschutz', () => {
  it('has a section about photos going to Anthropic that says what is sent, what is kept and where it goes', () => {
    const { getByTestId, getByText } = render(<PrivacyContent dsn={null} />);
    expect(getByTestId('legal-privacy-photos')).toBeTruthy();
    expect(getByText(/Übermittlung an Anthropic/)).toBeTruthy();
    expect(getByText(/schickt die App deine Fotos verkleinert .* Anthropic in den USA/)).toBeTruthy();
    expect(getByText(/Spatenstich speichert die Fotos nicht/)).toBeTruthy();
    expect(getByText(/nicht zum Training der KI verwendet/)).toBeTruthy();
  });

  it('names where the garden data lies and who is responsible', () => {
    const { getByText } = render(<PrivacyContent dsn={null} />);
    expect(getByText(/Supabase auf Servern in Frankfurt/)).toBeTruthy();
    expect(getByText(/Verantwortlich ist der Betreiber der App. Die App wird privat für einen Haushalt betrieben/)).toBeTruthy();
  });

  it('says the truth about crash reports for this build', () => {
    expect(render(<PrivacyContent dsn={null} />).getByText(/Fehlerberichte sind in dieser Ausgabe der App ausgeschaltet/)).toBeTruthy();
    expect(
      render(<PrivacyContent dsn="https://k@o1.ingest.de.sentry.io/2" />).getByText(/Sentry auf Servern in der EU/),
    ).toBeTruthy();
    expect(
      render(<PrivacyContent dsn="https://k@o1.ingest.sentry.io/2" />).getByText(/auch außerhalb der EU stehen können/),
    ).toBeTruthy();
  });
});

describe('Impressum', () => {
  const build = { version: '3.0.0', build: '2752273', date: '15.11.2026' };

  it('shows the operator line by line', () => {
    const { getByText, queryByTestId } = render(
      <ImprintContent imprint="Erika Muster|Gartenweg 1|12345 Musterstadt" build={build} />,
    );
    expect(getByText('Erika Muster')).toBeTruthy();
    expect(getByText('12345 Musterstadt')).toBeTruthy();
    expect(queryByTestId('legal-imprint-private')).toBeNull();
  });

  it('says that the app is run privately when no operator is entered, and asks for no address', () => {
    const { getByTestId, queryByTestId } = render(<ImprintContent imprint={undefined} build={build} />);
    const text = String(getByTestId('legal-imprint-private').props.children);
    expect(text).toContain('privat');
    expect(text).not.toMatch(/noch nicht|fehlt/);
    expect(queryByTestId('legal-imprint-operator')).toBeNull();
  });

  it('shows version and build', () => {
    const { getByTestId } = render(<ImprintContent imprint="" build={build} />);
    expect(getByTestId('legal-version').props.children).toBe('Version 3.0.0, Build 2752273 vom 15.11.2026');
  });
});

describe('the line for version and build', () => {
  it('copes with what is not known', () => {
    expect(buildLine({ version: '3.0.0', build: '2752273', date: null })).toBe('Version 3.0.0, Build 2752273');
    expect(buildLine({ version: '3.0.0', build: null, date: null })).toBe('Version 3.0.0, von Hand gebaut');
    expect(buildLine({ version: null, build: null, date: null })).toBe('Version unbekannt, von Hand gebaut');
  });
});
