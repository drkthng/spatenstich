// Phase 7 Plan 04 Wave 3: editor toolbar tests (EDIT-08, EDIT-11, EDIT-09 manual save, EDIT-05 polygon).
// Per UI-SPEC Toolbar layout: 9 buttons left-to-right.

import * as React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';

// --- Mocks: useEditorStore + temporal + useAuthStore + flushAllPendingSaves ---

const editorState: any = {
  showGrid: true,
  activeLayers: { infrastructure: true, seasonal: true },
  selection: null,
  tool: 'select',
  polygonInProgress: null,
  elements: [],
  setActiveLayers: jest.fn((al: any) => {
    editorState.activeLayers = al;
  }),
  toggleGrid: jest.fn(),
  setTool: jest.fn(),
  deleteElement: jest.fn(),
  polygonCommit: jest.fn(),
};

const temporalState: any = {
  pastStates: [],
  futureStates: [],
  undo: jest.fn(),
  redo: jest.fn(),
};

let temporalSubscriber: (() => void) | null = null;

jest.mock('@/src/stores/editorStore', () => {
  const useEditorStore = Object.assign(
    (sel?: any) => (sel ? sel(editorState) : editorState),
    {
      getState: () => editorState,
      temporal: {
        getState: () => temporalState,
        subscribe: (fn: () => void) => {
          temporalSubscriber = fn;
          return () => {
            temporalSubscriber = null;
          };
        },
      },
    },
  );
  return { useEditorStore };
});

const authState: any = { mode: 'account', userId: 'u-1' };
jest.mock('@/src/stores/authStore', () => ({
  useAuthStore: { getState: () => authState },
}));

const mockFlush = jest.fn();
jest.mock('@/src/lib/editor/saveDebounce', () => ({
  flushAllPendingSaves: (...a: unknown[]) => mockFlush(...a),
}));

import { EditorToolbar } from '../EditorToolbar';

beforeEach(() => {
  editorState.showGrid = true;
  editorState.activeLayers = { infrastructure: true, seasonal: true };
  editorState.selection = null;
  editorState.tool = 'select';
  editorState.polygonInProgress = null;
  editorState.elements = [];
  temporalState.pastStates = [];
  temporalState.futureStates = [];
  temporalState.undo.mockClear();
  temporalState.redo.mockClear();
  editorState.setActiveLayers.mockClear();
  editorState.toggleGrid.mockClear();
  editorState.setTool.mockClear();
  editorState.deleteElement.mockClear();
  editorState.polygonCommit.mockClear();
  mockFlush.mockReset();
});

describe('EditorToolbar > base 6 always-visible buttons', () => {
  it('renders 6 always-visible buttons by testID: back / undo / redo / grid / layer / polygon-start / save', () => {
    const { getByTestId } = render(<EditorToolbar />);
    expect(getByTestId('editor-back-button')).toBeTruthy();
    expect(getByTestId('editor-undo-button')).toBeTruthy();
    expect(getByTestId('editor-redo-button')).toBeTruthy();
    expect(getByTestId('editor-grid-toggle-button')).toBeTruthy();
    expect(getByTestId('editor-layer-toggle-button')).toBeTruthy();
    expect(getByTestId('editor-polygon-start-button')).toBeTruthy();
    expect(getByTestId('editor-save-button')).toBeTruthy();
  });

  it('does NOT render conditional delete + polygon-finish buttons when selection=null + tool=select', () => {
    const { queryByTestId } = render(<EditorToolbar />);
    expect(queryByTestId('editor-delete-button')).toBeNull();
    expect(queryByTestId('editor-polygon-finish-button')).toBeNull();
  });

  it('renders delete button only when selection !== null', () => {
    editorState.selection = 'el-1';
    const { getByTestId } = render(<EditorToolbar />);
    expect(getByTestId('editor-delete-button')).toBeTruthy();
  });

  it('renders polygon-finish button only when tool === polygon', () => {
    editorState.tool = 'polygon';
    editorState.polygonInProgress = { gardenId: 'g-1', pointsM: [] };
    const { getByTestId } = render(<EditorToolbar />);
    expect(getByTestId('editor-polygon-finish-button')).toBeTruthy();
  });
});

