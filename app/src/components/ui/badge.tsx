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
    root: 'bg-[#4A7C59] dark:bg-[#6BAA7E] border-transparent',
    text: 'text-white',
  },
  secondary: {
    root: 'bg-stone-200 dark:bg-stone-800 border-stone-300 dark:border-stone-700',
    text: 'text-stone-900 dark:text-stone-100',
  },
  outline: {
    root: 'bg-transparent border-stone-300 dark:border-stone-700',
    text: 'text-stone-900 dark:text-stone-100',
  },
  destructive: {
    root: 'bg-red-600 dark:bg-red-500 border-transparent',
    text: 'text-white',
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
