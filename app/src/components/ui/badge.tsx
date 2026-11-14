// UI Primitive: Badge
// Source: react-native-reusables (https://github.com/founded-labs/react-native-reusables)
// Phase 2-02-01 manual install.
import * as React from 'react';
import { View, Text, type ViewProps } from 'react-native';
import { cn } from '@/src/lib/utils';

type BadgeVariant = 'default' | 'secondary' | 'outline' | 'destructive';

export interface BadgeProps extends ViewProps {
  className?: string;
  textClassName?: string;
  variant?: BadgeVariant;
  children?: React.ReactNode;
}

const variantClasses: Record<BadgeVariant, { root: string; text: string }> = {
  default: {
    root: 'bg-primary border-transparent',
    text: 'text-on-primary',
  },
  secondary: {
    root: 'bg-surface-2 border-line',
    text: 'text-ink',
  },
  outline: {
    root: 'bg-transparent border-line',
    text: 'text-ink',
  },
  destructive: {
    root: 'bg-danger border-transparent',
    text: 'text-on-primary',
  },
};

export const Badge = React.forwardRef<View, BadgeProps>(
  ({ className, textClassName, variant = 'default', children, ...props }, ref) => {
    const v = variantClasses[variant];
    return (
      <View
        ref={ref}
        className={cn('flex-row items-center rounded-full border px-2 py-0.5', v.root, className)}
        {...props}
      >
        {typeof children === 'string' ? (
          <Text className={cn('text-xs font-medium', v.text, textClassName)}>{children}</Text>
        ) : (
          children
        )}
      </View>
    );
  }
);
Badge.displayName = 'Badge';
