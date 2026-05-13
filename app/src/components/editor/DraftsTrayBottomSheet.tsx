// Phase 7 Plan 05: Drafts tray bottom-sheet — reuses Phase 6.5 DraftReviewCard.
// DRAFT-01 (tray render), DRAFT-02 (bed-drag handoff), DRAFT-03 (stale-badge + filter).
// Implementation: minimal expand/collapse (full reanimated 50/90 snap deferred — see plan discretion notes).
// RESEARCH §Code Examples §7-§9; UI-SPEC §DraftsTrayBottomSheet + §Filter-chips + §Stale draft card.

import * as React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import type {
  GardenDimensionsRow,
  BedDraftRow,
  PlantDraftRow,
  ObservationDraftRow,
  PlanElementRow,
} from '@spatenstich/shared';
import { DraftReviewCard } from '@/src/components/DraftReviewCard';
import { TrafficLightBadge } from '@/src/components/TrafficLightBadge';
import { loadPendingDraftsWithImportedAt, type DraftWithMeta } from '@/src/lib/importRepo';
import { promotePlantDraft, dismissDraft } from '@/src/lib/draftPromotionRepo';
import { useAuthStore } from '@/src/stores/authStore';
import { useEditorStore } from '@/src/stores/editorStore';
import { BedPickerModal } from './BedPickerModal';
import de from '@spatenstich/shared/i18n/de';

const t = (key: string, vars?: Record<string, string | number>): string => {
  const raw = key.split('.').reduce<any>((o, k) => (o ? o[k] : undefined), de as any) ?? key;
  if (typeof raw !== 'string' || !vars) return String(raw);
  return Object.entries(vars).reduce((acc, [k, v]) => acc.replace(`{${k}}`, String(v)), raw);
};

const STALE_MS = 30 * 24 * 60 * 60 * 1000;
function isStale(importedAt: string): boolean {
  return Date.now() - new Date(importedAt).getTime() > STALE_MS;
}

type FilterMode = 'all' | 'fresh' | 'stale';

export interface DraftsTrayBottomSheetProps {
  gardenId: string;
  dims: GardenDimensionsRow;
  onBedDraftDragStart?: (payload: { draftId: string; importItemId: string }) => void;
}

