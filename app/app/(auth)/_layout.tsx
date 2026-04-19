// (auth) group layout — minimal Stack, no headers (D-03).
// Pattern: 02-PATTERNS.md §"app/app/(auth)/_layout.tsx and app/app/(app)/_layout.tsx".
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
