// Phase 6.5 Plan 04: Import Sichtungs-Screen.
// Pattern: preview.tsx (Stack.Screen + sectioned ScrollView + sticky footer + i18n t() helper).
// Loads pending drafts + dimensions + existing elements, renders 3 sections,
// calls draftPromotionRepo on Annehmen/Verwerfen/Editieren, supports Auto-Promote.

import * as React from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Button } from '@/src/components/ui/button';
import { Switch } from '@/src/components/ui/switch';
import { DraftReviewCard } from '@/src/components/DraftReviewCard';
import { DraftEditForm, type DraftEditFormValues } from '@/src/components/DraftEditForm';
import { useAuthStore } from '@/src/stores/authStore';
import { useReviewSettingsStore } from '@/src/stores/reviewSettingsStore';
import { loadPendingDrafts } from '@/src/lib/importRepo';
import { loadDimensions, loadAcceptedElements } from '@/src/lib/gardenPlanRepo';
import {
  promoteBedDraft,
  promotePlantDraft,
  promoteObservationDraft,
  dismissDraft,
} from '@/src/lib/draftPromotionRepo';
import de from '@spatenstich/shared/i18n/de';
import type {
  BedDraftRow,
  PlantDraftRow,
  ObservationDraftRow,
  PlanElementRow,
  GardenDimensionsRow,
} from '@spatenstich/shared';

const t = (key: string): string =>
  key.split('.').reduce<any>((o, k) => (o ? o[k] : undefined), de as any) ?? key;

type Drafts = {
  beds: BedDraftRow[];
  plants: PlantDraftRow[];
  observations: ObservationDraftRow[];
};

