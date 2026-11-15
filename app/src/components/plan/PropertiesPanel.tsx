// The properties field of the selected element (EDIT3-05, EDIT3-06, D-07) and the actions on
// a selection (EDIT3-10). On a phone it is a strip under the plan; on desktop a panel on the
// right. Name, Breite, Tiefe and Drehung update the plan as you type: metres with a decimal
// comma exact to 1 cm, degrees exact to 1°.

import * as React from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { BringToFront, Copy, SendToBack, Trash2 } from 'lucide-react-native';
import type { PlanElementRow } from '@spatenstich/shared';
import { t } from '@/src/lib/i18n';
import { tokens } from '@/src/theme/tokens';
import { getRotateDeg, MIN_SIZE_M } from '@/src/lib/editor/elementGeometry';
import {
  formatDegrees,
  formatMeters,
  parseDegrees,
  parseMeters,
} from '@/src/lib/editor/numberFormat';

const NAME_MAX_LENGTH = 24;

interface FieldProps {
  label: string;
  value: string;
  unit?: string;
  inputMode: 'text' | 'decimal' | 'numeric';
  maxLength?: number;
  testID: string;
  /** Called on every keystroke; applies the text when it is valid. */
  onText: (text: string) => void;
  onEditStart?: () => void;
  onEditEnd?: () => void;
}

export function Field({
  label,
  value,
  unit,
  inputMode,
  maxLength,
  testID,
  onText,
  onEditStart,
  onEditEnd,
}: FieldProps): React.JSX.Element {
  // While the field has focus it shows what was typed, even when that is not valid yet.
  const [draft, setDraft] = React.useState<string | null>(null);
  return (
    <View className="flex-1 min-w-0">
      <Text className="text-xs uppercase tracking-widest text-ink-muted">{label}</Text>
      <View className="flex-row items-center border-b border-line">
        <TextInput
          className="flex-1 min-w-0 min-h-[48px] text-base text-ink"
          style={{ outlineStyle: 'none' } as never}
          value={draft ?? value}
          inputMode={inputMode}
          maxLength={maxLength}
          selectTextOnFocus
          accessibilityLabel={label}
          placeholderTextColor={tokens.color.inkMuted}
          testID={testID}
          onFocus={() => {
            setDraft(value);
            onEditStart?.();
          }}
          onBlur={() => {
            setDraft(null);
            onEditEnd?.();
          }}
          onChangeText={(text) => {
            setDraft(text);
            onText(text);
          }}
        />
        {unit ? <Text className="pl-1 text-base text-ink-muted">{unit}</Text> : null}
      </View>
    </View>
  );
}

export interface SelectionActionHandlers {
  onDuplicate: () => void;
  onFront: () => void;
  onBack: () => void;
  onDelete: () => void;
}

/** Duplizieren, nach vorn, nach hinten, Löschen: for one element or several. */
export function SelectionActions({
  handlers,
  showLabels,
}: {
  handlers: SelectionActionHandlers;
  showLabels: boolean;
}): React.JSX.Element {
  const items = [
    { key: 'duplicate', label: t('editor.actions.duplicate'), Icon: Copy, onPress: handlers.onDuplicate, danger: false },
    { key: 'front', label: t('editor.actions.front'), Icon: BringToFront, onPress: handlers.onFront, danger: false },
    { key: 'back', label: t('editor.actions.back'), Icon: SendToBack, onPress: handlers.onBack, danger: false },
    { key: 'delete', label: t('editor.actions.delete'), Icon: Trash2, onPress: handlers.onDelete, danger: true },
  ];
  return (
    <View className={showLabels ? 'gap-1' : 'flex-row gap-2'} testID="selection-actions">
      {items.map(({ key, label, Icon, onPress, danger }) => (
        <Pressable
          key={key}
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={label}
          testID={`action-${key}`}
          className={
            showLabels
              ? 'flex-row items-center min-h-[48px] px-1'
              : 'flex-1 min-h-[48px] items-center justify-center border border-line'
          }
        >
          <Icon size={20} color={danger ? tokens.color.danger : tokens.color.ink} strokeWidth={1.5} />
          {showLabels ? (
            <Text className={danger ? 'ml-3 text-base text-danger' : 'ml-3 text-base text-ink'}>{label}</Text>
          ) : null}
        </Pressable>
      ))}
    </View>
  );
}

export interface PropertiesPanelProps {
  element: PlanElementRow;
  layout: 'strip' | 'side';
  onUpdate: (id: string, patch: Partial<PlanElementRow>) => void;
  /** Opens the dialog with the remaining fields. */
  onMore: () => void;
  actions: SelectionActionHandlers;
  /** Typing in a field is one undo step: called on focus and on blur. */
  onEditStart?: () => void;
  onEditEnd?: () => void;
  /** Beds: start editing the corners of the outline (EDIT3-14). */
  onOutline?: () => void;
}

