// Phase 6.5 Plan 04: Inline edit form for drafts.
// Per RESEARCH §Open Question 1: MVP edits label (all kinds) + dimensions (beds only).
// V5 mitigation: label maxLength=200, dimensions positive-finite numeric check.

import * as React from 'react';
import { View, Text } from 'react-native';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Button } from '@/src/components/ui/button';
import de from '@spatenstich/shared/i18n/de';

const t = (key: string): string =>
  key.split('.').reduce<any>((o, k) => (o ? o[k] : undefined), de as any) ?? key;

export interface DraftEditFormValues {
  label: string;
  lengthCm?: number | null;
  widthCm?: number | null;
}

export interface DraftEditFormProps {
  kind: 'bed' | 'plant' | 'observation';
  initialValues: DraftEditFormValues;
  onSave: (values: DraftEditFormValues) => void;
  onCancel: () => void;
  testID?: string;
}

export function DraftEditForm({
  kind,
  initialValues,
  onSave,
  onCancel,
  testID,
}: DraftEditFormProps): React.JSX.Element {
  const [label, setLabel] = React.useState(initialValues.label);
  const [lengthCm, setLengthCm] = React.useState(
    initialValues.lengthCm != null ? String(initialValues.lengthCm) : ''
  );
  const [widthCm, setWidthCm] = React.useState(
    initialValues.widthCm != null ? String(initialValues.widthCm) : ''
  );

  const isBed = kind === 'bed';
  const labelValid = label.trim().length > 0 && label.length <= 200;
  const lengthValid =
    !isBed || lengthCm === '' || (Number(lengthCm) > 0 && Number.isFinite(Number(lengthCm)));
  const widthValid =
    !isBed || widthCm === '' || (Number(widthCm) > 0 && Number.isFinite(Number(widthCm)));
  const canSave = labelValid && lengthValid && widthValid;

  const handleSave = (): void => {
    if (!canSave) return;
    onSave({
      label: label.trim(),
      lengthCm: isBed && lengthCm !== '' ? Number(lengthCm) : null,
      widthCm: isBed && widthCm !== '' ? Number(widthCm) : null,
    });
  };

  return (
    <View className="p-4 gap-3" testID={testID ?? 'draft-edit-form'}>
      <View className="gap-1">
        <Label>{t('import.review.editForm.labelPlaceholder')}</Label>
        <Input
          value={label}
          onChangeText={setLabel}
          placeholder={t('import.review.editForm.labelPlaceholder')}
          maxLength={200}
          testID="draft-edit-label-input"
        />
      </View>
      {isBed && (
        <>
          <View className="gap-1">
            <Label>{t('import.review.editForm.lengthPlaceholder')}</Label>
            <Input
              value={lengthCm}
              onChangeText={setLengthCm}
              placeholder={t('import.review.editForm.lengthPlaceholder')}
              keyboardType="numeric"
              testID="draft-edit-length-input"
            />
          </View>
          <View className="gap-1">
            <Label>{t('import.review.editForm.widthPlaceholder')}</Label>
            <Input
              value={widthCm}
              onChangeText={setWidthCm}
              placeholder={t('import.review.editForm.widthPlaceholder')}
              keyboardType="numeric"
              testID="draft-edit-width-input"
            />
          </View>
        </>
      )}
      <View className="flex-row gap-2 mt-2">
        <Button onPress={handleSave} variant="default" disabled={!canSave} testID="draft-edit-save">
          <Text className="text-white font-semibold">{t('import.review.editForm.save')}</Text>
        </Button>
        <Button onPress={onCancel} variant="outline" testID="draft-edit-cancel">
          <Text className="font-semibold text-stone-700 dark:text-stone-200">
            {t('import.review.editForm.cancel')}
          </Text>
        </Button>
      </View>
    </View>
  );
}
