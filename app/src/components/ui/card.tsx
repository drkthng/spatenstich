// UI Primitive: Card
// Source: react-native-reusables (https://github.com/founded-labs/react-native-reusables)
// Phase 2-02-01 manual install.
import * as React from 'react';
import { View, type ViewProps } from 'react-native';
import { cn } from '@/src/lib/utils';

export interface CardProps extends ViewProps {
  className?: string;
}

export const Card = React.forwardRef<View, CardProps>(({ className, ...props }, ref) => (
  <View
    ref={ref}
    className={cn(
      'rounded-xl bg-surface-2 border border-line',
      className
    )}
    {...props}
  />
));
Card.displayName = 'Card';

export const CardHeader = React.forwardRef<View, CardProps>(({ className, ...props }, ref) => (
  <View ref={ref} className={cn('p-4 gap-1', className)} {...props} />
));
CardHeader.displayName = 'CardHeader';

export const CardContent = React.forwardRef<View, CardProps>(({ className, ...props }, ref) => (
  <View ref={ref} className={cn('p-4 pt-0', className)} {...props} />
));
CardContent.displayName = 'CardContent';

export const CardFooter = React.forwardRef<View, CardProps>(({ className, ...props }, ref) => (
  <View ref={ref} className={cn('p-4 pt-0 flex-row items-center', className)} {...props} />
));
CardFooter.displayName = 'CardFooter';
