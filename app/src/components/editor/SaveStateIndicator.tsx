// Phase 7 Plan 04: Tri-state save UI (UI-SPEC §SaveStateIndicator).
// Driven by parent state (EditorToolbar) — this component is presentation-only.

import * as React from 'react';
import { View, Text } from 'react-native';
import { Save, Loader2, Check, AlertCircle } from 'lucide-react-native';
import de from '@spatenstich/shared/i18n/de';

// Local t() falls back to the key when missing — Plan 05 fills concrete strings in de.json.
const t = (key: string): string =>
  key
    .split('.')
    .reduce<unknown>((o, k) => {
      if (o && typeof o === 'object' && k in o) {
        return (o as Record<string, unknown>)[k];
      }
      return undefined;
    }, de) as string ?? key;

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface Props {
  state: SaveState;
}

export function SaveStateIndicator({ state }: Props): React.JSX.Element {
  const ICON = (
    { idle: Save, saving: Loader2, saved: Check, error: AlertCircle } as const
  )[state];
  const LABEL = (
    {
      idle: 'editor.save',
      saving: 'editor.saving',
      saved: 'editor.saved',
      error: 'editor.saveError',
    } as const
  )[state];
  const colorByState: Record<SaveState, string> = {
    idle: '#78716C',
    saving: '#4A7C59',
    saved: '#4A7C59',
    error: '#DC2626',
  };
  return (
    <View
      className="flex-row items-center"
      testID={`save-state-${state}`}
    >
      <ICON size={20} color={colorByState[state]} />
      <Text
        className="ml-2 text-sm font-semibold"
        style={{ color: colorByState[state] }}
      >
        {t(LABEL)}
      </Text>
    </View>
  );
}
