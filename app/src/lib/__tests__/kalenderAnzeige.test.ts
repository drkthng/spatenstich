// Phase 38 (DESIGN3-07): where windows and today sit on the year strip, how a window reads in
// words, what the search finds and how the calendar list is split.
import { getFensterFuerPflanze } from '@spatenstich/shared';
import {
  calendarSections,
  dayOfYearOf,
  indexLetter,
  matchesSearch,
  searchKey,
  stripBars,
  todayPercent,
  windowsInWords,
} from '../kalenderAnzeige';

const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const PARTS: [string, string, string] = ['Anfang', 'Mitte', 'Ende'];

const none = {
  sowIndoorDoyStart: null,
  sowIndoorDoyEnd: null,
  sowOutdoorDoyStart: null,
  sowOutdoorDoyEnd: null,
  plantDoyStart: null,
  plantDoyEnd: null,
  harvestDoyStart: null,
  harvestDoyEnd: null,
  family: 'Familie',
  slug: 'pflanze',
};

describe('today on the strip', () => {
  it('1 January is at the left edge, 31 December at the right, 2 July in the middle', () => {
    expect(dayOfYearOf(new Date(2026, 0, 1))).toBe(1);
    expect(todayPercent(new Date(2026, 0, 1))).toBeCloseTo(0.14, 1);
    expect(todayPercent(new Date(2026, 11, 31))).toBeCloseTo(99.86, 1);
    expect(todayPercent(new Date(2026, 6, 2))).toBeCloseTo(50, 0);
  });

  it('stays on the strip on the 366th day of a leap year', () => {
    expect(todayPercent(new Date(2028, 11, 31))).toBeLessThanOrEqual(100);
  });

  it('does not depend on the time of day', () => {
    expect(todayPercent(new Date(2026, 4, 10, 0, 5))).toBe(todayPercent(new Date(2026, 4, 10, 23, 55)));
  });
});

describe('bars', () => {
  it('places a window by its days: May (121 to 151) starts a third into the year', () => {
    const [bar] = stripBars([{ typ: 'Ernte', startDoy: 121, endDoy: 151, startKw: 18, endKw: 22 }]);
    expect(bar!.leftPercent).toBeCloseTo((120 / 365) * 100, 5);
    expect(bar!.widthPercent).toBeCloseTo((31 / 365) * 100, 5);
  });

  it('a window over New Year gives two bars that touch both edges', () => {
    const fenster = getFensterFuerPflanze({ ...none, harvestDoyStart: 280, harvestDoyEnd: 90 }, 4);
    const bars = stripBars(fenster);
    expect(bars).toHaveLength(2);
    expect(bars[0]!.leftPercent + bars[0]!.widthPercent).toBeCloseTo(100, 5);
    expect(bars[1]!.leftPercent).toBe(0);
  });

  it('leaves out a window that cannot be drawn', () => {
    expect(stripBars([{ typ: 'Ernte', startDoy: 200, endDoy: 100, startKw: 29, endKw: 15 }])).toEqual([]);
  });

  it('no bar leaves the strip', () => {
    for (const bar of stripBars([{ typ: 'Ernte', startDoy: -5, endDoy: 400, startKw: 1, endKw: 53 }])) {
      expect(bar.leftPercent).toBeGreaterThanOrEqual(0);
      expect(bar.leftPercent + bar.widthPercent).toBeLessThanOrEqual(100.0001);
    }
  });
});

