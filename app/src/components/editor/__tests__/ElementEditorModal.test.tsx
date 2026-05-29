// Phase 09.1 Wave 2 GREEN: ElementEditorModal render + Save/Cancel/Delete + ZOrderButtons.
// D-09/D-16/D-17/D-21 modal pattern.
// Test 14 (D-21 explicit): label lives on dedicated column, NEVER in provenance.

import * as React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// --- Store mock (pattern from EditorToolbar.test.tsx) ---
const mockUpdateElement = jest.fn();
const mockDeleteElement = jest.fn();
const mockSetEditingElementId = jest.fn();

const editorState: any = {
  elements: [],
  updateElement: mockUpdateElement,
  deleteElement: mockDeleteElement,
  setEditingElementId: mockSetEditingElementId,
  editingElementId: null,
};

jest.mock('@/src/stores/editorStore', () => {
  const useEditorStore = Object.assign(
    (sel?: any) => (sel ? sel(editorState) : editorState),
    { getState: () => editorState },
  );
  return { useEditorStore };
});

// Mock sub-components to isolate ElementEditorModal tests
jest.mock('../ZOrderButtons', () => ({
  ZOrderButtons: ({ elementId }: { elementId: string }) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, { testID: `zorder-buttons-${elementId}` });
  },
}));

jest.mock('../CrossPlatformDatePicker', () => ({
  CrossPlatformDatePicker: ({ testID }: { testID?: string }) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, { testID: testID ?? 'date-picker' });
  },
}));

jest.mock('../CrossPlatformColorPicker', () => ({
  CrossPlatformColorPicker: ({ testID }: { testID?: string }) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, { testID: testID ?? 'color-picker' });
  },
}));

import { ElementEditorModal } from '../ElementEditorModal';

function makeEl(id: string, overrides: Record<string, any> = {}) {
  return {
    id,
    gardenId: 'g-1',
    elementType: 'Beet',
    label: `Element ${id}`,
    xM: 2,
    yM: 2,
    widthM: 1,
    heightM: 1,
    confidence: null,
    isAccepted: true,
    createdAt: '2026-05-13T10:00:00.000Z',
    updatedAt: '2026-05-13T10:00:00.000Z',
    updatedByUserId: 'u-1',
    deletedAt: null,
    importedFrom: null,
    provenance: { source: 'manual' },
    layer: 'infrastructure' as const,
    ...overrides,
  };
}

beforeEach(() => {
  mockUpdateElement.mockClear();
  mockDeleteElement.mockClear();
  mockSetEditingElementId.mockClear();
});

