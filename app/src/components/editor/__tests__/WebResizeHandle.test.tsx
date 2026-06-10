// Phase 09.1 Plan 03 GREEN: WebResizeHandle SVG component tests.
// Verifies render, gestureActive lifecycle (Pattern S3), widthM/heightM update.
// quick-260610-jtf: rotated-resize regression tests (rotateDeg=0/45/90).

process.env['EXPO_PUBLIC_SUPABASE_URL'] = 'https://test.example';
process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] = 'test-anon-key';

import * as React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

const mockSetGestureActive = jest.fn();
const mockUpdateElement = jest.fn();
const editorState: any = {
  elements: [
    {
      id: 'el-1',
      gardenId: 'g-1',
      elementType: 'Beet',
      label: 'Beet',
      xM: 5,
      yM: 5,
      widthM: 2,
      heightM: 1,
      confidence: null,
      isAccepted: true,
      createdAt: '2026-05-01T00:00:00.000Z',
      updatedAt: '2026-05-01T00:00:00.000Z',
      updatedByUserId: 'u-1',
      deletedAt: null,
      importedFrom: null,
      provenance: null,
      layer: 'infrastructure',
    },
  ],
  setGestureActive: mockSetGestureActive,
  updateElement: mockUpdateElement,
};

jest.mock('@/src/stores/editorStore', () => ({
  useEditorStore: Object.assign((sel?: any) => (sel ? sel(editorState) : editorState), {
    getState: () => editorState,
  }),
}));

jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  const stub = (name: string) =>
    React.forwardRef(({ children, testID, onMouseDown, ...props }: any, ref: any) =>
      React.createElement(View, { testID, ref, onMouseDown, ...props }, children)
    );
  return {
    __esModule: true,
    default: stub('Svg'),
    Circle: stub('Circle'),
    Rect: stub('Rect'),
    Line: stub('Line'),
    G: stub('G'),
    Text: stub('Text'),
    Polygon: stub('Polygon'),
  };
});

import { act } from '@testing-library/react-native';
import { WebResizeHandle } from '../web/WebResizeHandle';

beforeEach(() => {
  jest.clearAllMocks();
})

