// Phase 09.1 Plan 05 GREEN: editor.elementEditor.* keys + UTF-8 Umlaute (D-23, D-24).
// Analog: src/lib/__tests__/i18n.review-keys.test.ts (hooks jest project, same path convention).

process.env['EXPO_PUBLIC_SUPABASE_URL'] = 'https://test.example';
process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] = 'test-anon-key';

import de from '@spatenstich/shared/i18n/de';

const CORE_KEYS = [
  'title',
  'name',
  'width',
  'height',
  'rotation',
  'maintainRatio',
  'zOrder',
  'bringToFront',
  'bringForward',
  'sendBackward',
  'sendToBack',
  'note',
  'plantedAt',
  'accentColor',
  'cancel',
  'save',
  'delete',
  'deleteConfirmTitle',
  'deleteConfirmYes',
  'deleteConfirmNo',
] as const;

describe('i18n > de.editor.elementEditor (D-23/D-24)', () => {
  const block = (de as any).editor?.elementEditor;

  it('de.editor.elementEditor block exists', () => {
    expect(block).toBeDefined();
    expect(typeof block).toBe('object');
  });

  it('de.editor.elementEditor.title is "Element bearbeiten"', () => {
    expect(block.title).toBe('Element bearbeiten');
  });

  it('de.editor.elementEditor.name is non-empty string', () => {
    expect(typeof block.name).toBe('string');
    expect(block.name.length).toBeGreaterThan(0);
  });

  it('de.editor.elementEditor.width is non-empty string', () => {
    expect(typeof block.width).toBe('string');
    expect(block.width.length).toBeGreaterThan(0);
  });

  it('de.editor.elementEditor.height is non-empty string', () => {
    expect(typeof block.height).toBe('string');
    expect(block.height.length).toBeGreaterThan(0);
  });

  it('de.editor.elementEditor.rotation is non-empty string', () => {
    expect(typeof block.rotation).toBe('string');
    expect(block.rotation.length).toBeGreaterThan(0);
  });

  it('de.editor.elementEditor.zOrder is non-empty string', () => {
    expect(typeof block.zOrder).toBe('string');
    expect(block.zOrder.length).toBeGreaterThan(0);
  });

  it('de.editor.elementEditor.note is non-empty string', () => {
    expect(typeof block.note).toBe('string');
    expect(block.note.length).toBeGreaterThan(0);
  });

  it('de.editor.elementEditor.plantedAt is non-empty string', () => {
    expect(typeof block.plantedAt).toBe('string');
    expect(block.plantedAt.length).toBeGreaterThan(0);
  });

  it('de.editor.elementEditor.accentColor is non-empty string', () => {
    expect(typeof block.accentColor).toBe('string');
    expect(block.accentColor.length).toBeGreaterThan(0);
  });

  it('de.editor.elementEditor.bringToFront is non-empty string', () => {
    expect(typeof block.bringToFront).toBe('string');
    expect(block.bringToFront.length).toBeGreaterThan(0);
  });

  it('de.editor.elementEditor.bringForward is non-empty string', () => {
    expect(typeof block.bringForward).toBe('string');
    expect(block.bringForward.length).toBeGreaterThan(0);
  });

  it('de.editor.elementEditor.sendBackward is non-empty string', () => {
    expect(typeof block.sendBackward).toBe('string');
    expect(block.sendBackward.length).toBeGreaterThan(0);
  });

  it('de.editor.elementEditor.sendToBack is non-empty string', () => {
    expect(typeof block.sendToBack).toBe('string');
    expect(block.sendToBack.length).toBeGreaterThan(0);
  });

  it('de.editor.elementEditor.cancel is non-empty string', () => {
    expect(typeof block.cancel).toBe('string');
    expect(block.cancel.length).toBeGreaterThan(0);
  });

  it('de.editor.elementEditor.save is non-empty string', () => {
    expect(typeof block.save).toBe('string');
    expect(block.save.length).toBeGreaterThan(0);
  });

  it('de.editor.elementEditor.delete is non-empty string', () => {
    expect(typeof block.delete).toBe('string');
    expect(block.delete.length).toBeGreaterThan(0);
  });

  it('de.editor.elementEditor.moreFields is non-empty string', () => {
    expect(typeof block.moreFields).toBe('string');
    expect(block.moreFields.length).toBeGreaterThan(0);
  });

  it('de.editor.elementEditor.lessFields is non-empty string', () => {
    expect(typeof block.lessFields).toBe('string');
    expect(block.lessFields.length).toBeGreaterThan(0);
  });

  it('defines all 18 core keys', () => {
    for (const key of CORE_KEYS) {
      expect(typeof block[key]).toBe('string');
      expect((block[key] as string).length).toBeGreaterThan(0);
    }
  });

  it('all values are non-empty strings (flat + nested validation)', () => {
    const flatValues: string[] = [];
    const walk = (obj: Record<string, unknown>) => {
      for (const v of Object.values(obj)) {
        if (typeof v === 'string') flatValues.push(v);
        else if (typeof v === 'object' && v !== null) walk(v as Record<string, unknown>);
      }
    };
    walk(block);
    expect(flatValues.length).toBeGreaterThan(0);
    for (const v of flatValues) {
      expect(v.length).toBeGreaterThan(0);
    }
  });

  it('all editor.elementEditor strings use native UTF-8 umlauts (no ae|oe|ue|ss ASCII fallbacks) — D-24, Memory feedback_german_umlauts.md', () => {
    const flatValues: string[] = [];
    const walk = (obj: Record<string, unknown>) => {
      for (const v of Object.values(obj)) {
        if (typeof v === 'string') flatValues.push(v);
        else if (typeof v === 'object' && v !== null) walk(v as Record<string, unknown>);
      }
    };
    walk(block);

    // Positive: at least one value contains a German special character
    expect(flatValues.some(v => /[äöüÄÖÜß]/.test(v))).toBe(true);

    // Negative: no value uses ASCII fallback spellings
    for (const v of flatValues) {
      expect(v).not.toMatch(/Hoehe|Loeschen|Groesse|zurueck|Erlaeuterung|Verhaeltnis|moegli|fuer|ueber/);
    }
  });

  it('validation sub-object has widthMin/widthMax/heightMin/heightMax', () => {
    expect(block.validation).toBeDefined();
    expect(typeof block.validation).toBe('object');
    expect(typeof block.validation.widthMin).toBe('string');
    expect(typeof block.validation.widthMax).toBe('string');
    expect(typeof block.validation.heightMin).toBe('string');
    expect(typeof block.validation.heightMax).toBe('string');
  });

  it('validation widthMin contains numeric value 5', () => {
    expect(block.validation.widthMin).toMatch(/5/);
  });
});
