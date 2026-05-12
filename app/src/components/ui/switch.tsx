// UI Primitive: Switch
// Source: react-native-reusables pattern (forwardRef + NativeWind className interface).
// Phase 6 Plan 06-03: Import flow — entity toggle.
// Colors: active green #4A7C59, inactive stone #A8A29E, thumb white #FFFFFF.
import * as React from 'react';
import { Switch as RNSwitch, type SwitchProps as RNSwitchProps } from 'react-native';

export interface SwitchProps extends Omit<RNSwitchProps, 'trackColor' | 'thumbColor'> {
  className?: string;
}

export const Switch = React.forwardRef<RNSwitch, SwitchProps>(
  ({ className: _className, ...props }, ref) => (
    <RNSwitch
      ref={ref}
      trackColor={{ false: '#A8A29E', true: '#4A7C59' }}
      thumbColor="#FFFFFF"
      ios_backgroundColor="#A8A29E"
      {...props}
    />
  )
);
Switch.displayName = 'Switch';
