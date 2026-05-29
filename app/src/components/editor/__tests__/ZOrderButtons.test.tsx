// Phase 09.1 Wave 2 GREEN: ZOrderButtons 4-button cluster render + press dispatch.
// D-12 (Photoshop-style buttons) + Pitfall-5 (provenance spread preserves plantSlug).

import * as React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

const mockUpdateElement = jest.fn();

const editorState: any = {
  elements: [],
  updateElement: mockUpdateElement,
};

jest.mock('@/src/stores/editorStore', () => {
  const useEditorStore = Object.assign(
    (sel?: any) => (sel ? sel(editorState) : editorState),
    { getState: () => editorState },
  );
  return { useEditorStore };
});

import { ZOrderButtons } from '../ZOrderButtons';

function makeEl(id: string, zOrder: number, overrides: Record<string, any> = {}) {
  return {
    id,
    gardenId: 'g-1',
    elementType: 'Beet',
    label: id,
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
    provenance: { source: 'manual', zOrder },
    layer: 'infrastructure' as const,
    ...overrides,
  };
}

beforeEach(() => {
  mockUpdateElement.mockClear();
  // 3 elements: e0 (z=0), e1 (z=5), e2 (z=10)
  editorState.elements = [
    makeEl('e0', 0),
    makeEl('e1', 5, { provenance: { source: 'manual', zOrder: 5, plantSlug: 'tomate' } }),
    makeEl('e2', 10),
  ];
});

describe('ZOrderButtons', () => {
  it('renders 4 buttons with testIDs zorder-front, zorder-forward, zorder-backward, zorder-back', () => {
    const { getByTestId } = render(<ZOrderButtons elementId="e1" />);
    expect(getByTestId('zorder-front')).toBeTruthy();
    expect(getByTestId('zorder-forward')).toBeTruthy();
    expect(getByTestId('zorder-backward')).toBeTruthy();
    expect(getByTestId('zorder-back')).toBeTruthy();
  });

  it('zorder-front button press calls bringToFront via updateElement provenance patch — zOrder = max+1', () => {
    const { getByTestId } = render(<ZOrderButtons elementId="e1" />);
    fireEvent.press(getByTestId('zorder-front'));
    expect(mockUpdateElement).toHaveBeenCalledTimes(1);
    const [id, patch] = mockUpdateElement.mock.calls[0];
    expect(id).toBe('e1');
    // bringToFront: max(0, 10) + 1 = 11 (excluding e1's own zOrder)
    expect(patch.provenance.zOrder).toBe(11);
  });

  it('zorder-back button press calls sendToBack via updateElement provenance patch — zOrder = min-1', () => {
    const { getByTestId } = render(<ZOrderButtons elementId="e1" />);
    fireEvent.press(getByTestId('zorder-back'));
    expect(mockUpdateElement).toHaveBeenCalledTimes(1);
    const [id, patch] = mockUpdateElement.mock.calls[0];
    expect(id).toBe('e1');
    // sendToBack: min(0, 10) - 1 = -1
    expect(patch.provenance.zOrder).toBe(-1);
  });

  it('Pitfall-5 mitigation: provenance patch spreads previous provenance (preserves plantSlug)', () => {
    const { getByTestId } = render(<ZOrderButtons elementId="e1" />);
    fireEvent.press(getByTestId('zorder-front'));
    const [, patch] = mockUpdateElement.mock.calls[0];
    // plantSlug must survive the provenance spread (Pitfall-5)
    expect(patch.provenance.plantSlug).toBe('tomate');
    // source must also survive
    expect(patch.provenance.source).toBe('manual');
  });
});