describe('ElementEditorModal', () => {
  it('renders modal with testID element-editor-modal when visible=true', () => {
    const { getByTestId } = render(
      <ElementEditorModal
        visible
        element={makeEl('e1', { provenance: { source: 'manual', plantSlug: 'tomate' } })}
        onSave={jest.fn()}
        onCancel={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    expect(getByTestId('element-editor-modal')).toBeTruthy();
  });

  it('renders title from i18n key editor.elementEditor.title', () => {
    const { getByText } = render(
      <ElementEditorModal
        visible
        element={makeEl('e1')}
        onSave={jest.fn()}
        onCancel={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    expect(getByText('Element bearbeiten')).toBeTruthy();
  });

  it('renders kern-felder: name, widthCm, heightCm, rotationDeg inputs', () => {
    const { getByTestId } = render(
      <ElementEditorModal
        visible
        element={makeEl('e1')}
        onSave={jest.fn()}
        onCancel={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    expect(getByTestId('kern-name')).toBeTruthy();
    expect(getByTestId('kern-width')).toBeTruthy();
    expect(getByTestId('kern-height')).toBeTruthy();
    expect(getByTestId('kern-rotation')).toBeTruthy();
  });

  it('renders ZOrderButtons component', () => {
    const { getByTestId } = render(
      <ElementEditorModal
        visible
        element={makeEl('e1')}
        onSave={jest.fn()}
        onCancel={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    expect(getByTestId('zorder-buttons-e1')).toBeTruthy();
  });

  it('renders 3-button footer: destructive Löschen / ghost Abbrechen / default Speichern (D-17)', () => {
    const { getByTestId } = render(
      <ElementEditorModal
        visible
        element={makeEl('e1')}
        onSave={jest.fn()}
        onCancel={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    expect(getByTestId('element-editor-delete')).toBeTruthy();
    expect(getByTestId('element-editor-cancel')).toBeTruthy();
    expect(getByTestId('element-editor-save')).toBeTruthy();
  });

  it('Speichern button calls onSave with computed patch and clears editingElementId — Pitfall-5: provenance.plantSlug preserved', () => {
    const element = makeEl('e1', { provenance: { source: 'manual', plantSlug: 'tomate' } });
    const onSave = jest.fn();
    const { getByTestId } = render(
      <ElementEditorModal
        visible
        element={element}
        onSave={onSave}
        onCancel={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    fireEvent.press(getByTestId('element-editor-save'));
    expect(onSave).toHaveBeenCalledTimes(1);
    const patch = onSave.mock.calls[0][0];
    // Pitfall-5: plantSlug must survive the provenance spread
    expect(patch.provenance.plantSlug).toBe('tomate');
    // editingElementId cleared
    expect(mockSetEditingElementId).toHaveBeenCalledWith(null);
  });

  it('Abbrechen button clears editingElementId without calling onSave (D-18 verwerfen)', () => {
    const onCancel = jest.fn();
    const onSave = jest.fn();
    const { getByTestId } = render(
      <ElementEditorModal
        visible
        element={makeEl('e1')}
        onSave={onSave}
        onCancel={onCancel}
        onDelete={jest.fn()}
      />
    );
    fireEvent.press(getByTestId('element-editor-cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
    expect(mockSetEditingElementId).toHaveBeenCalledWith(null);
  });

  it('Löschen button calls onDelete and clears editingElementId', () => {
    const onDelete = jest.fn();
    const { getByTestId } = render(
      <ElementEditorModal
        visible
        element={makeEl('e1')}
        onSave={jest.fn()}
        onCancel={jest.fn()}
        onDelete={onDelete}
      />
    );
    fireEvent.press(getByTestId('element-editor-delete'));
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(mockSetEditingElementId).toHaveBeenCalledWith(null);
  });

  it('More-Fields section default-collapsed (D-11)', () => {
    const { queryByTestId } = render(
      <ElementEditorModal
        visible
        element={makeEl('e1')}
        onSave={jest.fn()}
        onCancel={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    // more-plantedAt and more-accentColor are only rendered when expanded
    expect(queryByTestId('more-plantedAt')).toBeNull();
    expect(queryByTestId('more-accentColor')).toBeNull();
  });

  it('More-Fields counter shows (3) when note + plantedAt + accentColor all set', () => {
    const element = makeEl('e1', {
      provenance: {
        source: 'manual',
        plantSlug: 'tomate',
        note: 'Meine Notiz',
        plantedAt: '2026-04-01',
        accentColor: '#ff0000',
      },
    });
    const { getByText } = render(
      <ElementEditorModal
        visible
        element={element}
        onSave={jest.fn()}
        onCancel={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    // Counter text "(3)" rendered since all 3 extra fields are set (default collapsed)
    expect(getByText(/\(3\)/)).toBeTruthy();
  });

  // D-21 explicit: label lives on dedicated top-level column, NEVER in provenance.
  it('D-21: Save patch has label as top-level key, NOT inside provenance', () => {
    const element = makeEl('e1', { label: 'Beet A', provenance: { source: 'manual' } });
    const onSave = jest.fn();
    const { getByTestId } = render(
      <ElementEditorModal
        visible
        element={element}
        onSave={onSave}
        onCancel={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    // Change the name field
    fireEvent.changeText(getByTestId('kern-name'), 'Beet B');
    fireEvent.press(getByTestId('element-editor-save'));
    expect(onSave).toHaveBeenCalledTimes(1);
    const patch = onSave.mock.calls[0][0];
    // D-21: label as top-level key (dedicated column)
    expect(patch.label).toBe('Beet B');
    // D-21: label NEVER in provenance
    expect(patch.provenance?.label).toBeUndefined();
  });

  it('Save patch shape: widthM and heightM are dedicated columns (D-20), computed from cm inputs', () => {
    const element = makeEl('e1', { widthM: 2, heightM: 1 });
    const onSave = jest.fn();
    const { getByTestId } = render(
      <ElementEditorModal
        visible
        element={element}
        onSave={onSave}
        onCancel={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    // Default values initialized from element: widthCm=200 (2m*100), heightCm=100 (1m*100)
    fireEvent.press(getByTestId('element-editor-save'));
    const patch = onSave.mock.calls[0][0];
    expect(patch.widthM).toBe(2); // 200 cm / 100
    expect(patch.heightM).toBe(1); // 100 cm / 100
  });

  it('renders nothing when visible=false', () => {
    const { queryByTestId } = render(
      <ElementEditorModal
        visible={false}
        element={makeEl('e1')}
        onSave={jest.fn()}
        onCancel={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    expect(queryByTestId('element-editor-modal')).toBeNull();
  });
});
