import * as React from 'react';
import { Platform } from 'react-native';
import { Stack, SplashScreen, useSegments, useRouter } from 'expo-router';

if (Platform.OS === 'web') {
  const { LogBox } = require('react-native');
  LogBox.ignoreAllLogs(true);
}

import { AuthProvider, useAuth } from '@/src/lib/auth';
import '../global.css';

SplashScreen.preventAutoHideAsync().catch(() => {});

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
  const hasNavigated = React.useRef(false);

  React.useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inAppGroup = segments[0] === '(app)';

    if (identity === null && !inAuthGroup) {
      hasNavigated.current = true;
      router.replace('/(auth)');
    } else if (identity !== null && !inAppGroup) {
      hasNavigated.current = true;
      router.replace('/(app)');
    }
  }, [identity, isLoading, segments, router]);

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

export default function RootLayout(): React.JSX.Element {
  return (
    <AuthProvider>
      <RootLayoutInner />
    </AuthProvider>
  );
}