describe('EditorToolbar > undo/redo (EDIT-11)', () => {
  it('undo button calls useEditorStore.temporal.getState().undo when canUndo=true', () => {
    temporalState.pastStates = [{}];
    const { getByTestId } = render(<EditorToolbar />);
    fireEvent.press(getByTestId('editor-undo-button'));
    expect(temporalState.undo).toHaveBeenCalled();
  });

  it('redo button calls useEditorStore.temporal.getState().redo when canRedo=true', () => {
    temporalState.futureStates = [{}];
    const { getByTestId } = render(<EditorToolbar />);
    fireEvent.press(getByTestId('editor-redo-button'));
    expect(temporalState.redo).toHaveBeenCalled();
  });

  it('undo button disabled (opacity 0.4) when pastStates is empty', () => {
    temporalState.pastStates = [];
    const { getByTestId } = render(<EditorToolbar />);
    const btn = getByTestId('editor-undo-button');
    // The style prop carries the opacity; jest-renderer surfaces it.
    expect(btn.props.style).toEqual(expect.objectContaining({ opacity: 0.4 }));
  });

  it('redo button disabled when futureStates is empty', () => {
    temporalState.futureStates = [];
    const { getByTestId } = render(<EditorToolbar />);
    const btn = getByTestId('editor-redo-button');
    expect(btn.props.style).toEqual(expect.objectContaining({ opacity: 0.4 }));
  });
});

describe('EditorToolbar > layer cycle (EDIT-08, Revision W5)', () => {
  it('cycle 0 (both) → calls setActiveLayers with { infrastructure: true, seasonal: false }', () => {
    editorState.activeLayers = { infrastructure: true, seasonal: true };
    const { getByTestId } = render(<EditorToolbar />);
    fireEvent.press(getByTestId('editor-layer-toggle-button'));
    expect(editorState.setActiveLayers).toHaveBeenCalledWith({
      infrastructure: true,
      seasonal: false,
    });
  });

  it('cycle 1 (infra-only) → calls setActiveLayers with { infrastructure: false, seasonal: true }', () => {
    editorState.activeLayers = { infrastructure: true, seasonal: false };
    const { getByTestId } = render(<EditorToolbar />);
    fireEvent.press(getByTestId('editor-layer-toggle-button'));
    expect(editorState.setActiveLayers).toHaveBeenCalledWith({
      infrastructure: false,
      seasonal: true,
    });
  });

  it('cycle 2 (seasonal-only) → calls setActiveLayers with { infrastructure: true, seasonal: true } (loops back)', () => {
    editorState.activeLayers = { infrastructure: false, seasonal: true };
    const { getByTestId } = render(<EditorToolbar />);
    fireEvent.press(getByTestId('editor-layer-toggle-button'));
    expect(editorState.setActiveLayers).toHaveBeenCalledWith({
      infrastructure: true,
      seasonal: true,
    });
  });
});

describe('EditorToolbar > manual save (EDIT-09)', () => {
  it('save button calls flushAllPendingSaves with (mode, byId resolver)', async () => {
    mockFlush.mockResolvedValueOnce(undefined);
    const { getByTestId } = render(<EditorToolbar />);
    await act(async () => {
      fireEvent.press(getByTestId('editor-save-button'));
    });
    expect(mockFlush).toHaveBeenCalledWith('account', expect.any(Function));
  });

  it('byId resolver looks up elements via useEditorStore.getState().elements.find', async () => {
    editorState.elements = [
      { id: 'e-1', label: 'A' },
      { id: 'e-2', label: 'B' },
    ];
    let capturedById: ((id: string) => any) | null = null;
    mockFlush.mockImplementationOnce(async (_mode: any, byId: any) => {
      capturedById = byId;
    });
    const { getByTestId } = render(<EditorToolbar />);
    await act(async () => {
      fireEvent.press(getByTestId('editor-save-button'));
    });
    expect(capturedById).not.toBeNull();
    expect(capturedById!('e-1')).toEqual({ id: 'e-1', label: 'A' });
    expect(capturedById!('e-missing')).toBeUndefined();
  });
});

