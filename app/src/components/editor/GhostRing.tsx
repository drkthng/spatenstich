// Phase 7 Plan 04: Plant-spacing Skia overlay (RESEARCH §Pattern 5, §Code Examples §5).
// UI-SPEC §Canvas Overlay Colors: OK = #15803D 50%, overlap = #DC2626 60%.

import * as React from 'react';
import { Circle } from '@shopify/react-native-skia';

interface Props {
  xM: number;
  yM: number;
  spacingM: number;
  overlapping: boolean;
}

export function GhostRing({
  xM,
  yM,
  spacingM,
  overlapping,
}: Props): React.JSX.Element {
  const color = overlapping ? '#DC2626' : '#15803D';
  const opacity = overlapping ? 0.6 : 0.5;
  return (
    <Circle
      cx={xM}
      cy={yM}
      r={spacingM / 2}
      style="stroke"
      strokeWidth={0.04}
      color={color}
      opacity={opacity}
    />
  );
}
