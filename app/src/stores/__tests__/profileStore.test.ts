// profileStore unit tests.
// Verifies in-memory state transitions AND the absence of persist middleware (D-11).
// AsyncStorage is mocked via moduleNameMapper ('stores' jest project). If any mutation
// triggered Zustand's persist (which profileStore must NOT use), setItem would fire —
// we assert it does not.
import { useProfileStore } from '../profileStore';
import type { VereinsRegel } from '@spatenstich/shared';
import AsyncStorage from '../../__mocks__/async-storage';

const SAMPLE_RULE: VereinsRegel = {
  id: 'heckenhoehe',
  titel: 'Maximale Heckenhöhe',
  wert: 120,
  einheit: 'cm',
  istBKleingG: false,
  aktiv: true,
  source: 'checklist',
};

describe('profileStore', () => {
  beforeEach(() => {
    useProfileStore.getState().reset();
    (AsyncStorage as any).__reset();
    jest.spyOn(AsyncStorage, 'setItem');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('initial state is { plz: null, klimazone: null, archetype: null, vereinsregeln: [] }', () => {
    const state = useProfileStore.getState();
    expect(state.plz).toBeNull();
    expect(state.klimazone).toBeNull();
    expect(state.archetype).toBeNull();
    expect(state.vereinsregeln).toEqual([]);
  });

  it('setPlz updates plz AND klimazone in a single action', () => {
    useProfileStore.getState().setPlz('12043', 4);
    const state = useProfileStore.getState();
    expect(state.plz).toBe('12043');
    expect(state.klimazone).toBe(4);
  });

  it('setArchetype updates archetype only, leaving other fields unchanged', () => {
    useProfileStore.getState().setPlz('10115', 4);
    useProfileStore.getState().setArchetype('selbstversorger');
    const state = useProfileStore.getState();
    expect(state.archetype).toBe('selbstversorger');
    expect(state.plz).toBe('10115');
    expect(state.klimazone).toBe(4);
    expect(state.vereinsregeln).toEqual([]);
  });

  it('setVereinsregeln stores the provided array', () => {
    useProfileStore.getState().setVereinsregeln([SAMPLE_RULE]);
    const state = useProfileStore.getState();
    expect(state.vereinsregeln).toHaveLength(1);
    expect(state.vereinsregeln[0]).toEqual(SAMPLE_RULE);
  });

  it('reset returns to initial state after mutations', () => {
    useProfileStore.getState().setPlz('12043', 4);
    useProfileStore.getState().setArchetype('selbstversorger');
    useProfileStore.getState().setVereinsregeln([SAMPLE_RULE]);
    useProfileStore.getState().reset();
    const state = useProfileStore.getState();
    expect(state.plz).toBeNull();
    expect(state.klimazone).toBeNull();
    expect(state.archetype).toBeNull();
    expect(state.vereinsregeln).toEqual([]);
  });

  it('does NOT use persist middleware — AsyncStorage.setItem is never called during mutations (D-11)', async () => {
    useProfileStore.getState().setPlz('12043', 4);
    useProfileStore.getState().setArchetype('selbstversorger');
    useProfileStore.getState().setVereinsregeln([SAMPLE_RULE]);
    useProfileStore.getState().reset();
    // Zustand persist is async — wait a tick to ensure any deferred write would have fired.
    await new Promise((r) => setTimeout(r, 20));
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });
});
