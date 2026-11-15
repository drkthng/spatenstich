// Findings of the photo checks (Phase 35): every open finding with how sure it is, what
// it proposes, and where on the plan it points. Each one is accepted, edited first, or
// dismissed on its own; nothing changes in the plan or the catalog before that
// (PHOTO-07). Findings are synced, so both members see the open ones (PHOTO-10).

import * as React from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import {
  PHOTO_MAX_CLOSEUP_PHOTOS,
  type GardenDimensionsRow,
  type PhotoFindingRow,
  type PlanElementRow,
} from '@spatenstich/shared';
import { useAuthStore } from '@/src/stores/authStore';
import { storage } from '@/src/storage';
import { usePlants, useSharedPlants } from '@/src/hooks/usePlants';
import { loadDimensions } from '@/src/lib/gardenPlanRepo';
import { useDataVersion } from '@/src/lib/sync/dataVersion';
import { canAccept, findingMark, isUncertain } from '@/src/lib/photo/findings';
import {
  acceptFinding,
  dismissFinding,
  loadFindings,
  runCloseup,
  updateProposal,
} from '@/src/lib/photo/photoRepo';
import {
  acceptLabel,
  confidenceLabel,
  editableFields,
  editValues,
  failureText,
  fieldLabel,
  isNumericField,
  kindLabel,
  markCaption,
  problemText,
  proposalLines,
  readEdit,
} from '@/src/lib/photo/findingText';
import { FindingPlanMark } from '@/src/components/photo/FindingPlanMark';
import { memberName } from '@/src/components/SyncToastHost';
import { formatMoment } from '@/src/lib/ai/aiMessages';
import { tokens } from '@/src/theme/tokens';
import { t } from '@/src/lib/i18n';

interface Notice {
  text: string;
  tone: 'ok' | 'warn';
}

interface Editing {
  id: string;
  values: Record<string, string>;
  invalid: boolean;
}

