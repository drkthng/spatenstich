// UI Primitive: Input
// Source: react-native-reusables (https://github.com/founded-labs/react-native-reusables)
// Phase 2-02-01 manual install.
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
      placeholderTextColor="#A8A29E"
      className={cn(
        'min-h-[44px] px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700',
        'bg-white dark:bg-stone-950 text-base text-stone-900 dark:text-stone-100',
        'focus:border-[#4A7C59] dark:focus:border-[#6BAA7E]',
        className
      )}
      {...props}
    />
  );
});
Input.displayName = 'Input';