describe('windows in words', () => {
  const tomato = { ...none, sowIndoorDoyStart: 60, sowIndoorDoyEnd: 100, plantDoyStart: 135, plantDoyEnd: 166, harvestDoyStart: 190, harvestDoyEnd: 280 };

  it('one entry per kind of action, in the order of the season', () => {
    const words = windowsInWords(getFensterFuerPflanze(tomato, 4), MONTHS, PARTS, new Date(2026, 6, 20));
    expect(words.map((w) => [w.typ, w.from, w.to])).toEqual([
      ['Vorkultur', 'Anfang März', 'Anfang April'],
      ['Auspflanzen', 'Mitte Mai', 'Mitte Juni'],
      ['Ernte', 'Anfang Juli', 'Anfang Oktober'],
    ]);
  });

  it('marks the window that today lies in', () => {
    const words = windowsInWords(getFensterFuerPflanze(tomato, 4), MONTHS, PARTS, new Date(2026, 6, 20));
    expect(words.filter((w) => w.active).map((w) => w.typ)).toEqual(['Ernte']);
  });

  it('a window over New Year is one entry from autumn to spring, active in November and February', () => {
    const fenster = getFensterFuerPflanze({ ...none, harvestDoyStart: 280, harvestDoyEnd: 90 }, 4);
    const november = windowsInWords(fenster, MONTHS, PARTS, new Date(2026, 10, 15));
    expect(november).toHaveLength(1);
    expect(november[0]).toMatchObject({ typ: 'Ernte', from: 'Anfang Oktober', to: 'Ende März', active: true });
    expect(november[0]!.parts).toHaveLength(2);
    expect(windowsInWords(fenster, MONTHS, PARTS, new Date(2027, 1, 10))[0]!.active).toBe(true);
    expect(windowsInWords(fenster, MONTHS, PARTS, new Date(2026, 5, 15))[0]!.active).toBe(false);
  });

  it('a plant without times gives nothing', () => {
    expect(windowsInWords(getFensterFuerPflanze(none, 4), MONTHS, PARTS)).toEqual([]);
  });
});

describe('search', () => {
  const carrot = { nameDe: 'Möhre', nameAltDe: ['Karotte', 'Gelbe Rübe'], nameBotanical: 'Daucus carota' };

  it('spells umlauts out so that every way of typing meets', () => {
    expect(searchKey('Möhre')).toBe(searchKey('moehre'));
    expect(searchKey('Möhre')).toBe(searchKey('MOHRE'));
    expect(searchKey('  Süß  kartoffel ')).toBe('suss kartoffel');
  });

  it('finds by German name, other names and botanical name, in any case', () => {
    for (const q of ['möh', 'Moeh', 'karot', 'rübe', 'ruebe', 'DAUCUS', 'carota']) expect(matchesSearch(carrot, q)).toBe(true);
    expect(matchesSearch(carrot, 'tomate')).toBe(false);
  });

  it('an empty search matches everything', () => {
    expect(matchesSearch(carrot, '')).toBe(true);
    expect(matchesSearch(carrot, '   ')).toBe(true);
  });

  it('copes with a plant without other names or botanical name', () => {
    expect(matchesSearch({ nameDe: 'Eigene Sorte', nameAltDe: [], nameBotanical: null }, 'sorte')).toBe(true);
  });
});

describe('sections', () => {
  const p = (slug: string, nameDe: string) => ({ slug, nameDe, nameAltDe: [] as string[], nameBotanical: null });
  const plants = [p('zwiebel', 'Zwiebel'), p('aepfel', 'Äpfel'), p('ananas', 'Ananas'), p('moehre', 'Möhre'), p('1001', '1001 Nacht')];

  it('sorts as a German index does and groups by first letter', () => {
    const { all, allCount } = calendarSections(plants, new Set(), '');
    expect(allCount).toBe(5);
    expect(all.map((g) => [g.letter, g.plants.map((x) => x.nameDe)])).toEqual([
      ['#', ['1001 Nacht']],
      ['A', ['Ananas', 'Äpfel']],
      ['M', ['Möhre']],
      ['Z', ['Zwiebel']],
    ]);
  });

  it('"in the plan" holds the plants whose slug is in the plan, also in the full list', () => {
    const { inPlan, allCount } = calendarSections(plants, new Set(['moehre', 'zwiebel', 'not-in-catalog']), '');
    expect(inPlan.map((x) => x.slug)).toEqual(['moehre', 'zwiebel']);
    expect(allCount).toBe(5);
  });

  it('the search narrows both', () => {
    const { inPlan, all, allCount } = calendarSections(plants, new Set(['moehre', 'zwiebel']), 'zw');
    expect(inPlan.map((x) => x.slug)).toEqual(['zwiebel']);
    expect(all).toHaveLength(1);
    expect(allCount).toBe(1);
  });

  it('does not change the list it was given', () => {
    const before = plants.map((x) => x.slug);
    calendarSections(plants, new Set(), '');
    expect(plants.map((x) => x.slug)).toEqual(before);
  });

  it('files umlauts under their base letter', () => {
    expect(indexLetter('Äpfel')).toBe('A');
    expect(indexLetter('Ölrettich')).toBe('O');
    expect(indexLetter('überraschung')).toBe('U');
  });
});