export default function FindingsScreen(): React.JSX.Element {
  const router = useRouter();
  const mode = useAuthStore((s) => s.mode);
  const gardenId = useAuthStore((s) => s.activeGardenId);
  const { data: plants = [] } = usePlants();
  const { data: sharedCatalog = [] } = useSharedPlants();
  const version = useDataVersion('photo_findings', 'plan_elements', 'garden_plants', 'garden_dimensions');

  const [findings, setFindings] = React.useState<PhotoFindingRow[]>([]);
  const [elements, setElements] = React.useState<PlanElementRow[]>([]);
  const [dims, setDims] = React.useState<GardenDimensionsRow | null>(null);
  const [names, setNames] = React.useState<Record<string, string>>({});
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<Notice | null>(null);
  const [editing, setEditing] = React.useState<Editing | null>(null);
  const closeupInput = React.useRef<HTMLInputElement | null>(null);
  const closeupFor = React.useRef<PhotoFindingRow | null>(null);

  React.useEffect(() => {
    let alive = true;
    if (mode !== 'account' || !gardenId) {
      setLoading(false);
      return;
    }
    void (async () => {
      const [rows, plan, size] = await Promise.all([
        loadFindings(gardenId),
        storage.getRowsByGarden<PlanElementRow>('plan_elements', gardenId),
        loadDimensions(gardenId),
      ]);
      if (!alive) return;
      setFindings(rows);
      setElements(plan);
      setDims(size);
      setLoading(false);
      const found: Record<string, string> = {};
      for (const userId of new Set(rows.map((row) => row.createdByUserId).filter(Boolean) as string[])) {
        found[userId] = await memberName(userId);
      }
      if (alive) setNames(found);
    })();
    return () => {
      alive = false;
    };
  }, [mode, gardenId, version]);

  const accept = async (finding: PhotoFindingRow): Promise<void> => {
    setBusy(finding.id);
    try {
      const outcome = await acceptFinding(finding, sharedCatalog);
      if (!outcome.ok) {
        setNotice({ text: problemText(outcome.problem), tone: 'warn' });
      } else if (outcome.gardenPlant) {
        setNotice({ text: t('photo.findings.done.catalog', { name: outcome.gardenPlant.nameDe }), tone: 'ok' });
      } else if (outcome.task) {
        setNotice({ text: t('photo.findings.done.task'), tone: 'ok' });
      } else {
        setNotice({ text: t('photo.findings.done.plan'), tone: 'ok' });
      }
    } catch {
      setNotice({ text: problemText('failed'), tone: 'warn' });
    }
    setBusy(null);
  };

  const dismiss = async (finding: PhotoFindingRow): Promise<void> => {
    setBusy(finding.id);
    try {
      const done = await dismissFinding(finding);
      setNotice(done ? { text: t('photo.findings.done.dismissed'), tone: 'ok' } : { text: problemText('failed'), tone: 'warn' });
    } catch {
      setNotice({ text: problemText('failed'), tone: 'warn' });
    }
    setBusy(null);
  };

  const saveEdit = async (finding: PhotoFindingRow): Promise<void> => {
    if (!editing) return;
    const proposal = readEdit(finding, editing.values);
    if (!proposal) {
      setEditing({ ...editing, invalid: true });
      return;
    }
    setBusy(finding.id);
    try {
      await updateProposal(finding, proposal);
      setEditing(null);
    } catch {
      setNotice({ text: problemText('failed'), tone: 'warn' });
    }
    setBusy(null);
  };

  const sendCloseup = async (files: FileList | null): Promise<void> => {
    const finding = closeupFor.current;
    closeupFor.current = null;
    if (!finding || !files || files.length === 0) return;
    setBusy(finding.id);
    setNotice({ text: t('photo.findings.closeupRunning'), tone: 'ok' });
    const outcome = await runCloseup(finding, Array.from(files).slice(0, PHOTO_MAX_CLOSEUP_PHOTOS), sharedCatalog);
    setNotice(
      outcome.ok
        ? { text: t('photo.findings.closeupDone'), tone: 'ok' }
        : { text: failureText(outcome.code), tone: 'warn' },
    );
    setBusy(null);
  };

  if (mode !== 'account' || !gardenId) {
    return (
      <View className="flex-1 bg-bg px-4 pt-6" testID="findings-screen">
        <Stack.Screen options={{ headerTitle: t('photo.findings.title') }} />
        <Text className="font-body text-base text-ink">{t('photo.accountOnly')}</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <Stack.Screen options={{ headerTitle: t('photo.findings.title') }} />
        <ActivityIndicator color={tokens.color.primary} />
      </View>
    );
  }

  // One group per check, newest first (loadFindings sorts that way).
  const groups: { checkId: string; rows: PhotoFindingRow[] }[] = [];
  for (const row of findings) {
    const group = groups.find((g) => g.checkId === row.checkId);
    if (group) group.rows.push(row);
    else groups.push({ checkId: row.checkId, rows: [row] });
  }

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerClassName="px-4 pt-4 pb-12" testID="findings-screen">
      <Stack.Screen options={{ headerTitle: t('photo.findings.title') }} />
      <Text className="font-body text-sm text-ink-muted">{t('photo.findings.intro')}</Text>

      <input
        ref={closeupInput}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        data-testid="findings-closeup-input"
        onChange={(e) => {
          const files = e.currentTarget.files;
          void sendCloseup(files);
          e.currentTarget.value = '';
        }}
      />

      {notice ? (
        <View
          className={`mt-3 p-3 border border-line ${notice.tone === 'ok' ? 'bg-ok-soft' : 'bg-warn-soft'}`}
          testID="findings-notice"
          accessibilityLiveRegion="polite"
        >
          <Text className="font-body text-sm text-ink">{notice.text}</Text>
        </View>
      ) : null}

      {findings.length === 0 ? (
        <View className="mt-6" testID="findings-empty">
          <Text className="font-display text-lg text-ink">{t('photo.findings.empty')}</Text>
          <Text className="font-body text-sm text-ink-muted mt-1">{t('photo.findings.emptyHint')}</Text>
        </View>
      ) : null}

      {groups.map((group) => {
        const first = group.rows[group.rows.length - 1]!;
        const date = formatMoment(first.createdAt);
        const by = first.createdByUserId ? names[first.createdByUserId] : undefined;
        return (
          <View key={group.checkId} className="mt-6" testID={`findings-check-${group.checkId}`}>
            <Text className="font-body text-xs uppercase text-ink-muted">
              {by ? t('photo.findings.checkBy', { date, name: by }) : t('photo.findings.checkFrom', { date })}
            </Text>
            {group.rows.map((finding) => {
              const mark = findingMark(finding, elements);
              const lines = proposalLines(finding, elements, plants);
              const uncertain = isUncertain(finding);
              const isBusy = busy === finding.id;
              const fields = editableFields(finding);
              const isEditing = editing?.id === finding.id;
              return (
                <View
                  key={finding.id}
                  className="mt-3 p-3 border border-line bg-surface"
                  testID={`finding-${finding.id}`}
                >
                  <View className="flex-row flex-wrap items-center gap-2">
                    <Text className="font-body text-xs uppercase text-ink-muted" testID={`finding-kind-${finding.id}`}>
                      {kindLabel(finding)}
                    </Text>
                    {uncertain ? (
                      <Text
                        className="font-body text-xs text-ink px-2 py-[2px] bg-warn-soft border border-line"
                        testID={`finding-uncertain-${finding.id}`}
                      >
                        {t('photo.findings.uncertain')}
                      </Text>
                    ) : null}
                  </View>
                  <Text className="font-display text-lg text-ink mt-1">{finding.title}</Text>
                  {finding.detail ? <Text className="font-body text-sm text-ink mt-1">{finding.detail}</Text> : null}
                  <Text className="font-body text-xs text-ink-muted mt-1" testID={`finding-confidence-${finding.id}`}>
                    {confidenceLabel(finding.confidence)}
                  </Text>

                  {lines.map((line, index) => (
                    <Text
                      key={index}
                      className="font-body text-sm text-ink mt-2"
                      testID={index === 0 ? `finding-proposal-${finding.id}` : undefined}
                    >
                      {line}
                    </Text>
                  ))}

                  {dims && mark.type !== 'none' ? (
                    <View className="mt-3 border border-line">
                      <FindingPlanMark
                        dimensions={dims}
                        elements={elements}
                        mark={mark}
                        label={markCaption(mark, elements)}
                        testID={`finding-mark-${finding.id}`}
                      />
                      <Text className="font-body text-xs text-ink-muted px-2 py-1">{markCaption(mark, elements)}</Text>
                    </View>
                  ) : null}

                  {finding.closeupOf ? (
                    <View className="mt-3 p-2 bg-warn-soft border border-line" testID={`finding-closeup-${finding.id}`}>
                      <Text className="font-body text-sm text-ink">
                        {t('photo.findings.closeupAsk', { what: finding.closeupOf })}
                      </Text>
                      <Pressable
                        onPress={() => {
                          closeupFor.current = finding;
                          closeupInput.current?.click();
                        }}
                        disabled={isBusy}
                        accessibilityRole="button"
                        className={`self-start mt-2 min-h-[44px] px-3 items-center justify-center bg-primary ${isBusy ? 'opacity-50' : ''}`}
                        testID={`finding-closeup-button-${finding.id}`}
                      >
                        <Text className="font-body text-sm text-on-primary">{t('photo.findings.closeupButton')}</Text>
                      </Pressable>
                    </View>
                  ) : null}

                  {isEditing && editing ? (
                    <View className="mt-3" testID={`finding-edit-${finding.id}`}>
                      {fields.map((field) => (
                        <View key={field} className="mt-2">
                          <Text className="font-body text-xs text-ink-muted mb-1">{fieldLabel(field)}</Text>
                          <TextInput
                            value={editing.values[field] ?? ''}
                            onChangeText={(text) =>
                              setEditing({ ...editing, invalid: false, values: { ...editing.values, [field]: text } })
                            }
                            inputMode={isNumericField(field) ? 'decimal' : 'text'}
                            accessibilityLabel={fieldLabel(field)}
                            className="min-h-[44px] px-3 py-2 border border-line bg-bg font-body text-base text-ink"
                            testID={`finding-field-${field}-${finding.id}`}
                          />
                        </View>
                      ))}
                      {editing.invalid ? (
                        <Text className="font-body text-sm text-danger mt-2" testID={`finding-edit-invalid-${finding.id}`}>
                          {t('photo.findings.editInvalid')}
                        </Text>
                      ) : null}
                      <View className="flex-row flex-wrap gap-2 mt-3">
                        <Pressable
                          onPress={() => void saveEdit(finding)}
                          disabled={isBusy}
                          accessibilityRole="button"
                          className="min-h-[44px] px-4 items-center justify-center bg-primary"
                          testID={`finding-edit-save-${finding.id}`}
                        >
                          <Text className="font-body text-sm text-on-primary">{t('photo.findings.editSave')}</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => setEditing(null)}
                          accessibilityRole="button"
                          className="min-h-[44px] px-4 items-center justify-center border border-line"
                          testID={`finding-edit-cancel-${finding.id}`}
                        >
                          <Text className="font-body text-sm text-ink">{t('photo.findings.editCancel')}</Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <View className="flex-row flex-wrap gap-2 mt-3">
                      {canAccept(finding) ? (
                        <Pressable
                          onPress={() => void accept(finding)}
                          disabled={isBusy}
                          accessibilityRole="button"
                          className={`min-h-[44px] px-4 items-center justify-center bg-primary ${isBusy ? 'opacity-50' : ''}`}
                          testID={`finding-accept-${finding.id}`}
                        >
                          <Text className="font-body text-sm text-on-primary">{acceptLabel(finding)}</Text>
                        </Pressable>
                      ) : null}
                      {fields.length > 0 ? (
                        <Pressable
                          onPress={() => setEditing({ id: finding.id, values: editValues(finding), invalid: false })}
                          disabled={isBusy}
                          accessibilityRole="button"
                          className="min-h-[44px] px-4 items-center justify-center border border-line"
                          testID={`finding-edit-button-${finding.id}`}
                        >
                          <Text className="font-body text-sm text-ink">{t('photo.findings.edit')}</Text>
                        </Pressable>
                      ) : null}
                      <Pressable
                        onPress={() => void dismiss(finding)}
                        disabled={isBusy}
                        accessibilityRole="button"
                        className={`min-h-[44px] px-4 items-center justify-center border border-line ${isBusy ? 'opacity-50' : ''}`}
                        testID={`finding-dismiss-${finding.id}`}
                      >
                        <Text className="font-body text-sm text-ink">{t('photo.findings.dismiss')}</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        );
      })}

      <Pressable
        onPress={() => router.push('/(app)/foto' as never)}
        accessibilityRole="button"
        className="self-start mt-8 min-h-[48px] px-4 items-center justify-center border border-line"
        testID="findings-new-check"
      >
        <Text className="font-body text-base text-ink">{t('photo.findings.newCheck')}</Text>
      </Pressable>
    </ScrollView>
  );
}
