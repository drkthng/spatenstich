// Capture flow sub-navigator — linear wizard for photo capture + dimensions.
// No SyncStatusBadge (capture flow is session-bound).
// Pattern: 04-PATTERNS.md §"app/app/(app)/capture/_layout.tsx".
import { Stack } from 'expo-router';

export default function CaptureLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTitle: '',
        headerBackTitle: '',
      }}
    />
  );
}
