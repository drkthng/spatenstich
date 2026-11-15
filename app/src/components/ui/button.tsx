// UI Primitive: Button
// Source: react-native-reusables (https://github.com/founded-labs/react-native-reusables)
// Phase 2-02-01 manual install.
import * as React from 'react';
import { Pressable, type PressableProps } from 'react-native';
import { cn } from '@/src/lib/utils';
import { Text } from './text';

type ButtonVariant = 'default' | 'destructive' | 'outline' | 'ghost';
type ButtonSize = 'default' | 'sm' | 'lg';

export interface ButtonProps extends Omit<PressableProps, 'children'> {
  className?: string;
  textClassName?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  children?: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, { root: string; text: string }> = {
  default: {
    root: 'bg-primary active:opacity-80',
    text: 'text-on-primary font-semibold',
  },
  destructive: {
    root: 'bg-danger active:opacity-80',
    text: 'text-on-primary font-semibold',
  },
  outline: {
    root: 'border border-line bg-transparent active:opacity-80',
    text: 'text-ink font-semibold',
  },
  ghost: {
    root: 'bg-transparent active:opacity-80',
    text: 'text-ink font-semibold',
  },
};

const sizeClasses: Record<ButtonSize, string> = {
  default: 'min-h-[48px] px-4 py-3 rounded-lg',
  sm: 'min-h-[48px] px-3 py-2 rounded-md',
  lg: 'min-h-[52px] px-6 py-4 rounded-lg',
};

export const Button = React.forwardRef<React.ElementRef<typeof Pressable>, ButtonProps>(
  ({ className, textClassName, variant = 'default', size = 'default', children, disabled, ...props }, ref) => {
    const v = variantClasses[variant];
    const disabledClass = disabled ? 'opacity-50' : '';
    return (
      <Pressable
        ref={ref}
        accessibilityRole="button"
        disabled={disabled}
        className={cn(
          'flex-row items-center justify-center',
          sizeClasses[size],
          v.root,
          disabledClass,
          className
        )}
        {...props}
      >
        {typeof children === 'string' ? (
          <Text className={cn(v.text, textClassName)}>{children}</Text>
        ) : (
          children
        )}
      </Pressable>
    );
  }
);
Button.displayName = 'Button';
