// UI Primitive: Input
// Source: react-native-reusables (https://github.com/founded-labs/react-native-reusables)
// Phase 2-02-01 manual install.
import { tokens } from '@/src/theme/tokens';
import * as React from 'react';
import { TextInput, type TextInputProps } from 'react-native';
import { cn } from '@/src/lib/utils';

export interface InputProps extends TextInputProps {
  className?: string;
}

export const Input = React.forwardRef<TextInput, InputProps>(({ className, ...props }, ref) => {
  return (
    <TextInput
      ref={ref}
      placeholderTextColor={tokens.color.inkMuted}
      className={cn(
        'min-h-[48px] px-3 py-2 rounded-lg border border-line',
        'bg-bg text-base text-ink',
        'focus:border-primary',
        className
      )}
      {...props}
    />
  );
});
Input.displayName = 'Input';
