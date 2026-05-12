// Import Preview Screen — Phase 6 Plan 06-03.
// Shows validated ImportPayload as sectioned entity cards with confidence chips + toggles.
// D-11: entities with confidence < 0.6 default OFF; red + selected shows warning in card.
// D-13: compliance section always shown but grayed (opacity-50) — future version placeholder.
// Pitfall 1: payload read from importStore (Zustand), NOT navigation params.
// Confirm: calls saveImport(mode, gardenId, payload, selected), then resets store + goes Home.
import * as React from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Button } from '@/src/components/ui/button';
import { InlineBanner } from '@/src/components/InlineBanner';
import { ImportEntityCard } from '@/src/components/ImportEntityCard';
import { useImportStore } from '@/src/stores/importStore';
import { saveImport } from '@/src/lib/importRepo';
import { useAuthStore } from '@/src/stores/authStore';
import de from '@spatenstich/shared/i18n/de';
import type { ImportPayload } from '@spatenstich/shared';

const t = (key: string): string =>
  key.split('.').reduce<any>((o, k) => (o ? o[k] : undefined), de as any) ?? key;

export default function ImportPreviewScreen(): React.JSX.Element {
  const router = useRouter();
  const payload = useImportStore((s) => s.payload);
  const resetImport = useImportStore((s) => s.reset);
  const mode = useAuthStore((s) => s.mode);
  const activeGardenId = useAuthStore((s) => s.activeGardenId);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  // D-11: Initialize selection — ON for confidence >= 0.6, OFF for < 0.6
  React.useEffect(() => {
    if (!payload) return;
    const initial = new Set<string>();
    const allEntities = [
      ...(payload.beds ?? []),
      ...(payload.plants ?? []),
      ...(payload.observations ?? []),
    ];
    allEntities.forEach((e) => {
      if (((e as any).confidence ?? 1) >= 0.6) initial.add(e.localId);
    });
    setSelected(initial);
  }, [payload]);

  const handleToggle = (localId: string, value: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (value) next.add(localId); else next.delete(localId);
      return next;
    });
  };

  const handleConfirm = async () => {
    if (!payload || !activeGardenId) return;
    setSaving(true);
    setSaveError(null);
    try {
      await saveImport(mode, activeGardenId, payload, selected);
      resetImport();
      router.replace('/(app)' as any);
    } catch {
      setSaveError(t('import.saveError'));
    } finally {
      setSaving(false);
    }
  };

  if (!payload) {
    return (
      <View className="flex-1 items-center justify-center bg-stone-50 dark:bg-stone-900">
        <Stack.Screen options={{ headerTitle: t('import.preview.title') }} />
        <Text className="text-stone-500">{t('import.noPayload')}</Text>
      </View>
    );
  }

  const beds = payload.beds ?? [];
  const plants = payload.plants ?? [];
  const observations = payload.observations ?? [];
  const hasCompliance = ((payload as any).complianceFlags ?? []).length > 0;
  const selectedCount = selected.size;

  return (
    <View className="flex-1 bg-stone-50 dark:bg-stone-900">
      <Stack.Screen options={{ headerTitle: t('import.preview.title') }} />
      <ScrollView contentContainerClassName="p-4 pb-32">
        {/* Source info */}
        <Text className="text-sm text-stone-400 mb-4">
          {t('import.preview.source')} · {new Date(payload.capture.timestamp).toLocaleDateString('de-DE')}
        </Text>

        {/* Section: Beete */}
        {beds.length > 0 && (
          <View className="mb-6">
            <Text className="text-base font-semibold text-stone-700 dark:text-stone-300 mb-2">
              {t('import.sections.beds')} ({beds.length})
            </Text>
            {beds.map((bed) => (
              <ImportEntityCard
                key={bed.localId}
                entity={{
                  localId: bed.localId,
                  label: bed.label,
                  confidence: bed.confidence,
                }}
                isSelected={selected.has(bed.localId)}
                onToggle={handleToggle}
                details={
                  bed.approxDimensions ? (
                    <Text className="text-sm text-stone-500">
                      {(bed.approxDimensions.lengthCm / 100).toFixed(1)} × {(bed.approxDimensions.widthCm / 100).toFixed(1)} m
                    </Text>
                  ) : null
                }
                testID={`bed-card-${bed.localId}`}
              />
            ))}
          </View>
        )}

        {/* Section: Pflanzen */}
        {plants.length > 0 && (
          <View className="mb-6">
            <Text className="text-base font-semibold text-stone-700 dark:text-stone-300 mb-2">
              {t('import.sections.plants')} ({plants.length})
            </Text>
            {plants.map((plant) => (
              <ImportEntityCard
                key={plant.localId}
                entity={{
                  localId: plant.localId,
                  label: plant.commonNameDe,
                  confidence: plant.confidence,
                }}
                isSelected={selected.has(plant.localId)}
                onToggle={handleToggle}
                details={
                  <Text className="text-sm text-stone-500">
                    {plant.scientificName ? `${plant.scientificName} · ` : ''}{plant.stageEstimate ?? ''}
                  </Text>
                }
                testID={`plant-card-${plant.localId}`}
              />
            ))}
          </View>
        )}

        {/* Section: Beobachtungen */}
        {observations.length > 0 && (
          <View className="mb-6">
            <Text className="text-base font-semibold text-stone-700 dark:text-stone-300 mb-2">
              {t('import.sections.observations')} ({observations.length})
            </Text>
            {observations.map((obs) => (
              <ImportEntityCard
                key={obs.localId}
                entity={{
                  localId: obs.localId,
                  label: obs.summary,
                  confidence: obs.confidence,
                }}
                isSelected={selected.has(obs.localId)}
                onToggle={handleToggle}
                details={
                  obs.suggestedActions?.length ? (
                    <Text className="text-sm text-stone-500">
                      {obs.suggestedActions.join(', ')}
                    </Text>
                  ) : null
                }
                testID={`obs-card-${obs.localId}`}
              />
            ))}
          </View>
        )}

        {/* Section: Regelprüfung — grayed out per D-13 */}
        {hasCompliance && (
          <View className="mb-6 opacity-50">
            <Text className="text-base font-semibold text-stone-700 dark:text-stone-300 mb-2">
              {t('import.sections.compliance')}
            </Text>
            <Text className="text-sm text-stone-400 italic">
              {t('import.sections.complianceHint')}
            </Text>
          </View>
        )}

        {/* Section: Freitext-Notizen */}
        {(payload as any).freeFormNotes && (
          <View className="mb-6">
            <Text className="text-base font-semibold text-stone-700 dark:text-stone-300 mb-2">
              {t('import.sections.notes')}
            </Text>
            <Text className="text-sm text-stone-600 dark:text-stone-400">
              {(payload as any).freeFormNotes}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Sticky footer with confirm + cancel buttons */}
      <View className="absolute bottom-0 left-0 right-0 p-4 bg-stone-50 dark:bg-stone-900 border-t border-stone-200 dark:border-stone-700">
        {saveError && (
          <InlineBanner message={saveError} variant="warning" testID="save-error-banner" />
        )}
        <Button
          onPress={handleConfirm}
          variant="default"
          disabled={selectedCount === 0 || saving}
          className="mb-2"
          testID="import-confirm-button"
        >
          {saving ? <ActivityIndicator size="small" color="#fff" /> : null}
          <Text className="text-white font-semibold">
            {saving ? t('import.saving') : t('import.confirmButton')}
          </Text>
        </Button>
        <Button
          onPress={() => router.back()}
          variant="outline"
          testID="import-cancel-button"
        >
          <Text className="font-semibold text-stone-700 dark:text-stone-200">
            {t('import.cancelButton')}
          </Text>
        </Button>
      </View>
    </View>
  );
}