export function DraftsTrayBottomSheet({
  gardenId,
  dims: _dims,
  onBedDraftDragStart,
}: DraftsTrayBottomSheetProps): React.JSX.Element | null {
  const mode = useAuthStore((s) => s.mode);
  const elements = useEditorStore((s) => s.elements);

  const [beds, setBeds] = React.useState<DraftWithMeta<BedDraftRow>[]>([]);
  const [plants, setPlants] = React.useState<DraftWithMeta<PlantDraftRow>[]>([]);
  const [observations, setObservations] = React.useState<DraftWithMeta<ObservationDraftRow>[]>([]);
  const [filter, setFilter] = React.useState<FilterMode>('all');
  const [expanded, setExpanded] = React.useState(false);
  const [pickerForPlantDraft, setPickerForPlantDraft] = React.useState<PlantDraftRow | null>(null);

  const reload = React.useCallback(async () => {
    if (!gardenId) return;
    const { beds: b, plants: p, observations: o } = await loadPendingDraftsWithImportedAt(gardenId);
    setBeds(b);
    setPlants(p);
    setObservations(o);
  }, [gardenId]);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  const passes = React.useCallback(
    (d: { importedAt: string }) => {
      if (filter === 'all') return true;
      const stale = isStale(d.importedAt);
      return filter === 'stale' ? stale : !stale;
    },
    [filter],
  );

  const fBeds = beds.filter(passes);
  const fPlants = plants.filter(passes);
  const fObs = observations.filter(passes);
  const totalAll = beds.length + plants.length + observations.length;
  const totalFiltered = fBeds.length + fPlants.length + fObs.length;

  // Hidden when no drafts at all (UI-SPEC §Bottom-sheet snap points → Hidden = 0)
  if (totalAll === 0) return null;

  const beetElements = elements.filter(
    (e) => e.elementType === 'Beet' && e.deletedAt === null,
  );

  const handleBedAccept = (d: DraftWithMeta<BedDraftRow>): void => {
    // Accessibility / fallback path (CONTEXT D-18): a tap on the Annehmen button
    // signals drag intent. The real drag flow is the LongPress + screen-root Pan
    // in plan/index.tsx; parent screen wires onBedDraftDragStart to flip the
    // shared dragging value.
    if (onBedDraftDragStart) {
      onBedDraftDragStart({ draftId: d.row.id, importItemId: d.row.importItemId });
    }
  };

  const handleBedDismiss = async (d: DraftWithMeta<BedDraftRow>): Promise<void> => {
    await dismissDraft(mode, 'bed_drafts', d.row);
    await reload();
  };

  const handlePlantAccept = (d: DraftWithMeta<PlantDraftRow>): void => {
    setPickerForPlantDraft(d.row);
  };

  const handlePlantDismiss = async (d: DraftWithMeta<PlantDraftRow>): Promise<void> => {
    await dismissDraft(mode, 'plant_drafts', d.row);
    await reload();
  };

  const handleObsDismiss = async (d: DraftWithMeta<ObservationDraftRow>): Promise<void> => {
    await dismissDraft(mode, 'observation_drafts', d.row);
    await reload();
  };

  const handlePickerPick = async (bed: PlanElementRow): Promise<void> => {
    if (!pickerForPlantDraft) return;
    try {
      await promotePlantDraft(mode, pickerForPlantDraft, bed, pickerForPlantDraft.importItemId);
    } finally {
      setPickerForPlantDraft(null);
      await reload();
    }
  };

  const handlePickerCancel = (): void => setPickerForPlantDraft(null);

  // Collapsed: chip only
  if (!expanded) {
    return (
      <View testID="drafts-tray-collapsed" className="absolute bottom-2 left-2">
        <Pressable
          testID="drafts-tray-chip"
          onPress={() => setExpanded(true)}
          className="px-3 py-2 rounded-full bg-stone-50 dark:bg-stone-900 border border-[#4A7C59]"
          accessibilityLabel={t('editor.tray.title')}
        >
          <Text className="text-xs font-semibold text-stone-700 dark:text-stone-200">
            {t('editor.trayChip', { count: totalAll })}
          </Text>
        </Pressable>
      </View>
    );
  }

  // Expanded: half-height tray with handle + filters + sectioned list
  return (
    <View
      testID="drafts-tray-expanded"
      className="absolute left-0 right-0 bottom-0 bg-stone-50 dark:bg-stone-900 border-t border-stone-200 dark:border-stone-700"
      style={{ maxHeight: '50%' }}
    >
      <Pressable
        testID="drafts-tray-handle"
        onPress={() => setExpanded(false)}
        className="items-center py-3"
        accessibilityLabel={t('editor.tray.title')}
      >
        <View className="w-10 h-1 rounded-full bg-stone-300 dark:bg-stone-600" />
        <Text className="mt-2 text-lg font-semibold text-stone-700 dark:text-stone-200">
          {t('editor.tray.title')}
        </Text>
      </Pressable>

      <View className="flex-row px-4 pb-2" testID="drafts-tray-filters">
        {(['all', 'fresh', 'stale'] as FilterMode[]).map((f) => {
          const isActive = filter === f;
          const activeBg = f === 'stale' ? 'bg-[#D97706]' : 'bg-[#4A7C59]';
          const label =
            f === 'all'
              ? t('editor.tray.filterAll')
              : f === 'fresh'
                ? t('editor.tray.filterFresh')
                : t('editor.tray.filterStale');
          return (
            <Pressable
              key={f}
              testID={`drafts-tray-filter-${f}`}
              onPress={() => setFilter(f)}
              className={`mr-2 px-3 py-1.5 rounded-full ${
                isActive ? activeBg : 'bg-stone-200 dark:bg-stone-700'
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  isActive ? 'text-white' : 'text-stone-700 dark:text-stone-200'
                }`}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView className="px-4 pb-4">
        {totalFiltered === 0 ? (
          <Text
            testID="drafts-tray-empty"
            className="text-sm text-stone-500 dark:text-stone-400 py-4 text-center"
          >
            {t('editor.tray.empty')}
          </Text>
        ) : (
          <>
            {fBeds.length > 0 && (
              <View className="mb-3">
                <Text className="text-sm font-semibold mb-2 text-stone-700 dark:text-stone-200">
                  {t('editor.palette.tabBeete')} ({fBeds.length})
                </Text>
                {fBeds.map((d) => (
                  <DraftReviewCard
                    key={d.row.id}
                    testID={`drafts-tray-card-bed-${d.row.id}`}
                    /* Revision B3: pass entityType so the Annehmen button gets `accept-button-bed-${id}` */
                    entityType="bed"
                    draft={{ id: d.row.id, label: d.row.label, confidence: d.row.confidence }}
                    onAccept={() => handleBedAccept(d)}
                    onDismiss={() => {
                      void handleBedDismiss(d);
                    }}
                    onEdit={() => {}}
                    details={
                      isStale(d.importedAt) ? (
                        <TrafficLightBadge state="amber" label={t('editor.tray.staleBadge')} />
                      ) : null
                    }
                  />
                ))}
              </View>
            )}

            {fPlants.length > 0 && (
              <View className="mb-3">
                <Text className="text-sm font-semibold mb-2 text-stone-700 dark:text-stone-200">
                  {t('editor.palette.tabPflanzen')} ({fPlants.length})
                </Text>
                {fPlants.map((d) => (
                  <DraftReviewCard
                    key={d.row.id}
                    testID={`drafts-tray-card-plant-${d.row.id}`}
                    /* Revision B3: pass entityType so the Annehmen button gets `accept-button-plant-${id}` */
                    entityType="plant"
                    draft={{ id: d.row.id, label: d.row.commonNameDe, confidence: d.row.confidence }}
                    onAccept={() => handlePlantAccept(d)}
                    onDismiss={() => {
                      void handlePlantDismiss(d);
                    }}
                    onEdit={() => {}}
                    details={
                      isStale(d.importedAt) ? (
                        <TrafficLightBadge state="amber" label={t('editor.tray.staleBadge')} />
                      ) : null
                    }
                  />
                ))}
              </View>
            )}

            {fObs.length > 0 && (
              <View className="mb-3">
                <Text className="text-sm font-semibold mb-2 text-stone-700 dark:text-stone-200">
                  {t('import.sections.observations') ?? 'Beobachtungen'} ({fObs.length})
                </Text>
                {fObs.map((d) => (
                  <DraftReviewCard
                    key={d.row.id}
                    testID={`drafts-tray-card-observation-${d.row.id}`}
                    /* Revision B3: pass entityType for testID consistency (observation has no Annehmen wiring) */
                    entityType="observation"
                    draft={{ id: d.row.id, label: d.row.summary, confidence: d.row.confidence }}
                    onAccept={() => {}}
                    onDismiss={() => {
                      void handleObsDismiss(d);
                    }}
                    onEdit={() => {}}
                    details={
                      isStale(d.importedAt) ? (
                        <TrafficLightBadge state="amber" label={t('editor.tray.staleBadge')} />
                      ) : null
                    }
                  />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      <BedPickerModal
        visible={pickerForPlantDraft !== null}
        beds={beetElements}
        onPick={(bed) => {
          void handlePickerPick(bed);
        }}
        onCancel={handlePickerCancel}
      />
    </View>
  );
}
