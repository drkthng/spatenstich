// (app) group layout (Phase 37, NAV3-01): every signed-in screen sits in the navigation
// frame (bar at the bottom on a phone, sidebar on a wide window) and has a title in
// its header. The editor and the onboarding steps take the whole window.
import { Stack } from 'expo-router';
import { SyncStatusBadge } from '@/src/components/SyncStatusBadge';
import { AppNav } from '@/src/components/nav/AppNav';
import { SCREEN_TITLES } from '@/src/lib/nav/tabs';
import { tokens } from '@/src/theme/tokens';
import { t } from '@/src/lib/i18n';

export default function AppLayout() {
  return (
    <AppNav>
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
