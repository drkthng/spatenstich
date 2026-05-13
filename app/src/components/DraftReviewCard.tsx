// Phase 6.5 Plan 04: Sichtungs-Card with Annehmen/Verwerfen/Editieren actions.
// Pattern: ImportEntityCard.tsx (Card + TrafficLightBadge); Switch replaced by 3 Buttons.

import * as React from 'react';
import { View, Text } from 'react-native';
import { Card, CardHeader, CardContent } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { TrafficLightBadge, type TrafficLightState } from '@/src/components/TrafficLightBadge';
import de from '@spatenstich/shared/i18n/de';

const t = (key: string): string =>
  key.split('.').reduce<any>((o, k) => (o ? o[k] : undefined), de as any) ?? key;

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
    case 'red':   return `${pct}% — niedrig`;
    default: return '';
  }
}

export interface DraftReviewCardProps {
  draft: { id: string; label: string; confidence?: number | null };
  onAccept: () => void;
  onDismiss: () => void;
  onEdit: () => void;
  isEditing?: boolean;
  details?: React.ReactNode;
  children?: React.ReactNode;
  testID?: string;
  /**
   * Phase 7 Plan 05 (Revision B3): when provided, the Annehmen Button emits
   * testID={`accept-button-${entityType}-${draft.id}`}. Opt-in — Phase 6.5
   * P04 review.tsx callers omit it and stay unchanged.
   */
  entityType?: 'bed' | 'plant' | 'observation';
}

export function DraftReviewCard({
  draft,
  onAccept,
  onDismiss,
  onEdit,
  isEditing = false,
  details,
  children,
  testID,
  entityType,
}: DraftReviewCardProps): React.JSX.Element {
  const confidence = draft.confidence ?? undefined;
  const state = confidenceToState(confidence);
  return (
    <Card className="mb-3" testID={testID ?? `draft-card-${draft.id}`}>
      <CardHeader>
        <View className="flex-row items-center justify-between">
          <View className="flex-1 mr-3">
            <Text className="text-base font-semibold text-stone-800 dark:text-stone-100">
              {draft.label}
            </Text>
          </View>
        </View>
        <TrafficLightBadge state={state} label={confidenceLabel(state, confidence)} />
      </CardHeader>
      {details ? <CardContent>{details}</CardContent> : null}
      {isEditing ? (
        <CardContent>{children}</CardContent>
      ) : (
        <CardContent>
          <View className="flex-row gap-2">
            <Button
              onPress={onAccept}
              variant="default"
              testID={entityType ? `accept-button-${entityType}-${draft.id}` : `accept-${draft.id}`}
            >
              <Text className="text-white font-semibold">{t('import.review.accept')}</Text>
            </Button>
            <Button onPress={onEdit} variant="outline" testID={`edit-${draft.id}`}>
              <Text className="font-semibold text-stone-700 dark:text-stone-200">{t('import.review.edit')}</Text>
            </Button>
            <Button onPress={onDismiss} variant="outline" testID={`dismiss-${draft.id}`}>
              <Text className="font-semibold text-stone-700 dark:text-stone-200">{t('import.review.dismiss')}</Text>
            </Button>
          </View>
        </CardContent>
      )}
    </Card>
  );
}
