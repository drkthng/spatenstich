// vereinsregelnStore unit tests — Plan 02-04 Task 2-04-01.
// Mirrors the no-persist pattern established by profileStore (D-11):
// D-11 means AsyncStorage.setItem MUST NEVER fire during mutations.
// RULES-04 client-side guard: toggleAktiv/removeRule/updateRule no-op on istBKleingG entries.
import { useVereinsregelnStore } from '../vereinsregelnStore';
import type { VereinsRegel } from '@spatenstich/shared';
import AsyncStorage from '../../__mocks__/async-storage';

const BK_RULE: VereinsRegel = {
  id: 'bk-1',
  titel: 'BKleingG one-third',
  istBKleingG: true,
  aktiv: true,
  source: 'manual',
};

const USER_RULE: VereinsRegel = {
  id: 'u-1',
  titel: 'Heckenhöhe',
  wert: 120,
  einheit: 'cm',
  istBKleingG: false,
  aktiv: true,
  source: 'checklist',
};

describe('vereinsregelnStore', () => {
  beforeEach(() => {
    useVereinsregelnStore.getState().reset();
    (AsyncStorage as any).__reset();
    jest.spyOn(AsyncStorage, 'setItem');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('Test 1: initial state is { rules: [], hydrated: false }', () => {
    const s = useVereinsregelnStore.getState();
    expect(s.rules).toEqual([]);
    expect(s.hydrated).toBe(false);
  });

  it('Test 2: setRules updates rules AND flips hydrated to true', () => {
    useVereinsregelnStore.getState().setRules([BK_RULE, USER_RULE]);
    const s = useVereinsregelnStore.getState();
    expect(s.rules).toEqual([BK_RULE, USER_RULE]);
    expect(s.hydrated).toBe(true);
  });

  it('Test 3: toggleAktiv flips aktiv on a non-BKleingG rule', () => {
    useVereinsregelnStore.getState().setRules([USER_RULE]);
    useVereinsregelnStore.getState().toggleAktiv('u-1');
    const s = useVereinsregelnStore.getState();
    expect(s.rules[0]!.aktiv).toBe(false);
    useVereinsregelnStore.getState().toggleAktiv('u-1');
    expect(useVereinsregelnStore.getState().rules[0]!.aktiv).toBe(true);
  });

  it('Test 4: toggleAktiv NO-OPS on istBKleingG=true (RULES-04 client guard)', () => {
    useVereinsregelnStore.getState().setRules([BK_RULE]);
    useVereinsregelnStore.getState().toggleAktiv('bk-1');
    expect(useVereinsregelnStore.getState().rules[0]!.aktiv).toBe(true);
  });

  it('Test 5: removeRule removes a non-BKleingG rule', () => {
    useVereinsregelnStore.getState().setRules([BK_RULE, USER_RULE]);
    useVereinsregelnStore.getState().removeRule('u-1');
    const ids = useVereinsregelnStore.getState().rules.map((r) => r.id);
    expect(ids).toEqual(['bk-1']);
  });

  it('Test 6: removeRule NO-OPS on istBKleingG=true (RULES-04 client guard)', () => {
    useVereinsregelnStore.getState().setRules([BK_RULE, USER_RULE]);
    useVereinsregelnStore.getState().removeRule('bk-1');
    const ids = useVereinsregelnStore.getState().rules.map((r) => r.id);
    expect(ids).toContain('bk-1');
    expect(ids).toHaveLength(2);
  });

  it('Test 6b: updateRule patches titel / wert / einheit on a user rule', () => {
    useVereinsregelnStore.getState().setRules([USER_RULE]);
    useVereinsregelnStore
      .getState()
      .updateRule('u-1', { titel: 'Heckenhöhe seitlich', wert: 180, einheit: 'cm' });
    const patched = useVereinsregelnStore.getState().rules[0]!;
    expect(patched.titel).toBe('Heckenhöhe seitlich');
    expect(patched.wert).toBe(180);
    expect(patched.einheit).toBe('cm');
    // id and istBKleingG stay untouched
    expect(patched.id).toBe('u-1');
    expect(patched.istBKleingG).toBe(false);
  });

  it('Test 6c: updateRule NO-OPS on istBKleingG=true (RULES-04 client guard)', () => {
    useVereinsregelnStore.getState().setRules([BK_RULE]);
    useVereinsregelnStore.getState().updateRule('bk-1', { titel: 'Hijacked' });
    const still = useVereinsregelnStore.getState().rules[0]!;
    expect(still.titel).toBe(BK_RULE.titel);
  });

  it('Test 7: reset clears rules and resets hydrated to false', () => {
    useVereinsregelnStore.getState().setRules([USER_RULE]);
    useVereinsregelnStore.getState().reset();
    const s = useVereinsregelnStore.getState();
    expect(s.rules).toEqual([]);
    expect(s.hydrated).toBe(false);
  });

  it('Test 8 (D-11): does NOT use persist — AsyncStorage.setItem is never called', async () => {
    useVereinsregelnStore.getState().setRules([BK_RULE, USER_RULE]);
    useVereinsregelnStore.getState().toggleAktiv('u-1');
    useVereinsregelnStore.getState().removeRule('u-1');
    useVereinsregelnStore.getState().reset();
    await new Promise((r) => setTimeout(r, 20));
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });
});
