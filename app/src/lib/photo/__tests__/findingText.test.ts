// Phase 35: the words for a finding and the form for editing a proposal before it is
// accepted (PHOTO-07, PHOTO-11).

process.env['EXPO_PUBLIC_SUPABASE_URL'] = 'https://test.example';
process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] = 'test-anon-key';

jest.mock('../../../stores/authStore', () => ({
  useAuthStore: { getState: () => ({ userId: 'u-1', activeGardenId: 'g-1', mode: 'account' }) },
}));
jest.mock('../../../storage', () => ({ storage: {} }));
jest.mock('../../ai/aiClient', () => ({ callAi: jest.fn() }));
jest.mock('../../ai/imageResize', () => ({ downscaleImage: jest.fn() }));
jest.mock('../../sync/SyncTriggers', () => ({ scheduleWriteDebounced: jest.fn() }));
jest.mock('../../supabase', () => ({ supabase: {} }));

import {
  PHOTO_FINDING_KINDS,
  type PhotoCatalogProposal,
  type PhotoFindingRow,
  type PlanElementRow,
  type PlantRow,
} from '@spatenstich/shared';
import de from '@spatenstich/shared/i18n/de';
import {
  acceptLabel,
  CATALOG_FIELDS,
  catalogFormValues,
  confidenceLabel,
  editableFields,
  editValues,
  failureText,
  fieldLabel,
  formatMetres,
  kindLabel,
  markCaption,
  monthName,
  parseNumber,
  problemText,
  proposalLines,
  readCatalogForm,
  readEdit,
} from '../findingText';

const BED = 'bed-1';

const bed: PlanElementRow = {
  id: BED,
  gardenId: 'g-1',
  elementType: 'Beet',
  label: 'Tomatenbeet',
  xM: 3,
  yM: 4,
  widthM: 2,
  heightM: 1,
  confidence: null,
  isAccepted: true,
  importedFrom: null,
  provenance: null,
  layer: 'infrastructure',
  createdAt: '2026-11-01T09:00:00.000Z',
  updatedAt: '2026-11-01T09:00:00.000Z',
  updatedByUserId: 'u-1',
  deletedAt: null,
};

const tomato = { slug: 'tomate', nameDe: 'Tomate', nameAltDe: [] as string[] } as PlantRow;

function finding(patch: Partial<PhotoFindingRow>): PhotoFindingRow {
  return {
    id: 'f-1',
    gardenId: 'g-1',
    checkId: 'c-1',
    kind: 'rename',
    targetElementId: BED,
    title: 'Titel',
    detail: '',
    proposal: {},
    confidence: 0.85,
    closeupOf: null,
    status: 'open',
    resolvedAt: null,
    taskRequested: false,
    createdByUserId: 'u-1',
    createdAt: '2026-11-15T10:00:00.000Z',
    updatedAt: '2026-11-15T10:00:00.000Z',
    updatedByUserId: 'u-1',
    deletedAt: null,
    ...patch,
  };
}

const YACON: PhotoCatalogProposal = {
  nameDe: 'Yacon',
  nameBotanical: 'Smallanthus sonchifolius',
  family: 'Korbblütler',
  category: 'Gemüse',
  sowStartMonth: null,
  sowEndMonth: null,
  plantStartMonth: 5,
  plantEndMonth: 6,
  harvestStartMonth: 10,
  harvestEndMonth: 11,
  spacingCm: 80,
};

describe('numbers and months', () => {
  it('writes metres with a comma and reads both notations', () => {
    expect(formatMetres(2.5)).toBe('2,5');
    expect(formatMetres(2)).toBe('2');
    expect(formatMetres(1.234)).toBe('1,23');
    expect(parseNumber('2,5')).toBe(2.5);
    expect(parseNumber(' 3.25 ')).toBe(3.25);
    expect(parseNumber('zwei')).toBeNull();
    expect(parseNumber('')).toBeNull();
    expect(parseNumber('1,2,3')).toBeNull();
  });

  it('names the months', () => {
    expect(monthName(1)).toBe('Januar');
    expect(monthName(12)).toBe('Dezember');
    expect(monthName(null)).toBe('');
    expect(monthName(13)).toBe('');
  });
});

