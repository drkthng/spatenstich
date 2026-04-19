// UI Primitive: Text
// Source: react-native-reusables (https://github.com/founded-labs/react-native-reusables)
// Adapted for NativeWind 4.1.23 + no-variants stone baseColor.
// Phase 2-02-01 manual install (CLI RN registry not wired — see components.json _note).
import * as React from 'react';
import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { cn } from '@/src/lib/utils';

export interface TextProps extends RNTextProps {
  className?: string;
}

export const Text = React.forwardRef<RNText, TextProps>(({ className, ...props }, ref) => {
  return (
    <RNText
      ref={ref}
      className={cn('text-base text-stone-900 dark:text-stone-100', className)}
      {...props}
    />
  );
});
Text.displayName = 'Text';
