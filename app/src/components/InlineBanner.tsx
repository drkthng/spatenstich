// InlineBanner — contextual missing-data hint (D-04, UI-SPEC §"Inline Banner").
// 4px left amber border, icon + message + action link + dismiss X.
// Phase 2-02-01.
import * as React from 'react';
import { View, Pressable, Text } from 'react-native';
import { AlertCircle, X } from 'lucide-react-native';
import { cn } from '@/src/lib/utils';

export interface InlineBannerProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
  variant?: 'warning';
  testID?: string;
}

export function InlineBanner({
  message,
  actionLabel,
  onAction,
  onDismiss,
  testID,
}: InlineBannerProps): React.JSX.Element | null {
  const [dismissed, setDismissed] = React.useState(false);
  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  const content = (
    <View
      testID={testID}
      className={cn(
        'border-l-4 border-amber-500 min-h-[52px] pl-3 pr-2 py-3',
        'flex-row items-center bg-amber-50 dark:bg-amber-950 rounded-r-md'
      )}
    >
      <AlertCircle size={16} color="#D97706" />
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
