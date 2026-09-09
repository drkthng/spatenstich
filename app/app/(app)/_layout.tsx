// (app) group layout — Stack with headers (Phase 4 will add tabs).
// Pattern: 02-PATTERNS.md §"app/app/(auth)/_layout.tsx and app/app/(app)/_layout.tsx".
// Plan 03-06: SyncStatusBadge added to headerRight for all authenticated routes.
// Plan 20-02 (D-06): expo-share-intent + ShareIntentProvider entfernt — der
// Teilen-Weg wird in 20-03 durch den PWA Web Share Target + Service Worker ersetzt.
import { Stack } from 'expo-router';
import { SyncStatusBadge } from '@/src/components/SyncStatusBadge';

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTitle: '',
        headerRight: () => <SyncStatusBadge />,
      }}
    />
  );
}
