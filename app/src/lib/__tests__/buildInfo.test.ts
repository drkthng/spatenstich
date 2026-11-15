// Phase 38 (DESIGN3-08): version and build, the operator's lines for the Impressum, where
// crash reports go, and which pages are open to everyone.
import { describeBuild, errorReporting, imprintLines } from '../buildInfo';
import { isPublicRoute } from '../nav/tabs';

describe('version and build', () => {
  it('shortens the commit to seven characters and writes the day the German way', () => {
    expect(describeBuild({ version: '3.0.0', sha: '2752273ABCDEF0123456789abcdef0123456789a', date: '2026-11-15' })).toEqual({
      version: '3.0.0',
      build: '2752273',
      date: '15.11.2026',
    });
  });

  it('a build made by hand has no build number', () => {
    expect(describeBuild({ version: '3.0.0', sha: undefined, date: undefined })).toEqual({ version: '3.0.0', build: null, date: null });
    expect(describeBuild({ version: '3.0.0', sha: '', date: '' }).build).toBeNull();
  });

  it('does not show what is not a commit or a day', () => {
    expect(describeBuild({ version: ' ', sha: 'not a sha', date: 'gestern' })).toEqual({ version: null, build: null, date: null });
    expect(describeBuild({ version: '1.0', sha: '${{ github.sha }}', date: '15.11.2026' })).toEqual({ version: '1.0', build: null, date: null });
  });

  it('takes the day from a full timestamp too', () => {
    expect(describeBuild({ date: '2027-02-03T08:15:00Z' }).date).toBe('3.2.2027');
  });
});

describe('operator lines for the Impressum', () => {
  it('splits at "|" and at line breaks, drops empty lines', () => {
    expect(imprintLines('Erika Muster | Gartenweg 1|12345 Musterstadt||erika@example.org')).toEqual([
      'Erika Muster',
      'Gartenweg 1',
      '12345 Musterstadt',
      'erika@example.org',
    ]);
    expect(imprintLines('Erika Muster\nGartenweg 1\r\n12345 Musterstadt')).toHaveLength(3);
    expect(imprintLines('Erika Muster\\nGartenweg 1')).toEqual(['Erika Muster', 'Gartenweg 1']);
  });

  it('is empty when nothing is set', () => {
    expect(imprintLines(undefined)).toEqual([]);
    expect(imprintLines(null)).toEqual([]);
    expect(imprintLines('   ')).toEqual([]);
    expect(imprintLines('||')).toEqual([]);
  });
});

describe('where crash reports go', () => {
  it('nowhere without an address', () => {
    expect(errorReporting(undefined)).toBe('off');
    expect(errorReporting('')).toBe('off');
    expect(errorReporting('not a url')).toBe('off');
  });

  it('the EU for the German ingest host, elsewhere for any other', () => {
    expect(errorReporting('https://abc@o123.ingest.de.sentry.io/456')).toBe('eu');
    expect(errorReporting('https://abc@o123.ingest.sentry.io/456')).toBe('elsewhere');
    expect(errorReporting('https://abc@o123.ingest.us.sentry.io/456')).toBe('elsewhere');
    // A host that only looks like it.
    expect(errorReporting('https://abc@de.sentry.io.example.org/1')).toBe('elsewhere');
  });
});

describe('pages open to everyone', () => {
  it('privacy notes and Impressum, nothing else', () => {
    expect(isPublicRoute(['datenschutz'])).toBe(true);
    expect(isPublicRoute(['impressum'])).toBe(true);
    expect(isPublicRoute(['(app)', 'mehr'])).toBe(false);
    expect(isPublicRoute(['(auth)', 'login'])).toBe(false);
    expect(isPublicRoute(['(app)', 'datenschutz'])).toBe(false);
    expect(isPublicRoute([])).toBe(false);
  });
});
