// Root layout — Phase 2: AuthProvider + guard-based routing + SplashScreen control.
// Preserves Sentry.init() at module level and Sentry.wrap() wrapper (Phase 01-03).
//
// [Rule 1 - Bug] The plan's code snippet uses `Stack.Protected guard={...}` — an API
// added in expo-router 5 / Expo SDK 54+. The project is pinned to expo-router 4.0.22
// (Expo SDK 53). The canonical Router 4 equivalent is `<Redirect />` inside a root
// layout conditional on identity. The security properties (no deep-link into (app)
// without identity; no deep-link into (auth) when identity present) are preserved:
//   identity === null → (auth) group; user cannot reach (app) routes
//   identity !== null → (app) group; user cannot reach (auth) routes
// Group layouts (auth)/_layout + (app)/_layout remain as the nested Stack.
//
// Pattern: 02-PATTERNS.md §"app/app/_layout.tsx"; Pitfall 3 (flash of protected content).
import * as React from 'react';
import * as Sentry from '@sentry/react-native';
import { Stack, SplashScreen, Redirect, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '@/src/lib/auth';
import { useAuthStore } from '@/src/stores/authStore';
import { ensureDefaultGardenForUser } from '@/src/lib/inviteCodeRepo';
import '../global.css';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: process.env.ENVIRONMENT ?? 'dev',
  tracesSampleRate: 1.0,
  enabled: !!process.env.EXPO_PUBLIC_SENTRY_DSN, // kein Init ohne DSN (lokal)
});

// Prevent splash from auto-hiding — we hide it manually when auth bootstrap is done.
// Note: grep-friendly call preserved for plan acceptance criterion.
SplashScreen.preventAutoHideAsync().catch(() => {
  // Safe to ignore; calling twice or on web throws.
});

function SplashController(): null {
  const { isLoading } = useAuth();
  React.useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync().catch(() => {
        // Safe to ignore; splash may already be hidden.
      });
    }
  }, [isLoading]);
  return null;
}

/**
 * GuardedStack — Router-4 equivalent of `Stack.Protected`.
 * Named intentionally to document the intent-equivalence with the plan snippet.
 * Redirects unidentified users to (auth) and identified users away from (auth).
 */
function GuardedStack(): React.JSX.Element {
  const { identity, isLoading } = useAuth();
  const segments = useSegments();
  const inAuthGroup = segments[0] === '(auth)';
  const inAppGroup = segments[0] === '(app)';

  const mode = useAuthStore((s) => s.mode);
  const activeGardenId = useAuthStore((s) => s.activeGardenId);
  const setActiveGarden = useAuthStore((s) => s.setActiveGarden);

  // Phase 2.5 / D-12 — Defense-in-Depth: resolve default garden if store is empty.
  // Covers (a) new signUps post-deploy where migrate-flow did not run, (b) v0
  // persist blobs rehydrated with activeGardenId: null, (c) pathological
  // DB cases where migration seed did not land, (d) post-delete-garden (D-16)
  // where user deleted their only garden and a new default must be provisioned.
  // RPC is server-idempotent.
  //
  // Reentrancy-Schutz (WR-02): inFlight-Ref verhindert doppeltes RPC-Feuern,
  // wenn React das Effect mehrfach dispatcht (StrictMode, Hot-Reload, rapide
  // auth-store-Mutationen wie Delete-Garden → setActiveGarden(null) → Re-Run).
  // Server ist idempotent, aber wir vermeiden unnötige Round-Trips + race mit
  // setActiveGarden, während der erste Call noch pending ist.
  const inFlight = React.useRef(false);
  React.useEffect(() => {
    if (!identity || mode !== 'account' || activeGardenId || inFlight.current)
      return;
    inFlight.current = true;
    let cancelled = false;
    (async () => {
      try {
        const gardenId = await ensureDefaultGardenForUser();
        if (!cancelled) setActiveGarden(gardenId);
      } catch (e) {
        // Non-fatal at bootstrap — UI screens will show per-screen errors.
        if (__DEV__) console.warn('ensureDefaultGardenForUser failed', e);
      } finally {
        inFlight.current = false;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [identity, mode, activeGardenId, setActiveGarden]);

  if (isLoading) {
    // Splash still shown via SplashController; render nothing underneath.
    return <Stack screenOptions={{ headerShown: false }} />;
  }
  if (identity === null && !inAuthGroup) {
    return <Redirect href="/(auth)" />;
  }
  if (identity !== null && !inAppGroup) {
    return <Redirect href="/(app)" />;
  }
  return <Stack screenOptions={{ headerShown: false }} />;
}

function RootLayoutInner(): React.JSX.Element {
  return (
    <>
      <SplashController />
      <GuardedStack />
    </>
  );
}

function RootLayout(): React.JSX.Element {
  return (
    <AuthProvider>
      <RootLayoutInner />
    </AuthProvider>
  );
}

export default Sentry.wrap(RootLayout);
