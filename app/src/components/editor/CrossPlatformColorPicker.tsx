// Phase 09.1 Plan 02: Cross-platform color picker.
// RESEARCH §Pattern 9 (Color): Web uses native <input type="color">; Mobile uses lazy-require
// of reanimated-color-picker wrapped in <Modal> to avoid Metro web bundle breakage.
// Security V5 (T-09.1-XSS-COLOR): Hex regex validates ALL color inputs before write to provenance.
// ASVS V5.1.3.

import * as React from 'react';
import { Platform, View, Modal, Pressable, Text } from 'react-native';

// T-09.1-XSS-COLOR mitigation: reject any non-hex value silently (ASVS V5.1.3)
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export interface CrossPlatformColorPickerProps {
  value: string | null;
  onChange: (s: string | null) => void;
  testID?: string;
}

export function CrossPlatformColorPicker({
  value,
  onChange,
  testID,
}: CrossPlatformColorPickerProps): React.JSX.Element {
  const [showPicker, setShowPicker] = React.useState(false);

  const safeOnChange = (hex: string | null) => {
    if (hex !== null && !HEX_RE.test(hex)) return; // reject invalid — T-09.1-XSS-COLOR
    onChange(hex);
  };

  if (Platform.OS === 'web') {
    // Web: native <input type="color"> — browser already constrains to valid hex values.
    return (
      <input
        type="color"
        data-testid={testID}
        value={value ?? '#000000'}
        onChange={(e) => safeOnChange(e.currentTarget.value)}
        style={{
          border: '1px solid #d6d3d1',
          borderRadius: 6,
          padding: 4,
          height: 44,
          width: '100%',
          cursor: 'pointer',
          backgroundColor: '#fafaf9',
          boxSizing: 'border-box',
        }}
      />
    );
  }

  // Mobile: lazy-require reanimated-color-picker — never at module top (Pitfall per RESEARCH §Pattern 9)
  const ColorPicker = (() => {
    try {
      return require('reanimated-color-picker').default;
    } catch {
      return null;
    }
  })();

  return (
    <View testID={testID}>
      {/* Color swatch + tap to open picker */}
      <Pressable
        onPress={() => setShowPicker(true)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: '#d6d3d1',
          borderRadius: 6,
          padding: 8,
          minHeight: 44,
          gap: 8,
        }}
      >
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 4,
            backgroundColor: value ?? '#000000',
            borderWidth: 1,
            borderColor: '#a8a29e',
          }}
        />
        <Text style={{ fontSize: 13, color: '#78716c' }}>{value ?? '#000000'}</Text>
      </Pressable>

      {/* Color picker modal (Mobile) */}
      {ColorPicker && (
        <Modal
          visible={showPicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowPicker(false)}
        >
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0,0,0,0.4)',
            }}
          >
            <View
              style={{
                backgroundColor: '#fafaf9',
                borderRadius: 12,
                padding: 20,
                width: '90%',
                maxWidth: 360,
              }}
            >
              <ColorPicker
                value={value ?? '#000000'}
                onComplete={({ hex }: { hex: string }) => {
                  safeOnChange(hex);
                  setShowPicker(false);
                }}
              />
              <Pressable
                onPress={() => setShowPicker(false)}
                style={{
                  marginTop: 12,
                  padding: 12,
                  backgroundColor: '#44403c',
                  borderRadius: 8,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>Schließen</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}
