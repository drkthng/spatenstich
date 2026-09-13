import * as React from 'react';
import { Platform } from 'react-native';
import * as Sentry from '@sentry/react-native';
import { Stack, SplashScreen, useSegments, useRouter } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

if (Platform.OS === 'web') {
  const { LogBox } = require('react-native');
  LogBox.ignoreAllLogs(true);
}

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/src/lib/auth';
import { useAuthStore } from '@/src/stores/authStore';
import { ensureDefaultGardenForUser } from '@/src/lib/inviteCodeRepo';
import { registerSyncTriggers } from '@/src/lib/sync/SyncTriggers';
import { getSyncWorker } from '@/src/lib/sync/SyncWorker';
import { repairNonUuidElementIds } from '@/src/lib/gardenPlanRepo';
import '../global.css';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: process.env.ENVIRONMENT ?? 'dev',
  tracesSampleRate: 1.0,
  enabled: !!process.env.EXPO_PUBLIC_SENTRY_DSN,
});

SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient();

function SplashController(): null {
  const { isLoading } = useAuth();
  React.useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isLoading]);
  return null;
}

// Service-Worker-Registrierung — Phase 20 Plan 03 Task 2 (DEPLOY-03, T-20-03-01).
// Nur bei Plattform web, vorhandenem Service-Worker-Container und https
// registrieren (auf http — lokaler Dev-Server — registriert sich absichtlich
// nichts, RESEARCH key_link). Der Update-Hinweis (SKIP_WAITING) kommt in Task 4.
function ServiceWorkerController(): null {
  React.useEffect(() => {
    if (
      Platform.OS !== 'web' ||
      typeof navigator === 'undefined' ||
      !('serviceWorker' in navigator) ||
      typeof location === 'undefined' ||
      location.protocol !== 'https:'
    ) {
      return;
    }
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      if (__DEV__) console.warn('[layout] service worker registration failed', err);
    });
  }, []);
  return null;
}

function GuardedStack(): React.JSX.Element {
  const { identity, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  const mode = useAuthStore((s) => s.mode);
  const activeGardenId = useAuthStore((s) => s.activeGardenId);
  const setActiveGarden = useAuthStore((s) => s.setActiveGarden);

  // Auth guard — imperative replace to avoid "navigate before mount" on web
  React.useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inAppGroup = segments[0] === '(app)';

    if (identity === null && !inAuthGroup) {
      router.replace('/(auth)');
    } else if (identity !== null && !inAppGroup) {
      router.replace('/(app)');
    }
  }, [identity, isLoading, segments, router]);

  // Garden default resolution — ensure account-mode users have a garden
  const gardenInFlight = React.useRef(false);
  React.useEffect(() => {
    if (!identity || mode !== 'account' || activeGardenId || gardenInFlight.current)
      return;
    gardenInFlight.current = true;
    let cancelled = false;
    (async () => {
      try {
        const gardenId = await ensureDefaultGardenForUser();
        if (!cancelled) setActiveGarden(gardenId);
      } catch (e) {
        if (__DEV__) console.warn('ensureDefaultGardenForUser failed', e);
      } finally {
        gardenInFlight.current = false;
      }
    })();
    return () => { cancelled = true; };
  }, [identity, mode, activeGardenId, setActiveGarden]);

  // Sync bootstrap — register triggers + initial pull
  const syncBooted = React.useRef(false);
  React.useEffect(() => {
    if (syncBooted.current) return;
    if (!identity || mode !== 'account' || !activeGardenId) return;
    syncBooted.current = true;
    const unregister = registerSyncTriggers();
    // Bug C data repair: re-id legacy non-UUID plan_elements (e.g. 'el-...' beds
    // drawn before the UUID fix) BEFORE the initial sync, so the repaired rows
    // enter the outbox and get pushed during syncAll(). Idempotent + account-only.
    (async () => {
      try {
        await repairNonUuidElementIds(mode, activeGardenId);
      } catch (e) {
        if (__DEV__) console.warn('[layout] uuid repair failed', e);
      }
      try {
        await getSyncWorker().syncAll();
      } catch (e) {
        if (__DEV__) console.warn('[layout] initial syncAll failed', e);
      }
    })();
    return () => {
      unregister();
      syncBooted.current = false;
    };
  }, [identity, mode, activeGardenId]);

  return <Stack screenOptions={{ headerShown: false }} />;
}

function RootLayoutInner(): React.JSX.Element {
  return (
    <>
      <SplashController />
      <ServiceWorkerController />
      <GuardedStack />
    </>
  );
}

function RootLayout(): React.JSX.Element {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RootLayoutInner />
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

export default Sentry.wrap(RootLayout);
