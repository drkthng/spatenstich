// Phase 7 Plan 04 Wave 3: smoke-mount test for the plan editor canvas (EDIT-01).
// Mocks Skia/gesture-handler/reanimated globally via setup.ts. No real native modules.
// Revision B2: real testID-based assertions instead of vacuous expect(true).

import * as React from 'react';
import { render } from '@testing-library/react-native';

// useEditorStore mock — controlled state for deterministic rendering. Defined BEFORE
// the EditorCanvas import so jest.mock hoists correctly.
const storeState: any = {
  elements: [],
  showGrid: true,
  activeLayers: { infrastructure: true, seasonal: true },
  selection: null,
  polygonInProgress: null,
  tool: 'select',
  setGestureActive: jest.fn(),
  setSelection: jest.fn(),
  polygonAddPoint: jest.fn(),
  updateElement: jest.fn(),
};
jest.mock('@/src/stores/editorStore', () => ({
  useEditorStore: Object.assign(
    (sel?: any) => (sel ? sel(storeState) : storeState),
    { getState: () => storeState },
  ),
}));

import { EditorCanvas } from '../EditorCanvas';

const dims = {
  id: 'd-1',
  gardenId: 'g-1',
  shape: 'rectangle' as const,
  widthM: 5,
  heightM: 5,
  extraDims: null,
  createdAt: '2026-05-13T10:00:00.000Z',
  updatedAt: '2026-05-13T10:00:00.000Z',
  updatedByUserId: 'u-1',
  deletedAt: null,
};

describe('PlanEditor smoke (EDIT-01)', () => {
  beforeEach(() => {
    storeState.elements = [];
    storeState.showGrid = true;
    storeState.activeLayers = { infrastructure: true, seasonal: true };
    storeState.selection = null;
    storeState.polygonInProgress = null;
    storeState.tool = 'select';
  });

  it('renders the editor Canvas without throwing in jsdom', () => {
    const { getByTestId } = render(<EditorCanvas dimensions={dims} />);
    expect(getByTestId('editor-canvas')).toBeTruthy();
  });

  it('grid is visible by default (showGrid=true) — renders grid Line elements with testID `grid-line-*` (revision B2: real assertion)', () => {
    storeState.showGrid = true;
    const { queryAllByTestId } = render(<EditorCanvas dimensions={dims} />);
    // Revision B2: grid Line elements carry testID `grid-line-v-${x}` / `grid-line-h-${y}`.
    // For a 5×5m garden the loops emit 6 vertical (x=0..5) + 6 horizontal (y=0..5) = 12 lines.
    // Assert >= 2 * floor(widthM) as a lower bound that is tolerant of mock-renderer quirks.
    const lines = queryAllByTestId(/^grid-line-/);
    expect(lines.length).toBeGreaterThanOrEqual(2 * Math.floor(dims.widthM));
  });

  it('toggling grid via store hides the grid (showGrid=false produces zero grid Line elements) — revision B2: real assertion', () => {
    storeState.showGrid = false;
    const { queryAllByTestId, getByTestId } = render(
      <EditorCanvas dimensions={dims} />,
    );
    expect(getByTestId('editor-canvas')).toBeTruthy();
    // Revision B2: when showGrid=false the for-loops are skipped -> zero testID-tagged lines.
    const lines = queryAllByTestId(/^grid-line-/);
    expect(lines.length).toBe(0);
  });

  it('renders without throwing when elements array is empty (empty-state safe mount)', () => {
    storeState.elements = [];
    const { getByTestId } = render(<EditorCanvas dimensions={dims} />);
    expect(getByTestId('editor-canvas')).toBeTruthy();
  });
});
