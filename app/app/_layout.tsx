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
import { consumeInviteCode, ensureDefaultGardenForUser } from '@/src/lib/inviteCodeRepo';
import { resolveGarden } from '@/src/lib/nav/startRoute';
import { isPublicRoute } from '@/src/lib/nav/tabs';
import { t } from '@/src/lib/i18n';
import { registerSyncTriggers } from '@/src/lib/sync/SyncTriggers';
import { getSyncWorker } from '@/src/lib/sync/SyncWorker';
import { repairNonUuidElementIds } from '@/src/lib/gardenPlanRepo';
import { startRealtimeBridge } from '@/src/lib/sync/RealtimeBridge';
import { syncEvents } from '@/src/lib/sync/events';
import { ensureSyncScope, clearLocalAccountData } from '@/src/lib/sync/sessionCleanup';
import { storage, runMigrations } from '@/src/storage';
import { SyncToastHost, showSyncToast } from '@/src/components/SyncToastHost';
import {
  ServiceWorkerController,
  InstallPromptController,
  StorageController,
} from '@/src/components/pwa/PwaControllers';
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

function GuardedStack(): React.JSX.Element {
  const { identity, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  const mode = useAuthStore((s) => s.mode);
  const activeGardenId = useAuthStore((s) => s.activeGardenId);
  const setActiveGarden = useAuthStore((s) => s.setActiveGarden);
  const pendingRoute = useAuthStore((s) => s.pendingRoute);
  const setPendingRoute = useAuthStore((s) => s.setPendingRoute);
  const clearPendingRoute = useAuthStore((s) => s.clearPendingRoute);

  // Auth guard — imperative replace to avoid "navigate before mount" on web
  React.useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inAppGroup = segments[0] === '(app)';
    // Privacy notes and Impressum are open to everyone, signed in or not (Phase 38).
    if (isPublicRoute(segments)) return;

    if (identity === null && !inAuthGroup) {
      // Web Share Target (DEPLOY-04): ein POST /share-target trifft ein,
      // während niemand angemeldet ist — die Zielroute (/import?from=share)
      // merken, bevor sie durch den Auth-Redirect verworfen wird. Nach dem
      // Login navigiert der else-Zweig unten dorthin zurück.
      if (
        Platform.OS === 'web' &&
        typeof window !== 'undefined' &&
        window.location.pathname.includes('/import') &&
        window.location.search.includes('from=share')
      ) {
        setPendingRoute(`${window.location.pathname}${window.location.search}`);
      }
      router.replace('/(auth)');
    } else if (identity !== null && !inAppGroup) {
      if (pendingRoute) {
        const target = pendingRoute;
        clearPendingRoute();
        router.replace(target as any);
      } else {
        router.replace('/(app)');
      }
    }
  }, [identity, isLoading, segments, router, pendingRoute, setPendingRoute, clearPendingRoute]);

  // Effects below follow the user id, not the identity object: a refreshed session
  // creates a new object for the same person and must not restart everything.
  const identityUserId = identity?.userId ?? null;
  const storeUserId = useAuthStore((st) => st.userId);

  // Garden default resolution — ensure account-mode users have a garden. Without a
  // connection the server cannot be asked; it is tried again every few seconds until
  // it works (Phase 33).
  const [gardenRetry, setGardenRetry] = React.useState(0);
  React.useEffect(() => {
    if (!identityUserId || mode !== 'account' || activeGardenId) return;
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    (async () => {
      try {
        // Phase 37 (NAV3-03): an invite code typed at sign-up comes first. Asking for a
        // default garden before would leave the person with an empty second garden.
        const pendingCode = useAuthStore.getState().pendingInviteCode;
        const found = await resolveGarden({
          pendingCode,
          consume: (code) => consumeInviteCode('account', code),
          ensureDefault: ensureDefaultGardenForUser,
          isOffline: (error) => (error as Error | null)?.message === 'offline_required',
        });
        if (cancelled) return;
        if (pendingCode) useAuthStore.getState().setPendingInviteCode(null);
        if (found.joined) showSyncToast(t('onboarding.joined'));
        else if (found.codeProblem) showSyncToast(t(`onboarding.codeProblem.${found.codeProblem}`));
        setActiveGarden(found.gardenId);
      } catch (e) {
        if (__DEV__) console.warn('garden resolution failed', e);
        if (!cancelled) retryTimer = setTimeout(() => setGardenRetry((n) => n + 1), 8000);
      }
    })();
    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [identityUserId, mode, activeGardenId, setActiveGarden, gardenRetry]);

  // Sync bootstrap — local schema, account scope, triggers, live connection, first sync.
  React.useEffect(() => {
    if (!identityUserId || mode !== 'account' || !activeGardenId) return;
    const userId = storeUserId ?? identityUserId;
    let cancelled = false;
    let stopRealtime: (() => void) | null = null;
    const unregister = registerSyncTriggers();

    // Removed from the garden (or it was deleted): nothing of it stays on this device,
    // and the garden resolution above finds or creates the next one.
    const unsubscribe = syncEvents.on((evt) => {
      if (cancelled || evt.type !== 'membership_lost' || evt.gardenId !== activeGardenId) return;
      void clearLocalAccountData()
        .catch(() => {})
        .then(() => {
          if (!cancelled) setActiveGarden(null);
        });
    });

    (async () => {
      try {
        await runMigrations(storage);
        await ensureSyncScope(userId, activeGardenId);
      } catch (e) {
        if (__DEV__) console.warn('[layout] local storage preparation failed', e);
      }
      // Bug C data repair: re-id legacy non-UUID plan_elements BEFORE the initial sync,
      // so the repaired rows enter the outbox and get pushed. Idempotent + account-only.
      try {
        await repairNonUuidElementIds(mode, activeGardenId);
      } catch (e) {
        if (__DEV__) console.warn('[layout] uuid repair failed', e);
      }
      if (cancelled) return;
      stopRealtime = startRealtimeBridge(activeGardenId);
      try {
        await getSyncWorker().syncAll();
      } catch (e) {
        if (__DEV__) console.warn('[layout] initial syncAll failed', e);
      }
    })();

    return () => {
      cancelled = true;
      unregister();
      unsubscribe();
      stopRealtime?.();
    };
  }, [identityUserId, storeUserId, mode, activeGardenId, setActiveGarden]);

  return <Stack screenOptions={{ headerShown: false }} />;
}

function RootLayoutInner(): React.JSX.Element {
  return (
    <>
      <SplashController />
      <ServiceWorkerController />
      <InstallPromptController />
      <StorageController />
      <GuardedStack />
      <SyncToastHost />
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