describe('every kind and every problem has its own words', () => {
  it('kinds, accept buttons and confidence', () => {
    for (const kind of PHOTO_FINDING_KINDS) {
      const label = kindLabel({ kind });
      expect(label).not.toContain('photo.');
      expect(label.length).toBeGreaterThan(3);
    }
    expect(acceptLabel({ kind: 'resize' })).toBe('Annehmen');
    expect(acceptLabel({ kind: 'pest' })).toBe('Als Aufgabe vormerken');
    expect(acceptLabel({ kind: 'catalog_plant' })).toBe('In den Katalog aufnehmen');
    expect(confidenceLabel(0.92)).toBe('Sicher (92 %)');
    expect(confidenceLabel(0.7)).toBe('Ziemlich sicher (70 %)');
    expect(confidenceLabel(0.4)).toBe('Unsicher (40 %)');
  });

  it('problems and failures are sentences, never codes', () => {
    for (const problem of ['not_open', 'needs_closeup', 'target_missing', 'incomplete', 'already_in_catalog', 'not_authenticated', 'failed'] as const) {
      expect(problemText(problem)).not.toContain('photo.');
    }
    for (const code of ['no_garden', 'no_photos', 'too_many_photos', 'photo_unreadable', 'offline', 'budget_exhausted', 'not_configured', 'overloaded', 'service_error'] as const) {
      const text = failureText(code);
      expect(text).not.toMatch(/^(photo|ai)\./);
      // No code-like word with an underscore in a sentence for people.
      expect(text).not.toMatch(/[a-z]_[a-z]/);
    }
    expect(failureText('budget_exhausted')).toBe((de as { ai: { error: Record<string, string> } }).ai.error['budget_exhausted']);
  });
});

describe('what a finding proposes, in words (PHOTO-03)', () => {
  it('resize, move, rename, remove name the element and the numbers', () => {
    expect(proposalLines(finding({ kind: 'resize', proposal: { widthM: 3, heightM: 1.5 } }), [bed], [])).toEqual([
      'Vorschlag: 3 × 1,5 m statt 2 × 1 m',
    ]);
    expect(proposalLines(finding({ kind: 'move', proposal: { xM: 6, yM: 7.5 } }), [bed], [])).toEqual([
      'Vorschlag: Mittelpunkt 6 m von links und 7,5 m von oben',
    ]);
    expect(proposalLines(finding({ kind: 'rename', proposal: { label: 'Kartoffelbeet' } }), [bed], [])).toEqual([
      'Vorschlag: „Kartoffelbeet“ statt „Tomatenbeet“',
    ]);
    expect(proposalLines(finding({ kind: 'remove' }), [bed], [])).toEqual(['Vorschlag: „Tomatenbeet“ aus dem Plan entfernen']);
  });

  it('a new element and a new plant, with a note when the plant is not in the catalog', () => {
    expect(
      proposalLines(
        finding({ kind: 'add_element', targetElementId: null, proposal: { elementType: 'Kompost', label: 'Komposter', widthM: 1.2, heightM: 1 } }),
        [bed],
        [],
      ),
    ).toEqual(['Vorschlag: Kompost „Komposter“, 1,2 × 1 m']);
    expect(proposalLines(finding({ kind: 'add_plant', proposal: { plantName: 'Tomate' } }), [bed], [tomato])).toEqual([
      'Vorschlag: Tomate in „Tomatenbeet“ setzen',
    ]);
    const unknown = proposalLines(finding({ kind: 'add_plant', targetElementId: null, proposal: { plantName: 'Yacon' } }), [bed], [tomato]);
    expect(unknown[0]).toBe('Vorschlag: Yacon in den Plan setzen');
    expect(unknown[1]).toContain('noch nicht im Katalog');
  });

  it('a catalog proposal lists names, family, windows and spacing (PHOTO-05)', () => {
    expect(proposalLines(finding({ kind: 'catalog_plant', targetElementId: null, proposal: { catalog: YACON } }), [], [])).toEqual([
      'Botanischer Name: Smallanthus sonchifolius',
      'Familie: Korbblütler',
      'Pflanzung: Mai bis Juni',
      'Ernte: Oktober bis November',
      'Pflanzabstand: 80 cm',
    ]);
  });

  it('pests and diseases say what to do (PHOTO-09)', () => {
    expect(proposalLines(finding({ kind: 'pest', proposal: { action: 'Mit Wasser abspritzen.' } }), [bed], [])).toEqual([
      'Was zu tun ist: Mit Wasser abspritzen.',
    ]);
    expect(proposalLines(finding({ kind: 'unclear', proposal: {} }), [bed], [])).toEqual([]);
  });

  it('the caption says what the picture of the plan marks (PHOTO-08)', () => {
    expect(markCaption({ type: 'element', elementId: BED, proposed: null }, [bed])).toBe('Im Plan markiert: Tomatenbeet');
    expect(markCaption({ type: 'element', elementId: BED, proposed: { xM: 1, yM: 1, widthM: 1, heightM: 1 } }, [bed])).toContain('gestrichelt');
    expect(markCaption({ type: 'box', xM: 1, yM: 1, widthM: 1, heightM: 1 }, [bed])).toContain('vorgeschlagene Stelle');
    expect(markCaption({ type: 'spot', xM: 1, yM: 1 }, [bed])).toContain('Stelle der Pflanze');
    expect(markCaption({ type: 'none' }, [bed])).toBe('');
  });
});