export default function ImportReviewScreen(): React.JSX.Element {
  const router = useRouter();
  const mode = useAuthStore((s) => s.mode);
  const activeGardenId = useAuthStore((s) => s.activeGardenId);
  const autoPromote = useReviewSettingsStore((s) => s.autoPromote);
  const setAutoPromote = useReviewSettingsStore((s) => s.setAutoPromote);
  const threshold = useReviewSettingsStore((s) => s.autoPromoteThreshold);

  const [drafts, setDrafts] = React.useState<Drafts>({ beds: [], plants: [], observations: [] });
  const [dimensions, setDimensions] = React.useState<GardenDimensionsRow | null>(null);
  const [elements, setElements] = React.useState<PlanElementRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [promoteError, setPromoteError] = React.useState<string | null>(null);
  const [promoting, setPromoting] = React.useState(false);

  const refresh = React.useCallback(async () => {
    if (!activeGardenId) return;
    try {
      const [dims, elems, d] = await Promise.all([
        loadDimensions(activeGardenId),
        loadAcceptedElements(activeGardenId),
        loadPendingDrafts(activeGardenId),
      ]);
      setDimensions(dims);
      setElements(elems);
      setDrafts(d);
    } catch (err) {
      console.error('[review] load failed', err);
    }
  }, [activeGardenId]);

  React.useEffect(() => {
    (async () => {
      await refresh();
      setLoading(false);
    })();
  }, [refresh]);

  const handleAcceptBed = async (draft: BedDraftRow): Promise<void> => {
    if (!dimensions) return;
    setPromoteError(null);
    try {
      await promoteBedDraft(mode, draft, dimensions, elements, draft.importItemId);
      await refresh();
    } catch {
      setPromoteError(t('import.review.promoteError'));
    }
  };

  const handleAcceptPlant = async (draft: PlantDraftRow): Promise<void> => {
    setPromoteError(null);
    try {
      // Lookup parent bed plan_element by matching importedFrom against the draft's bedDraftId.
      const parent = draft.bedDraftId
        ? elements.find((e) => e.importedFrom === draft.bedDraftId && e.deletedAt === null) ?? null
        : null;
      await promotePlantDraft(mode, draft, parent, draft.importItemId);
      await refresh();
    } catch {
      setPromoteError(t('import.review.promoteError'));
    }
  };

  const handleAcceptObservation = async (draft: ObservationDraftRow): Promise<void> => {
    setPromoteError(null);
    try {
      await promoteObservationDraft(mode, draft, draft.importItemId);
      await refresh();
    } catch {
      setPromoteError(t('import.review.promoteError'));
    }
  };

  const handleDismiss = async (
    entity: 'bed_drafts' | 'plant_drafts' | 'observation_drafts',
    draft: BedDraftRow | PlantDraftRow | ObservationDraftRow,
  ): Promise<void> => {
    setPromoteError(null);
    try {
      await dismissDraft(mode, entity, draft);
      await refresh();
    } catch {
      setPromoteError(t('import.review.promoteError'));
    }
  };

  const handleEditSave = async (
    kind: 'bed' | 'plant' | 'observation',
    draft: BedDraftRow | PlantDraftRow | ObservationDraftRow,
    values: DraftEditFormValues,
  ): Promise<void> => {
    const merged = { ...draft, label: values.label } as any;
    if (kind === 'bed') {
      merged.lengthCm = values.lengthCm ?? null;
      merged.widthCm = values.widthCm ?? null;
    }
    // MVP: edit = edit-then-promote.
    if (kind === 'bed' && dimensions) {
      await handleAcceptBed(merged as BedDraftRow);
    } else if (kind === 'plant') {
      // Plant edit only changes label; persist by promoting with new label.
      const plantMerged = { ...draft, commonNameDe: values.label } as PlantDraftRow;
      await handleAcceptPlant(plantMerged);
    } else if (kind === 'observation') {
      const obsMerged = { ...draft, summary: values.label } as ObservationDraftRow;
      await handleAcceptObservation(obsMerged);
    }
    setEditingId(null);
  };

  const triggerAutoPromote = React.useCallback(async (): Promise<void> => {
    if (!dimensions) return;
    setPromoting(true);
    try {
      for (const bed of drafts.beds) {
        if ((bed.confidence ?? 0) >= threshold) {
          await promoteBedDraft(mode, bed, dimensions, elements, bed.importItemId);
        }
      }
      for (const plant of drafts.plants) {
        if ((plant.confidence ?? 0) >= threshold) {
          const parent = plant.bedDraftId
            ? elements.find((e) => e.importedFrom === plant.bedDraftId && e.deletedAt === null) ?? null
            : null;
          await promotePlantDraft(mode, plant, parent, plant.importItemId);
        }
      }
      for (const obs of drafts.observations) {
        if ((obs.confidence ?? 0) >= threshold) {
          await promoteObservationDraft(mode, obs, obs.importItemId);
        }
      }
      await refresh();
    } catch {
      setPromoteError(t('import.review.promoteError'));
    } finally {
      setPromoting(false);
    }
  }, [drafts, dimensions, elements, mode, threshold, refresh]);

  const handleToggleAutoPromote = (value: boolean): void => {
    setAutoPromote(value);
    if (value) void triggerAutoPromote();
  };

  const isEmpty =
    drafts.beds.length === 0 && drafts.plants.length === 0 && drafts.observations.length === 0;

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-stone-50 dark:bg-stone-900">
        <Stack.Screen options={{ headerTitle: t('import.review.title') }} />
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-stone-50 dark:bg-stone-900">
      <Stack.Screen options={{ headerTitle: t('import.review.title') }} />
      <ScrollView contentContainerClassName="p-4 pb-32">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-sm text-stone-700 dark:text-stone-300 flex-1 mr-3">
            {t('import.review.autoPromoteToggle')}
          </Text>
          <Switch
            value={autoPromote}
            onValueChange={handleToggleAutoPromote}
            testID="auto-promote-toggle"
          />
        </View>

        {promoting && (
          <View className="mb-3" testID="promoting-banner">
            <Text className="text-sm text-stone-600 dark:text-stone-400 italic">
              {t('import.review.promoting')}
            </Text>
          </View>
        )}

        {isEmpty && (
          <View className="items-center py-12">
            <Text
              className="text-base text-stone-500 dark:text-stone-400"
              testID="empty-state"
            >
              {t('import.review.emptyState')}
            </Text>
          </View>
        )}

        {drafts.beds.length > 0 && (
          <View className="mb-6">
            <Text className="text-base font-semibold text-stone-700 dark:text-stone-300 mb-2">
              {t('import.sections.beds')} ({drafts.beds.length})
            </Text>
            {drafts.beds.map((bed) => (
              <DraftReviewCard
                key={bed.id}
                draft={{ id: bed.id, label: bed.label, confidence: bed.confidence ?? undefined }}
                onAccept={() => void handleAcceptBed(bed)}
                onDismiss={() => void handleDismiss('bed_drafts', bed)}
                onEdit={() => setEditingId(bed.id)}
                isEditing={editingId === bed.id}
                testID={`bed-card-${bed.id}`}
              >
                {editingId === bed.id && (
                  <DraftEditForm
                    kind="bed"
                    initialValues={{
                      label: bed.label,
                      lengthCm: bed.lengthCm,
                      widthCm: bed.widthCm,
                    }}
                    onSave={(v) => void handleEditSave('bed', bed, v)}
                    onCancel={() => setEditingId(null)}
                  />
                )}
              </DraftReviewCard>
            ))}
          </View>
        )}

        {drafts.plants.length > 0 && (
          <View className="mb-6">
            <Text className="text-base font-semibold text-stone-700 dark:text-stone-300 mb-2">
              {t('import.sections.plants')} ({drafts.plants.length})
            </Text>
            {drafts.plants.map((plant) => (
              <DraftReviewCard
                key={plant.id}
                draft={{
                  id: plant.id,
                  label: plant.commonNameDe,
                  confidence: plant.confidence ?? undefined,
                }}
                onAccept={() => void handleAcceptPlant(plant)}
                onDismiss={() => void handleDismiss('plant_drafts', plant)}
                onEdit={() => setEditingId(plant.id)}
                isEditing={editingId === plant.id}
                testID={`plant-card-${plant.id}`}
              >
                {editingId === plant.id && (
                  <DraftEditForm
                    kind="plant"
                    initialValues={{ label: plant.commonNameDe }}
                    onSave={(v) => void handleEditSave('plant', plant, v)}
                    onCancel={() => setEditingId(null)}
                  />
                )}
              </DraftReviewCard>
            ))}
          </View>
        )}

        {drafts.observations.length > 0 && (
          <View className="mb-6">
            <Text className="text-base font-semibold text-stone-700 dark:text-stone-300 mb-2">
              {t('import.sections.observations')} ({drafts.observations.length})
            </Text>
            {drafts.observations.map((obs) => (
              <DraftReviewCard
                key={obs.id}
                draft={{
                  id: obs.id,
                  label: obs.summary,
                  confidence: obs.confidence ?? undefined,
                }}
                onAccept={() => void handleAcceptObservation(obs)}
                onDismiss={() => void handleDismiss('observation_drafts', obs)}
                onEdit={() => setEditingId(obs.id)}
                isEditing={editingId === obs.id}
                testID={`obs-card-${obs.id}`}
              >
                {editingId === obs.id && (
                  <DraftEditForm
                    kind="observation"
                    initialValues={{ label: obs.summary }}
                    onSave={(v) => void handleEditSave('observation', obs, v)}
                    onCancel={() => setEditingId(null)}
                  />
                )}
              </DraftReviewCard>
            ))}
          </View>
        )}
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 p-4 bg-stone-50 dark:bg-stone-900 border-t border-stone-200 dark:border-stone-700">
        {promoteError && (
          <View
            className="mb-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700"
            testID="promote-error-banner"
          >
            <Text className="text-amber-800 dark:text-amber-200 text-sm">{promoteError}</Text>
          </View>
        )}
        <Button
          onPress={() => router.replace('/(app)' as any)}
          variant="default"
          className="mb-2"
          testID="review-done-button"
        >
          <Text className="text-white font-semibold">{t('import.review.done')}</Text>
        </Button>
      </View>
    </View>
  );
}
