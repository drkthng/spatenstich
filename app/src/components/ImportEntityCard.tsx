// ImportEntityCard — Phase 6 Plan 06-03.
// Card component with TrafficLightBadge confidence chip and Switch toggle.
// D-10, D-11 from 06-CONTEXT.md: confidence >= 0.8 → green, 0.6–0.79 → amber, < 0.6 → red.
// Entities with confidence < 0.6 default OFF (caller's responsibility); red + selected shows warning.
import * as React from 'react';
import { View, Text } from 'react-native';
import { Card, CardHeader, CardContent } from '@/src/components/ui/card';
import { TrafficLightBadge, type TrafficLightState } from '@/src/components/TrafficLightBadge';
import { Switch } from '@/src/components/ui/switch';

function confidenceToState(confidence: number | undefined): TrafficLightState {
  if (confidence === undefined) return 'neutral';
  if (confidence >= 0.8) return 'green';
  if (confidence >= 0.6) return 'amber';
  return 'red';
}

function confidenceLabel(state: TrafficLightState, confidence: number | undefined): string {
  if (confidence === undefined) return '';
  const pct = Math.round(confidence * 100);
  switch (state) {
    case 'green': return `${pct}% sicher`;
    case 'amber': return `${pct}% — prüfen`;
    case 'red': return `${pct}% — niedrig`;
    default: return '';
  }
}

export interface ImportEntityCardProps {
  entity: {
    localId: string;
    label: string;
    confidence?: number;
    [key: string]: unknown;
  };
  isSelected: boolean;
  onToggle: (localId: string, value: boolean) => void;
  details?: React.ReactNode;
  testID?: string;
}

export function ImportEntityCard({
  entity,
  isSelected,
  onToggle,
  details,
  testID,
}: ImportEntityCardProps): React.JSX.Element {
  const state = confidenceToState(entity.confidence);
  const showWarning = state === 'red' && isSelected;

  return (
    <Card className="mb-3" testID={testID}>
      <CardHeader>
        <View className="flex-row items-center justify-between">
          <View className="flex-1 mr-3">
            <Text className="text-base font-semibold text-stone-800 dark:text-stone-100">
              {entity.label}
            </Text>
          </View>
          <Switch
            value={isSelected}
            onValueChange={(v) => onToggle(entity.localId, v)}
            accessibilityLabel={`${entity.label} auswählen`}
          />
        </View>
        <TrafficLightBadge
          state={state}
          label={confidenceLabel(state, entity.confidence)}
        />
        {showWarning && (
          <Text className="text-sm text-red-600 dark:text-red-400 mt-1">
            Niedrige Erkennungssicherheit — bitte manuell prüfen
          </Text>
        )}
      </CardHeader>
      {details ? <CardContent>{details}</CardContent> : null}
    </Card>
  );
}
