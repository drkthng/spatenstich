// InlineBanner — contextual hint/alert banner (D-04, D-09, UI-SPEC §"Inline Banner").
// 4px left border, icon + message + action link + dismiss X.
// Supports warning (amber), error (red), success (green) variants.
// Phase 2-02-01, extended Phase 9-01.
import * as React from 'react';
import { View, Pressable, Text } from 'react-native';
import { AlertCircle, AlertTriangle, CheckCircle, X } from 'lucide-react-native';
import { cn } from '@/src/lib/utils';

export interface InlineBannerProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
  variant?: 'warning' | 'error' | 'success';
  testID?: string;
}

const VARIANT_STYLES = {
  warning: {
    border: 'border-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-950',
    iconColor: '#D97706',
    Icon: AlertCircle,
  },
  error: {
    border: 'border-red-600',
    bg: 'bg-red-50 dark:bg-red-950',
    iconColor: '#DC2626',
    Icon: AlertTriangle,
  },
  success: {
    border: 'border-green-600',
    bg: 'bg-green-100 dark:bg-green-950',
    iconColor: '#16A34A',
    Icon: CheckCircle,
  },
} as const;

export function InlineBanner({
  message,
  actionLabel,
  onAction,
  onDismiss,
  variant,
  testID,
}: InlineBannerProps): React.JSX.Element | null {
  const [dismissed, setDismissed] = React.useState(false);
  if (dismissed) return null;

  const vs = VARIANT_STYLES[variant ?? 'warning'];

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  const content = (
    <View
      testID={testID}
      className={cn(
        `border-l-4 ${vs.border} min-h-[52px] pl-3 pr-2 py-3`,
        `flex-row items-center ${vs.bg} rounded-r-md`
      )}
    >
      <vs.Icon size={16} color={vs.iconColor} />
      <View className="flex-1 ml-2">
        <Text className="text-sm text-stone-800 dark:text-stone-100">{message}</Text>
        {actionLabel ? (
          <Text className="text-sm font-semibold text-[#4A7C59] dark:text-[#6BAA7E] mt-1">
            {actionLabel}
          </Text>
        ) : null}
      </View>
      {onDismiss || actionLabel ? (
        <Pressable
          onPress={handleDismiss}
          accessibilityRole="button"
          accessibilityLabel="Hinweis schließen"
          className="min-h-[44px] min-w-[44px] items-center justify-center"
          hitSlop={8}
        >
          <X size={16} color="#78716C" />
        </Pressable>
      ) : null}
    </View>
  );

  if (onAction) {
    return (
      <Pressable
        onPress={onAction}
        accessibilityRole="button"
        accessibilityLabel={message}
        className="active:opacity-80"
      >
        {content}
      </Pressable>
    );
  }
  return content;
}
