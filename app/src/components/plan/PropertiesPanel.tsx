// Phase 30: the properties field of the selected element (EDIT3-05, EDIT3-06, D-07).
// On a phone it is a strip under the plan; on desktop a panel on the right. Name, Breite,
// Tiefe and Drehung update the plan as you type: metres with a decimal comma exact to 1 cm,
// degrees exact to 1°.

import * as React from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
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
}

function Field({ label, value, unit, inputMode, maxLength, testID, onText }: FieldProps): React.JSX.Element {
  // While the field has focus it shows what was typed, even when that is not valid yet.
  const [draft, setDraft] = React.useState<string | null>(null);
  return (
    <View className="flex-1 min-w-0">
      <Text className="text-[11px] uppercase tracking-widest text-ink-muted">{label}</Text>
      <View className="flex-row items-center border-b border-line">
        <TextInput
          className="flex-1 min-w-0 min-h-[44px] text-base text-ink"
          style={{ outlineStyle: 'none' } as never}
          value={draft ?? value}
          inputMode={inputMode}
          maxLength={maxLength}
          selectTextOnFocus
          accessibilityLabel={label}
          placeholderTextColor={tokens.color.inkMuted}
          testID={testID}
          onFocus={() => setDraft(value)}
          onBlur={() => setDraft(null)}
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

export interface PropertiesPanelProps {
  element: PlanElementRow;
  layout: 'strip' | 'side';
  onUpdate: (id: string, patch: Partial<PlanElementRow>) => void;
  /** Opens the dialog with the remaining fields and delete. */
  onMore: () => void;
}

export function PropertiesPanel({ element, layout, onUpdate, onMore }: PropertiesPanelProps): React.JSX.Element {
  const id = element.id;

  const nameField = (
    <Field
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
      className="min-h-[44px] min-w-[56px] items-center justify-center border border-line px-3"
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
    </View>
  );
}
