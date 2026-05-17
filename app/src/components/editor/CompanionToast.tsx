// Phase 9 Plan 03: Floating companion-hint toast (D-06, D-07).
// Positioned absolutely above editor toolbar. Non-blocking (pointerEvents box-none).
// Auto-dismisses after autoDismissMs (default 4000ms). Manual dismiss via X button.
import * as React from 'react';
import { View, Pressable, Text } from 'react-native';
import { AlertTriangle, CheckCircle, X } from 'lucide-react-native';
import { cn } from '@/src/lib/utils';

export interface CompanionToastProps {
  variant: 'error' | 'success';
  message: string;
  autoDismissMs?: number;
  onDismiss: () => void;
  testID?: string;
}

const VARIANT_STYLES = {
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

export function CompanionToast({
  variant,
  message,
  autoDismissMs = 4000,
  onDismiss,
  testID,
}: CompanionToastProps): React.JSX.Element {
  // Auto-dismiss timer
  React.useEffect(() => {
    const timer = setTimeout(onDismiss, autoDismissMs);
    return () => clearTimeout(timer);
  }, [autoDismissMs, onDismiss]);

  const vs = VARIANT_STYLES[variant];

  return (
    <View
      testID={testID}
      pointerEvents="box-none"
      style={{ position: 'absolute', bottom: 72, left: 16, right: 16 }}
    >
      <View
        className={cn(
          'border-l-4 min-h-[52px] pl-3 pr-2 py-2',
          'flex-row items-center rounded-r-md shadow-md',
          vs.border, vs.bg,
        )}
      >
        <vs.Icon size={16} color={vs.iconColor} />
        <View className="flex-1 ml-2">
          <Text className="text-sm text-stone-800 dark:text-stone-100">
            {message}
          </Text>
        </View>
        <Pressable
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel="Hinweis schließen"
          className="min-h-[44px] min-w-[44px] items-center justify-center"
          hitSlop={8}
        >
          <X size={16} color="#78716C" />
        </Pressable>
      </View>
    </View>
  );
}
