// (app) group layout — Stack with headers (Phase 4 will add tabs).
// Pattern: 02-PATTERNS.md §"app/app/(auth)/_layout.tsx and app/app/(app)/_layout.tsx".
// Plan 03-06: SyncStatusBadge added to headerRight for all authenticated routes.
// Plan 06-03: ShareIntentProvider wraps layout for OS share-intent JSON file handling.
//   - AppLayoutInner reads share-intent and routes to import screen.
//   - resetShareIntent() called immediately after push to prevent re-navigation loop (Pitfall 2).
import * as React from 'react';
import { Stack, useRouter } from 'expo-router';
import { ShareIntentProvider, useShareIntentContext } from 'expo-share-intent';
import { SyncStatusBadge } from '@/src/components/SyncStatusBadge';

function AppLayoutInner() {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();
  const router = useRouter();

  React.useEffect(() => {
    if (!hasShareIntent || !shareIntent?.files?.length) return;
    const file = shareIntent.files[0];
    router.push({ pathname: '/(app)/import', params: { fileUri: file.path } } as any);
    resetShareIntent(); // CRITICAL: prevent re-navigation loop (Pitfall 2 from RESEARCH)
  }, [hasShareIntent, shareIntent]);

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

export default function AppLayout() {
  return (
    <ShareIntentProvider>
      <AppLayoutInner />
    </ShareIntentProvider>
  );
}
