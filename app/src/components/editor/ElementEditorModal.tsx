// Phase 09.1 Plan 02: Element editor modal shell (D-09/D-16/D-17/D-18/D-21).
// Pattern: BedPickerModal.tsx (RN <Modal> + Card + Buttons).
// D-21 Column-Discipline: `label` is a dedicated top-level column — NEVER written to provenance.
// D-17: Footer: destructive Löschen / ghost Abbrechen / default Speichern.
// D-18: ESC (Web) clears without confirm — Undo (Ctrl+Z) recovers. onRequestClose for Android Back.
// Security: maxLength on note delegated to ElementEditorMoreFields (T-09.1-DOS-NOTE).
// Pattern S5: ESC keydown listener with INPUT/TEXTAREA guard (T-09.1-MODAL-ESC).

import * as React from 'react';
import { View, Text, Modal, ScrollView, Platform, TextInput } from 'react-native';
import type { PlanElementRow } from '@spatenstich/shared';
import { Button } from '@/src/components/ui/button';
import { useEditorStore } from '@/src/stores/editorStore';
import { ZOrderButtons } from './ZOrderButtons';
import { ElementEditorMoreFields } from './ElementEditorMoreFields';
import de from '@spatenstich/shared/i18n/de';

const t = (key: string): string =>
  key.split('.').reduce<any>((o, k) => (o ? o[k] : undefined), de as any) ?? key;

export interface ElementEditorModalProps {
  visible: boolean;
  element: PlanElementRow;
  onSave: (patch: Partial<PlanElementRow>) => void;
  onCancel: () => void;
  onDelete: () => void;
}

