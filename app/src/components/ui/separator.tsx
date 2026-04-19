// UI Primitive: Separator
// Source: react-native-reusables (https://github.com/founded-labs/react-native-reusables)
// Phase 2-02-01 manual install.
import * as React from 'react';
import { View, type ViewProps } from 'react-native';
import { cn } from '@/src/lib/utils';

export interface SeparatorProps extends ViewProps {
  className?: string;
  orientation?: 'horizontal' | 'vertical';
}

export const Separator = React.forwardRef<View, SeparatorProps>(
  ({ className, orientation = 'horizontal', ...props }, ref) => {
    const orientationClass =
      orientation === 'horizontal' ? 'h-px w-full' : 'w-px h-full';
    return (
      <View
        ref={ref}
        accessibilityRole="none"
        className={cn('bg-stone-300 dark:bg-stone-700', orientationClass, className)}
        {...props}
      />
    );
  }
);
Separator.displayName = 'Separator';
