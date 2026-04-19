// (app) group layout — Stack with headers (Phase 4 will add tabs).
// Pattern: 02-PATTERNS.md §"app/app/(auth)/_layout.tsx and app/app/(app)/_layout.tsx".
import { Stack } from 'expo-router';

export default function AppLayout() {
  return <Stack screenOptions={{ headerShown: true, headerTitle: '' }} />;
}
