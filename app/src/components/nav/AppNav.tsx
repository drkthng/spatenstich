// Phase 37 (NAV3-01, NAV3-05): the frame around every signed-in screen. Four areas —
// Heute, Plan, Kalender, Mehr — as a bar at the bottom on a phone and as a sidebar on a
// wide window. The editor and the first steps after signing up take the whole window.
//
// The bar keeps clear of the phone's gesture area (safe-area inset), and it is part of
// the page layout, not laid over it, so it never covers content or buttons.

import * as React from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { CalendarDays, Home, Map as MapIcon, Menu } from 'lucide-react-native';
import { activeTab, isFullScreen, SIDEBAR_FROM_PX, TABS, type TabKey } from '@/src/lib/nav/tabs';
import { tokens } from '@/src/theme/tokens';
import { t } from '@/src/lib/i18n';

const ICONS: Record<TabKey, typeof Home> = { heute: Home, plan: MapIcon, kalender: CalendarDays, mehr: Menu };

/** `env(safe-area-inset-*)` is CSS; React Native for Web passes it through. */
const safe = (side: 'bottom' | 'left' | 'top'): string => `env(safe-area-inset-${side}, 0px)`;

export function AppNav({
  children,
  segments: given,
}: {
  children: React.ReactNode;
  /** The route segments, for a caller that already knows them; otherwise asked from the router. */
  segments?: readonly string[];
}): React.JSX.Element {
  const fromRouter: readonly string[] = useSegments();
  const segments = given ?? fromRouter;
  const router = useRouter();
  const { width } = useWindowDimensions();

  if (isFullScreen(segments)) return <View style={{ flex: 1 }}>{children}</View>;

  const current = activeTab(segments);
  const wide = width >= SIDEBAR_FROM_PX;

  const items = TABS.map((tab) => {
    const Icon = ICONS[tab.key];
    const active = tab.key === current;
    const color = active ? tokens.color.primary : tokens.color.inkMuted;
    return (
      <Pressable
        key={tab.key}
        // navigate, not push: going to an area you are already in adds no history entry.
        onPress={() => router.navigate(tab.href as never)}
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
        aria-selected={active}
        accessibilityLabel={t(tab.label)}
        testID={`nav-${tab.key}`}
        style={
          wide
            ? { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, paddingHorizontal: 16 }
            : { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 56, gap: 2 }
        }
      >
        <Icon size={wide ? 22 : 24} color={color} strokeWidth={active ? 2.4 : 1.8} />
        <Text
          className={wide ? 'font-body text-base' : 'font-body text-xs'}
          style={{ color, fontWeight: active ? '600' : '400' }}
        >
          {t(tab.label)}
        </Text>
      </Pressable>
    );
  });

  if (wide) {
    return (
      <View style={{ flex: 1, flexDirection: 'row' }} testID="app-nav-wide">
        <View
          accessibilityRole="tablist"
          testID="nav-sidebar"
          style={{
            width: 200,
            paddingTop: 16,
            paddingLeft: safe('left') as never,
            borderRightWidth: 1,
            borderRightColor: tokens.color.line,
            backgroundColor: tokens.color.surface2,
          }}
        >
          <Text className="font-display text-xl text-ink px-4 pb-4">{t('nav.appName')}</Text>
          {items}
        </View>
        <View style={{ flex: 1 }}>{children}</View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }} testID="app-nav-narrow">
      <View style={{ flex: 1 }}>{children}</View>
      <View
        accessibilityRole="tablist"
        testID="nav-tabbar"
        style={{
          flexDirection: 'row',
          borderTopWidth: 1,
          borderTopColor: tokens.color.line,
          backgroundColor: tokens.color.surface2,
          paddingBottom: safe('bottom') as never,
        }}
      >
        {items}
      </View>
    </View>
  );
}
