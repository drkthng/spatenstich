// UI Primitive: Label
// Source: react-native-reusables (https://github.com/founded-labs/react-native-reusables)
// Phase 2-02-01 manual install.
import * as React from 'react';
import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { cn } from '@/src/lib/utils';

export interface LabelProps extends RNTextProps {
  className?: string;
}

export const Label = React.forwardRef<RNText, LabelProps>(({ className, ...props }, ref) => {
  return (
    <RNText
      ref={ref}
      className={cn('text-sm font-medium text-stone-700 dark:text-stone-300 mb-1', className)}
      {...props}
    />
  );
});
Label.displayName = 'Label';
