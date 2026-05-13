// Phase 7 Plan 04: Live polygon Skia path (RESEARCH §Pattern 4, §Code Examples §4).
// Intentionally NOT closed — closing happens on commit via editorStore.polygonCommit.
// Revision W6: dashed stroke is mandatory per UI-SPEC §Canvas Overlay Colors — use DashPathEffect.

import * as React from 'react';
import {
  Path,
  Skia,
  Circle,
  DashPathEffect,
} from '@shopify/react-native-skia';
import { PLAN_COLORS } from '@/src/lib/colors';

interface Props {
  points: { x: number; y: number }[];
}

export function PolygonInProgress({
  points,
}: Props): React.JSX.Element | null {
  const path = React.useMemo(() => {
    if (points.length < 2) return null;
    const p = Skia.Path.Make();
    p.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) p.lineTo(points[i].x, points[i].y);
    return p;
  }, [points]);

  if (points.length === 0) return null;

  return (
    <>
      {path && (
        <Path
          path={path}
          style="stroke"
          strokeWidth={0.05}
          color={PLAN_COLORS.border}
        >
          {/* Revision W6: dashed pattern per UI-SPEC §Canvas Overlay Colors —
              intervals in garden-meters (0.2m on, 0.1m off) so the dash density
              stays visually consistent across zoom levels (Skia paints in the
              outer Group's local space — same units as the polygon path). */}
          <DashPathEffect intervals={[0.2, 0.1]} />
        </Path>
      )}
      {points.map((pt, i) => (
        <Circle key={i} cx={pt.x} cy={pt.y} r={0.06} color="#0EA5E9" />
      ))}
    </>
  );
}
