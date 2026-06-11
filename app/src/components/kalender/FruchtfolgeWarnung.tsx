// Phase 10 Plan 04: FruchtfolgeWarnung — thin InlineBanner wrapper for CAL-06.
// Renders a warning banner when a same-family plant already occupies the target bed.
// Render nothing-guarding is the caller's responsibility (only render when warnung=true).
import * as React from 'react';
import { InlineBanner } from '../InlineBanner';

export interface FruchtfolgeWarnungProps {
  grund: string;
  onDismiss?: () => void;
}

export function FruchtfolgeWarnung({ grund, onDismiss }: FruchtfolgeWarnungProps): React.JSX.Element {
  return (
    <InlineBanner
      variant="warning"
      message={grund}
      onDismiss={onDismiss}
      testID="fruchtfolge-warnung"
    />
  );
}