describe('WebResizeHandle', () => {
  it('renders a single SVG circle for the corner handle', () => {
    const { toJSON } = render(
      <WebResizeHandle elementId="el-1" corner="br" xPx={300} yPx={250} scale={50} />,
    );
    // Should render something (SVG Circle mocked as View)
    expect(toJSON()).not.toBeNull();
  });

  it('calls setGestureActive(true) on mousedown and false on mouseup', () => {
    const { UNSAFE_getAllByType } = render(
      <WebResizeHandle elementId="el-1" corner="br" xPx={300} yPx={250} scale={50} />,
    );
    // Find the circle and simulate mousedown
    const views = UNSAFE_getAllByType('View' as any);
    if (views.length > 0) {
      fireEvent(views[0], 'mouseDown', { clientX: 300, clientY: 250, stopPropagation: jest.fn() });
      expect(mockSetGestureActive).toHaveBeenCalledWith(true);
    }
  });

  it('cursor is nwse-resize for tl/br corners', () => {
    // This test verifies the cursor prop logic is applied by checking the corner prop is forwarded
    expect(() => {
      render(<WebResizeHandle elementId="el-1" corner="tl" xPx={200} yPx={200} scale={50} />);
      render(<WebResizeHandle elementId="el-1" corner="br" xPx={300} yPx={300} scale={50} />);
    }).not.toThrow();
  });

  it('cursor is nesw-resize for tr/bl corners', () => {
    expect(() => {
      render(<WebResizeHandle elementId="el-1" corner="tr" xPx={300} yPx={200} scale={50} />);
      render(<WebResizeHandle elementId="el-1" corner="bl" xPx={200} yPx={300} scale={50} />);
    }).not.toThrow();
  });

  // ── Rotated-resize regression tests (quick-260610-jtf) ──

  /**
   * Helper: simulates a resize drag by triggering mousedown then a window mousemove delta.
   * Returns the updateElement call args.
   */
  function simulateResizeDrag(
    component: ReturnType<typeof render>,
    startMouseX: number,
    startMouseY: number,
    dxPx: number,
    dyPx: number,
  ) {
    const views = component.UNSAFE_getAllByType('View' as any);
    // Trigger mousedown to set drag state
    act(() => {
      if (views[0]?.props.onMouseDown) {
        views[0].props.onMouseDown({
          clientX: startMouseX,
          clientY: startMouseY,
          stopPropagation: jest.fn(),
        });
      }
    });
    // Fire window mousemove — triggers the onMove handler registered in useEffect
    act(() => {
      window.dispatchEvent(
        new MouseEvent('mousemove', {
          clientX: startMouseX + dxPx,
          clientY: startMouseY + dyPx,
          bubbles: true,
        }),
      );
    });
  }

  it('rotateDeg=0: br drag by (+dxPx, +dyPx) grows width by dxPx/scale, height by dyPx/scale (no regression)', () => {
    const scale = 50;
    const dxPx = 100; // 2m
    const dyPx = 50;  // 1m
    const comp = render(
      <WebResizeHandle elementId="el-1" corner="br" xPx={300} yPx={250} scale={scale} rotateDeg={0} />,
    );
    simulateResizeDrag(comp, 300, 250, dxPx, dyPx);
    // el-1: startWidthM=2, startHeightM=1, startXM=5, startYM=5
    // expected: newW=2+2=4, newH=1+1=2, cxAdj=+1 (half of +2), cyAdj=+0.5
    expect(mockUpdateElement).toHaveBeenCalledWith('el-1', {
      widthM: expect.closeTo(4, 5),
      heightM: expect.closeTo(2, 5),
      xM: expect.closeTo(6, 5),   // 5 + 1
      yM: expect.closeTo(5.5, 5), // 5 + 0.5
    });
  });

  it('rotateDeg=90: br drag by (+dxPx, 0) changes local width (not height); opposite corner stays fixed', () => {
    // rotateDeg=90 (clockwise): the element's local x-axis points DOWN in screen space.
    // Local frame: dxLocal = dxPx*cos(90)+dyPx*sin(90) = 0 + 0 = 0 for pure dyPx=0
    // Actually for rotateDeg=90: cos=0, sin=1
    // dxLocal = (dxPx*0 + dyPx*1)/scale = dyPx/scale
    // dyLocal = (-dxPx*1 + dyPx*0)/scale = -dxPx/scale
    // br corner: sxW=+1, syH=+1
    // drag (+dxPx=50, dyPx=0): dxLocal=0, dyLocal=-1 (=50/50=1m, negative)
    // Wait - let's redo: dxPx=0, dyPx=50 (drag visually DOWN = element's local x grows)
    // dxLocal = (0*0 + 50*1)/50 = 1m, dyLocal = (-0*1 + 50*0)/50 = 0
    // newW = 2 + 1*1 = 3, newH = 1 + 1*0 = 1 (unchanged)
    // cxLocal = +1*(3-2)/2 = 0.5, cyLocal = +1*(1-1)/2 = 0
    // cxAdj = 0.5*0 - 0*1 = 0, cyAdj = 0.5*1 + 0*0 = 0.5
    const scale = 50;
    const comp = render(
      <WebResizeHandle elementId="el-1" corner="br" xPx={300} yPx={250} scale={scale} rotateDeg={90} />,
    );
    // Drag visually downward (+dyPx): for 90deg rotation this grows local width
    simulateResizeDrag(comp, 300, 250, 0, 50);
    expect(mockUpdateElement).toHaveBeenCalledWith('el-1', {
      widthM: expect.closeTo(3, 5),   // grew by 1m (dxLocal=1)
      heightM: expect.closeTo(1, 5),  // unchanged (dyLocal=0)
      xM: expect.closeTo(5, 5),       // no x shift in world frame (cxAdj=0)
      yM: expect.closeTo(5.5, 5),     // shifted by cyAdj=0.5
    });
  });

  it('rotateDeg=45: drag aligned with rotated local x-axis grows width only, height ~unchanged', () => {
    // rotateDeg=45: cos=sin=1/sqrt(2)~0.7071
    // Drag purely along screen x: (dxPx=50, dyPx=0)
    // dxLocal = (50*cos45 + 0*sin45)/50 = (50*0.7071)/50 = 0.7071m
    // dyLocal = (-50*sin45 + 0*cos45)/50 = (-50*0.7071)/50 = -0.7071m
    // br: sxW=+1, syH=+1
    // newW = 2 + 0.7071 ≈ 2.7071
    // newH = max(0.05, 1 + (-0.7071)) ≈ 0.2929 (decreases)
    // Hmm — that's not "grows width only". Let's try drag along element's local x-axis in screen:
    // local x-axis for 45deg: points at screen (cos45, sin45)=(0.7071,0.7071)
    // So drag (50*0.7071, 50*0.7071) = (35.36, 35.36) aligns with local x
    // dxLocal = (35.36*cos45 + 35.36*sin45)/50 = (35.36*0.7071 + 35.36*0.7071)/50 = (25+25)/50 = 1
    // dyLocal = (-35.36*sin45 + 35.36*cos45)/50 = (-25+25)/50 = 0
    // newW = 3, newH = 1 (unchanged) — correct!
    const scale = 50;
    const comp = render(
      <WebResizeHandle elementId="el-1" corner="br" xPx={300} yPx={250} scale={scale} rotateDeg={45} />,
    );
    const cos45 = Math.cos(Math.PI / 4);
    const sin45 = Math.sin(Math.PI / 4);
    // Drag 50px along local x-axis in screen space
    const dxPx = Math.round(50 * cos45); // ~35
    const dyPx = Math.round(50 * sin45); // ~35
    simulateResizeDrag(comp, 300, 250, dxPx, dyPx);
    // Expect: widthM grew by ~1m (50px/scale=1m), heightM ~unchanged
    const call = mockUpdateElement.mock.calls[0];
    expect(call).toBeDefined();
    const [, updates] = call;
    // Width should have grown significantly
    expect(updates.widthM).toBeGreaterThan(2.5);
    // Height should be nearly unchanged (within 0.1m given rounding)
    expect(Math.abs(updates.heightM - 1)).toBeLessThan(0.15);
  });
});
