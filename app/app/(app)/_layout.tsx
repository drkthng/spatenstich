// (app) group layout (Phase 37, NAV3-01, NAV3-02): every signed-in screen sits in the
// navigation frame (bar at the bottom on a phone, sidebar on a wide window) and has a
// title in its header. The editor and the first steps take the whole window. A person
// whose garden has no size yet is led to the first steps.
import * as React from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { SyncStatusBadge } from '@/src/components/SyncStatusBadge';
import { AppNav } from '@/src/components/nav/AppNav';
import { SCREEN_TITLES } from '@/src/lib/nav/tabs';
import { needsOnboarding, ONBOARDING_START } from '@/src/lib/nav/startRoute';
import { useAuthStore } from '@/src/stores/authStore';
import { storage } from '@/src/storage';
import { loadDimensions } from '@/src/lib/gardenPlanRepo';
import { syncEvents } from '@/src/lib/sync/events';
import { useDataVersion } from '@/src/lib/sync/dataVersion';
import { tokens } from '@/src/theme/tokens';
import { t } from '@/src/lib/i18n';

/**
 * Leads to the first steps when it is certain that the garden has no size: only after
 * the size was asked from the server once (a garden joined by code brings its size with
 * the first sync).
 */
function OnboardingGuard(): null {
  const mode = useAuthStore((s) => s.mode);
  const gardenId = useAuthStore((s) => s.activeGardenId);
  // The router types the segments per route; here they are only read as a list.
  const segments: readonly string[] = useSegments();
  const router = useRouter();
  const version = useDataVersion('garden_dimensions');
  const [pulls, setPulls] = React.useState(0);
  const [known, setKnown] = React.useState<{ gardenId: string; firstPullDone: boolean; hasDimensions: boolean } | null>(null);
  const area = segments[1] ?? '';

  React.useEffect(
    () =>
      syncEvents.on((evt) => {
        if (evt.type === 'pull_success' && evt.entity === 'garden_dimensions') setPulls((n) => n + 1);
      }),
    [],
  );

  React.useEffect(() => {
    let alive = true;
    if (mode !== 'account' || !gardenId) {
      setKnown(null);
      return;
    }
    void (async () => {
      try {
        const [dims, state] = await Promise.all([loadDimensions(gardenId), storage.getSyncState('garden_dimensions')]);
        if (alive) setKnown({ gardenId, firstPullDone: Boolean(state?.lastPullAt), hasDimensions: dims !== null });
      } catch {
        if (alive) setKnown(null);
      }
    })();
    return () => {
      alive = false;
    };
    // `area`: what was saved in a step must be known before the next screen is judged.
  }, [mode, gardenId, version, pulls, area]);

  React.useEffect(() => {
    if (!known || known.gardenId !== gardenId) return;
    if (needsOnboarding({ mode, gardenId, firstPullDone: known.firstPullDone, hasDimensions: known.hasDimensions, segments })) {
      router.replace(ONBOARDING_START as never);
    }
  }, [known, mode, gardenId, segments, router]);

  return null;
}

export default function AppLayout() {
  return (
    <AppNav>
      <OnboardingGuard />
      <Stack
        screenOptions={({ route }) => ({
          headerShown: true,
          // A screen may set its own title; this is the one it has without doing so.
          headerTitle: SCREEN_TITLES[route.name] ? t(SCREEN_TITLES[route.name]!) : '',
          headerRight: () => <SyncStatusBadge />,
          // Feldführer: ink on warm white, no shadow under the header, hairline instead.
          headerStyle: { backgroundColor: tokens.color.bg },
          headerTintColor: tokens.color.ink,
          headerTitleStyle: { fontFamily: tokens.font.display },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: tokens.color.bg },
        })}
      />
    </AppNav>
  );
}