describe('EditorToolbar > polygon mode (EDIT-05)', () => {
  it('polygon-start button calls setTool("polygon") when current tool is select', () => {
    editorState.tool = 'select';
    const { getByTestId } = render(<EditorToolbar />);
    fireEvent.press(getByTestId('editor-polygon-start-button'));
    expect(editorState.setTool).toHaveBeenCalledWith('polygon');
  });

  it('polygon-finish button only appears when tool === polygon AND polygonInProgress.pointsM.length >= 3', () => {
    editorState.tool = 'polygon';
    editorState.polygonInProgress = {
      gardenId: 'g-1',
      pointsM: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
      ],
    };
    const { getByTestId } = render(<EditorToolbar />);
    const finish = getByTestId('editor-polygon-finish-button');
    expect(finish.props.style).toEqual(expect.objectContaining({ opacity: 1 }));
  });

  it('polygon-finish button disabled (opacity 0.4) when pointsM.length < 3', () => {
    editorState.tool = 'polygon';
    editorState.polygonInProgress = {
      gardenId: 'g-1',
      pointsM: [{ x: 0, y: 0 }],
    };
    const { getByTestId } = render(<EditorToolbar />);
    const finish = getByTestId('editor-polygon-finish-button');
    expect(finish.props.style).toEqual(
      expect.objectContaining({ opacity: 0.4 }),
    );
  });

  it('polygon-finish button calls polygonCommit with auto-label + gardenId + userId when pressed', () => {
    editorState.tool = 'polygon';
    editorState.polygonInProgress = {
      gardenId: 'g-1',
      pointsM: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
      ],
    };
    editorState.elements = [];
    const { getByTestId } = render(<EditorToolbar />);
    fireEvent.press(getByTestId('editor-polygon-finish-button'));
    expect(editorState.polygonCommit).toHaveBeenCalledWith('Beet 1', 'g-1', 'u-1');
  });
});

describe('EditorToolbar > grid toggle', () => {
  it('grid button calls useEditorStore.getState().toggleGrid', () => {
    const { getByTestId } = render(<EditorToolbar />);
    fireEvent.press(getByTestId('editor-grid-toggle-button'));
    expect(editorState.toggleGrid).toHaveBeenCalled();
  });
});

describe('EditorToolbar > delete button (selection !== null path)', () => {
  it('delete button calls useEditorStore.getState().deleteElement(selection)', () => {
    editorState.selection = 'el-42';
    const { getByTestId } = render(<EditorToolbar />);
    fireEvent.press(getByTestId('editor-delete-button'));
    expect(editorState.deleteElement).toHaveBeenCalledWith('el-42');
  });
});

describe('EditorToolbar > temporal subscribe wiring', () => {
  it('subscribes to useEditorStore.temporal on mount and re-evaluates canUndo on change', () => {
    temporalState.pastStates = [];
    const { getByTestId } = render(<EditorToolbar />);
    let btn = getByTestId('editor-undo-button');
    expect(btn.props.style).toEqual(expect.objectContaining({ opacity: 0.4 }));
    // Push a state into pastStates and fire the subscriber to simulate zundo's snapshot
    temporalState.pastStates = [{}];
    act(() => {
      temporalSubscriber && temporalSubscriber();
    });
    btn = getByTestId('editor-undo-button');
    expect(btn.props.style).toEqual(expect.objectContaining({ opacity: 1 }));
  });
});
