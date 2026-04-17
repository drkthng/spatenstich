import * as Sentry from '@sentry/react-native';
import { Stack } from 'expo-router';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: process.env.ENVIRONMENT ?? 'dev',
  tracesSampleRate: 1.0,
  enabled: !!process.env.EXPO_PUBLIC_SENTRY_DSN, // kein Init ohne DSN (lokal)
});

function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}

export default Sentry.wrap(RootLayout);
