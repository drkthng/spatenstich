// InlineBanner — contextual hint/alert banner (D-04, D-09, UI-SPEC §"Inline Banner").
// 4px left border, icon + message + action link + dismiss X.
// Supports warning (amber), error (red), success (green) variants.
// Phase 2-02-01, extended Phase 9-01.
import { tokens } from '@/src/theme/tokens';
import * as React from 'react';
import { View, Pressable, Text } from 'react-native';
import { AlertCircle, AlertTriangle, CheckCircle, X } from 'lucide-react-native';
import { cn } from '@/src/lib/utils';
import { t as tx } from '@/src/lib/i18n';

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
    border: 'border-warn',
    bg: 'bg-warn-soft',
    iconColor: tokens.color.warn,
    Icon: AlertCircle,
  },
  error: {
    border: 'border-danger',
    bg: 'bg-danger-soft',
    iconColor: tokens.color.danger,
    Icon: AlertTriangle,
  },
  success: {
    border: 'border-primary',
    bg: 'bg-ok-soft',
    iconColor: tokens.color.primary,
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
        <Text className="text-sm text-ink">{message}</Text>
        {actionLabel ? (
          <Text className="text-sm font-semibold text-primary mt-1">
            {actionLabel}
          </Text>
        ) : null}
      </View>
      {onDismiss || actionLabel ? (
        <Pressable
          onPress={handleDismiss}
          accessibilityRole="button"
          accessibilityLabel={tx('companion.dismiss')}
          className="min-h-[48px] min-w-[48px] items-center justify-center"
          hitSlop={8}
        >
          <X size={16} color={tokens.color.inkMuted} />
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