describe('editing a proposal before accepting (PHOTO-07)', () => {
  it('each kind offers the values that matter, each with a label', () => {
    expect(editableFields({ kind: 'resize' })).toEqual(['widthM', 'heightM']);
    expect(editableFields({ kind: 'move' })).toEqual(['xM', 'yM']);
    expect(editableFields({ kind: 'rename' })).toEqual(['label']);
    expect(editableFields({ kind: 'remove' })).toEqual([]);
    expect(editableFields({ kind: 'unclear' })).toEqual([]);
    expect(editableFields({ kind: 'catalog_plant' })).toEqual(CATALOG_FIELDS);
    for (const kind of PHOTO_FINDING_KINDS) {
      for (const field of editableFields({ kind })) expect(fieldLabel(field)).not.toContain('photo.');
    }
  });

  it('shows the stored values and reads changed ones back', () => {
    const row = finding({ kind: 'resize', proposal: { widthM: 3, heightM: 1.5 } });
    expect(editValues(row)).toEqual({ widthM: '3', heightM: '1,5' });
    expect(readEdit(row, { widthM: '2,8', heightM: '1.2' })).toEqual({ widthM: 2.8, heightM: 1.2 });
  });

  it('refuses sizes that are not positive numbers and empty names', () => {
    const resize = finding({ kind: 'resize', proposal: { widthM: 3, heightM: 1.5 } });
    expect(readEdit(resize, { widthM: 'breit', heightM: '1' })).toBeNull();
    expect(readEdit(resize, { widthM: '0', heightM: '1' })).toBeNull();
    expect(readEdit(resize, { widthM: '', heightM: '1' })).toBeNull();
    expect(readEdit(finding({ kind: 'rename', proposal: { label: 'A' } }), { label: '   ' })).toBeNull();
  });

  it('a new element may be left without a place, but not with half of one', () => {
    const row = finding({ kind: 'add_element', targetElementId: null, proposal: { elementType: 'Kompost', label: 'K', widthM: 1, heightM: 1 } });
    expect(readEdit(row, { label: 'Komposter', widthM: '1', heightM: '1', xM: '', yM: '' })).toEqual({
      label: 'Komposter',
      widthM: 1,
      heightM: 1,
      xM: null,
      yM: null,
    });
    expect(readEdit(row, { label: 'Komposter', widthM: '1', heightM: '1', xM: '4', yM: '' })).toBeNull();
    // A move without a place makes no sense.
    expect(readEdit(finding({ kind: 'move', proposal: { xM: 1, yM: 1 } }), { xM: '', yM: '' })).toBeNull();
  });

  it('a catalog proposal: values round-trip; windows need both ends; months and spacing have limits', () => {
    const row = finding({ kind: 'catalog_plant', targetElementId: null, proposal: { catalog: YACON, plantName: 'Yacon' } });
    const values = editValues(row);
    expect(values).toMatchObject({ nameDe: 'Yacon', sowStartMonth: '', plantStartMonth: '5', spacingCm: '80' });
    expect(readEdit(row, values)).toEqual({ catalog: YACON, plantName: 'Yacon' });
    expect(readEdit(row, { ...values, nameDe: 'Inkawurzel', spacingCm: '90' })).toEqual({
      catalog: { ...YACON, nameDe: 'Inkawurzel', spacingCm: 90 },
      plantName: 'Inkawurzel',
    });
    expect(readCatalogForm({ ...values, sowStartMonth: '3' }, YACON)).toBeNull();
    expect(readCatalogForm({ ...values, plantEndMonth: '13' }, YACON)).toBeNull();
    expect(readCatalogForm({ ...values, spacingCm: '0' }, YACON)).toBeNull();
    expect(readCatalogForm({ ...values, spacingCm: 'weit' }, YACON)).toBeNull();
    expect(readCatalogForm({ ...values, nameDe: ' ' }, YACON)).toBeNull();
    expect(readCatalogForm({ ...values, spacingCm: '' }, YACON)!.spacingCm).toBeNull();
    expect(catalogFormValues(YACON).harvestEndMonth).toBe('11');
  });
});
