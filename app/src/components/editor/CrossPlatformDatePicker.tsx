// Phase 09.1 Plan 02: Cross-platform date picker.
// RESEARCH §Pattern 9 (Date): Web uses native <input type="date">; Mobile uses lazy-require
// of @react-native-community/datetimepicker to avoid Metro web bundle breakage.
// Pitfall: NEVER import datetimepicker at module top — Metro web bundle breaks.

import * as React from 'react';
import { Platform, View } from 'react-native';

export interface CrossPlatformDatePickerProps {
  value: string | null;
  onChange: (s: string | null) => void;
  testID?: string;
}

export function CrossPlatformDatePicker({
  value,
  onChange,
  testID,
}: CrossPlatformDatePickerProps): React.JSX.Element {
  const [showPicker, setShowPicker] = React.useState(false);

  if (Platform.OS === 'web') {
    // Web: native <input type="date"> — Metro tree-shakes the mobile picker away.
    return (
      <input
        type="date"
        data-testid={testID}
        value={value ?? ''}
        onChange={(e) => onChange(e.currentTarget.value || null)}
        style={{
          border: '1px solid #d6d3d1',
          borderRadius: 6,
          padding: '6px 8px',
          fontSize: 14,
          color: '#292524',
          backgroundColor: '#fafaf9',
          minHeight: 44,
          width: '100%',
          boxSizing: 'border-box',
        }}
      />
    );
  }

  // Mobile: lazy-require — never at module top (Pitfall per RESEARCH §Pattern 9)
  const DateTimePicker = require('@react-native-community/datetimepicker').default;

  const currentDate = value ? new Date(value) : new Date();

  return (
    <View testID={testID}>
      {showPicker && (
        <DateTimePicker
          value={currentDate}
          mode="date"
          display="default"
          onChange={(_event: any, selectedDate?: Date) => {
            setShowPicker(false);
            if (selectedDate) {
              // Format as YYYY-MM-DD
              const iso = selectedDate.toISOString().split('T')[0] ?? null;
              onChange(iso);
            }
          }}
        />
      )}
      {/* Trigger to open picker */}
      <View
        style={{
          borderWidth: 1,
          borderColor: '#d6d3d1',
          borderRadius: 6,
          padding: 8,
          minHeight: 44,
          justifyContent: 'center',
        }}
        onTouchEnd={() => setShowPicker(true)}
      >
        <View />
      </View>
    </View>
  );
}