export function ElementEditorModal({
  visible,
  element,
  onSave,
  onCancel,
  onDelete,
}: ElementEditorModalProps): React.JSX.Element | null {
  // Local form state — NOT in zundo history (transient per D-18/D-22)
  const [labelField, setLabelField] = React.useState('');
  const [widthCm, setWidthCm] = React.useState('');
  const [heightCm, setHeightCm] = React.useState('');
  const [rotationDeg, setRotationDeg] = React.useState('');
  const [moreExpanded, setMoreExpanded] = React.useState(false);
  const [note, setNote] = React.useState('');
  const [plantedAt, setPlantedAt] = React.useState<string | null>(null);
  const [accentColor, setAccentColor] = React.useState<string | null>(null);

  // Initialize form from element when modal becomes visible
  React.useEffect(() => {
    if (!visible) return;
    const prov = (element.provenance ?? {}) as Record<string, unknown>;
    setLabelField(element.label ?? '');
    setWidthCm(String(Math.round((element.widthM ?? 1) * 100)));
    setHeightCm(String(Math.round((element.heightM ?? 1) * 100)));
    setRotationDeg(String(typeof prov.rotateDeg === 'number' ? prov.rotateDeg : 0));
    setNote(typeof prov.note === 'string' ? prov.note : '');
    setPlantedAt(typeof prov.plantedAt === 'string' ? prov.plantedAt : null);
    setAccentColor(typeof prov.accentColor === 'string' ? prov.accentColor : null);
    setMoreExpanded(false);
  }, [visible, element]);

  // Web: ESC key listener (Pattern S5 + D-18)
  React.useEffect(() => {
    if (Platform.OS !== 'web' || !visible) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      // Don't hijack typing in inputs (Pattern S5 / T-09.1-MODAL-ESC)
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, onCancel]);

  if (!visible) return null;

  const handleSave = () => {
    // Parse + clamp numeric values
    const parsedWidthCm = Number(widthCm);
    const parsedHeightCm = Number(heightCm);
    const parsedRotation = Number(rotationDeg);

    const clampedWidthCm = Number.isFinite(parsedWidthCm)
      ? Math.max(5, Math.min(500, parsedWidthCm))
      : 100;
    const clampedHeightCm = Number.isFinite(parsedHeightCm)
      ? Math.max(5, Math.min(500, parsedHeightCm))
      : 100;
    const clampedRotation = Number.isFinite(parsedRotation)
      ? ((parsedRotation % 360) + 360) % 360
      : 0;

    // D-20: widthM/heightM are dedicated columns — direct patch
    const widthM = clampedWidthCm / 100;
    const heightM = clampedHeightCm / 100;

    // Pattern S2 (Pitfall-5 mitigation): spread prev provenance to preserve plantSlug etc.
    const prev = (element.provenance ?? {}) as Record<string, unknown>;
    const nextProvenance: Record<string, unknown> = {
      ...prev,
      rotateDeg: clampedRotation,
      note,
      plantedAt,
      accentColor,
      // NOTE: label NEVER goes in provenance (D-21 Column-Discipline, T-09.1-LABEL-DUP)
    };

    // D-21: label is a dedicated top-level column — write as top-level patch key, NOT in provenance
    onSave({ widthM, heightM, label: labelField, provenance: nextProvenance });
    useEditorStore.getState().setEditingElementId(null);
  };

  const handleCancel = () => {
    // D-18: discard pending changes without confirm — Undo (Ctrl+Z) is the recovery mechanism
    onCancel();
    useEditorStore.getState().setEditingElementId(null);
  };

  const handleDelete = () => {
    onDelete();
    useEditorStore.getState().setEditingElementId(null);
  };

  // Layout: centered on Web, bottom-sheet on Mobile (D-16 discretion)
  const containerClassName =
    Platform.OS === 'web'
      ? 'w-11/12 max-w-md bg-stone-100 dark:bg-stone-800 rounded-lg p-6'
      : 'w-full self-end mb-0 bg-stone-100 dark:bg-stone-800 rounded-t-2xl p-6';

  const overlayClassName =
    Platform.OS === 'web'
      ? 'flex-1 items-center justify-center bg-black/30'
      : 'flex-1 justify-end bg-black/30';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <View className={overlayClassName}>
        <View testID="element-editor-modal" className={containerClassName}>
          <Text className="text-lg font-semibold text-stone-700 dark:text-stone-200 mb-4">
            {t('editor.elementEditor.title')}
          </Text>

          <ScrollView className="max-h-96" showsVerticalScrollIndicator={false}>
            {/* Kern-Felder (D-09) */}
            <View className="gap-3">
              {/* Name / Bezeichnung — form field is "name" in UI, maps to dedicated `label` column (D-21) */}
              <View>
                <Text className="text-xs text-stone-500 dark:text-stone-400 mb-1">
                  {t('editor.elementEditor.name')}
                </Text>
                <TextInput
                  testID="kern-name"
                  value={labelField}
                  onChangeText={setLabelField}
                  className="border border-stone-300 dark:border-stone-600 rounded-md p-2 min-h-[44px] text-stone-800 dark:text-stone-200 bg-stone-50 dark:bg-stone-700"
                  placeholderTextColor="#a8a29e"
                  placeholder={t('editor.elementEditor.name')}
                />
              </View>

              {/* Breite */}
              <View>
                <Text className="text-xs text-stone-500 dark:text-stone-400 mb-1">
                  {t('editor.elementEditor.width')}
                </Text>
                <TextInput
                  testID="kern-width"
                  value={widthCm}
                  onChangeText={setWidthCm}
                  keyboardType="numeric"
                  className="border border-stone-300 dark:border-stone-600 rounded-md p-2 min-h-[44px] text-stone-800 dark:text-stone-200 bg-stone-50 dark:bg-stone-700"
                  placeholderTextColor="#a8a29e"
                  placeholder="100"
                />
              </View>

              {/* Höhe */}
              <View>
                <Text className="text-xs text-stone-500 dark:text-stone-400 mb-1">
                  {t('editor.elementEditor.height')}
                </Text>
                <TextInput
                  testID="kern-height"
                  value={heightCm}
                  onChangeText={setHeightCm}
                  keyboardType="numeric"
                  className="border border-stone-300 dark:border-stone-600 rounded-md p-2 min-h-[44px] text-stone-800 dark:text-stone-200 bg-stone-50 dark:bg-stone-700"
                  placeholderTextColor="#a8a29e"
                  placeholder="100"
                />
              </View>

              {/* Rotation */}
              <View>
                <Text className="text-xs text-stone-500 dark:text-stone-400 mb-1">
                  {t('editor.elementEditor.rotation')}
                </Text>
                <TextInput
                  testID="kern-rotation"
                  value={rotationDeg}
                  onChangeText={setRotationDeg}
                  keyboardType="numeric"
                  className="border border-stone-300 dark:border-stone-600 rounded-md p-2 min-h-[44px] text-stone-800 dark:text-stone-200 bg-stone-50 dark:bg-stone-700"
                  placeholderTextColor="#a8a29e"
                  placeholder="0"
                />
              </View>

              {/* Z-Order Buttons (D-12) */}
              <View>
                <Text className="text-xs text-stone-500 dark:text-stone-400 mb-1">
                  {t('editor.elementEditor.zOrder')}
                </Text>
                <ZOrderButtons elementId={element.id} />
              </View>
            </View>

            {/* Mehr Felder — collapsed by default (D-11) */}
            <ElementEditorMoreFields
              expanded={moreExpanded}
              onToggle={() => setMoreExpanded((v) => !v)}
              note={note}
              setNote={setNote}
              plantedAt={plantedAt}
              setPlantedAt={setPlantedAt}
              accentColor={accentColor}
              setAccentColor={setAccentColor}
            />
          </ScrollView>

          {/* Footer (D-17): destructive Löschen on left; ghost Abbrechen + default Speichern on right */}
          <View className="flex-row justify-between mt-4">
            <Button
              variant="destructive"
              testID="element-editor-delete"
              onPress={handleDelete}
            >
              <Text className="text-white font-semibold">{t('editor.elementEditor.delete')}</Text>
            </Button>
            <View className="flex-row gap-2">
              <Button
                variant="ghost"
                testID="element-editor-cancel"
                onPress={handleCancel}
              >
                <Text className="text-stone-700 dark:text-stone-200">
                  {t('editor.elementEditor.cancel')}
                </Text>
              </Button>
              <Button
                variant="default"
                testID="element-editor-save"
                onPress={handleSave}
              >
                <Text className="text-white font-semibold">{t('editor.elementEditor.save')}</Text>
              </Button>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