export function PropertiesPanel({
  element,
  layout,
  onUpdate,
  onMore,
  actions,
  onEditStart,
  onEditEnd,
  onOutline,
}: PropertiesPanelProps): React.JSX.Element {
  const id = element.id;
  const outlineButton = onOutline ? (
    <Pressable
      onPress={onOutline}
      accessibilityRole="button"
      testID="props-outline"
      className="min-h-[48px] items-center justify-center border border-line px-3"
    >
      <Text className="text-base text-ink">{t('editor.outline.edit')}</Text>
    </Pressable>
  ) : null;
  const edit = { onEditStart, onEditEnd };

  const nameField = (
    <Field
      {...edit}
      label={t('editor.props.name')}
      value={element.label ?? ''}
      inputMode="text"
      maxLength={NAME_MAX_LENGTH}
      testID="props-name"
      onText={(text) => {
        if (text.trim().length > 0) onUpdate(id, { label: text });
      }}
    />
  );
  const widthField = (
    <Field
      {...edit}
      label={t('editor.props.width')}
      value={formatMeters(element.widthM)}
      unit={t('editor.props.unitM')}
      inputMode="decimal"
      testID="props-width"
      onText={(text) => {
        const value = parseMeters(text);
        if (value !== null && value >= MIN_SIZE_M) onUpdate(id, { widthM: value });
      }}
    />
  );
  const depthField = (
    <Field
      {...edit}
      label={t('editor.props.depth')}
      value={formatMeters(element.heightM)}
      unit={t('editor.props.unitM')}
      inputMode="decimal"
      testID="props-depth"
      onText={(text) => {
        const value = parseMeters(text);
        if (value !== null && value >= MIN_SIZE_M) onUpdate(id, { heightM: value });
      }}
    />
  );
  const rotationField = (
    <Field
      {...edit}
      label={t('editor.props.rotation')}
      value={formatDegrees(getRotateDeg(element))}
      unit={t('editor.props.unitDeg')}
      inputMode="numeric"
      testID="props-rotation"
      onText={(text) => {
        const value = parseDegrees(text);
        if (value !== null) {
          onUpdate(id, { provenance: { ...(element.provenance ?? {}), rotateDeg: value } });
        }
      }}
    />
  );
  const moreButton = (
    <Pressable
      onPress={onMore}
      accessibilityRole="button"
      accessibilityLabel={t('editor.props.moreLabel')}
      testID="props-more"
      className="min-h-[48px] min-w-[56px] items-center justify-center border border-line px-3"
    >
      <Text className="text-base text-ink">{t('editor.props.more')}</Text>
    </Pressable>
  );

  if (layout === 'side') {
    return (
      <View className="p-4 gap-4" testID="props-panel">
        {nameField}
        <View className="flex-row gap-3">
          {widthField}
          {depthField}
        </View>
        <View className="flex-row gap-3 items-end">
          {rotationField}
          {moreButton}
        </View>
        {outlineButton}
        <View className="border-t border-line-soft pt-2">
          <SelectionActions handlers={actions} showLabels />
        </View>
      </View>
    );
  }

  return (
    <View className="border-t border-line bg-bg px-4 pt-2 pb-3 gap-2" testID="props-panel">
      <View className="flex-row gap-3 items-end">
        {nameField}
        {moreButton}
      </View>
      <View className="flex-row gap-3">
        {widthField}
        {depthField}
        {rotationField}
      </View>
      {outlineButton}
      <SelectionActions handlers={actions} showLabels={false} />
    </View>
  );
}

/** Shown instead of the properties when several elements are selected. */
export function MultiSelectionPanel({
  count,
  layout,
  actions,
}: {
  count: number;
  layout: 'strip' | 'side';
  actions: SelectionActionHandlers;
}): React.JSX.Element {
  const title = (
    <Text className="text-base font-display font-medium text-ink" testID="multi-count">
      {t('editor.actions.selectedCount', { count })}
    </Text>
  );
  if (layout === 'side') {
    return (
      <View className="p-4 gap-3" testID="multi-panel">
        {title}
        <SelectionActions handlers={actions} showLabels />
      </View>
    );
  }
  return (
    <View className="border-t border-line bg-bg px-4 pt-3 pb-3 gap-2" testID="multi-panel">
      {title}
      <SelectionActions handlers={actions} showLabels={false} />
    </View>
  );
}
