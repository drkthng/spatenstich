// Privacy Settings Screen — Plan 03-05 Task 03.
// DSGVO-Opt-in für GPS-Koordinaten aus Foto-EXIF (D-24).
//
// Default: AUS (DSGVO-Minimalprinzip).
// EXIF wird UNABHÄNGIG von diesem Toggle IMMER entfernt (NFR-05).
// Nur die GPS-Koordinaten selbst werden bei Aktivierung mit dem Foto gespeichert.

import * as React from 'react';
import { View, Text, Switch, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { useSettingsStore } from '@/src/stores/settingsStore';

export default function PrivacyScreen(): React.JSX.Element {
  const geoOptIn = useSettingsStore((s) => s.geoOptIn);
  const setGeoOptIn = useSettingsStore((s) => s.setGeoOptIn);

  return (
    <>
      <Stack.Screen options={{ title: 'Datenschutz' }} />
      <ScrollView
        className="flex-1 bg-stone-50 dark:bg-stone-900"
        contentContainerClassName="p-6 gap-4"
      >
        <Text className="text-2xl font-semibold text-stone-900 dark:text-stone-100">
          Datenschutz
        </Text>

        {/* GPS Opt-in Toggle */}
        <View
          className="flex-row items-start justify-between py-3 border-b border-stone-200 dark:border-stone-800"
          testID="privacy-geo-opt-in-row"
        >
          <View className="flex-1 pr-3">
            <Text
              className="text-base font-medium text-stone-900 dark:text-stone-100"
              accessibilityLabel="Standort-Daten aus Fotos teilen"
            >
              Standort-Daten aus Fotos teilen
            </Text>
            <Text className="text-sm text-stone-600 dark:text-stone-400 mt-1">
              Wenn aktiviert, werden GPS-Koordinaten aus Foto-Metadaten mit dem Foto
              zusammen gespeichert. Diese werden NUR in Ihrem persönlichen Bereich
              verwendet und niemals ohne Ihre explizite Zustimmung geteilt.
            </Text>
            <Text className="text-xs text-stone-500 dark:text-stone-500 mt-2">
              Standard: AUS (EU-DSGVO). Die EXIF-Metadaten-Entfernung ist davon
              unabhängig immer aktiv — nur die GPS-Koordinaten selbst werden bei
              Deaktivierung verworfen.
            </Text>
          </View>
          <Switch
            value={geoOptIn}
            onValueChange={setGeoOptIn}
            accessibilityLabel="Standort-Daten aus Fotos teilen"
            accessibilityRole="switch"
            accessibilityState={{ checked: geoOptIn }}
            testID="geo-opt-in-switch"
          />
        </View>

        {/* DSGVO Notice */}
        <View className="mt-4 p-4 rounded-lg bg-stone-100 dark:bg-stone-800">
          <Text className="text-xs text-stone-500 dark:text-stone-400 leading-5">
            Diese App verarbeitet Ihre Daten gemäß der EU-Datenschutz-Grundverordnung
            (DSGVO). Alle Daten werden auf EU-Servern (Frankfurt) gespeichert. Fotos
            werden vor der Speicherung automatisch von EXIF-Metadaten bereinigt.
            Wird niemals ohne Ihre explizite Zustimmung geteilt.
          </Text>
        </View>
      </ScrollView>
    </>
  );
}
