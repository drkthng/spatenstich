// Phase 37 (NAV3-01): which area a route belongs to, which screens take the whole
// window, and that every screen has a title.

import de from '@spatenstich/shared/i18n/de';
import { activeTab, isFullScreen, SCREEN_TITLES, TABS } from '../nav/tabs';

const lookup = (key: string): unknown =>
  key.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), de);

describe('the four areas', () => {
  it('are Heute, Plan, Kalender and Mehr, each with a label and a place to go', () => {
    expect(TABS.map((tab) => tab.key)).toEqual(['heute', 'plan', 'kalender', 'mehr']);
    expect(TABS.map((tab) => lookup(tab.label))).toEqual(['Heute', 'Plan', 'Kalender', 'Mehr']);
    expect(TABS.map((tab) => tab.href)).toEqual(['/(app)', '/(app)/plan', '/(app)/kalender', '/(app)/mehr']);
  });

  it('every route belongs to one area', () => {
    expect(activeTab(['(app)'])).toBe('heute');
    expect(activeTab(['(app)', 'index'])).toBe('heute');
    expect(activeTab(['(app)', 'plan'])).toBe('plan');
    expect(activeTab(['(app)', 'plan', 'new'])).toBe('plan');
    expect(activeTab(['(app)', 'kalender'])).toBe('kalender');
    expect(activeTab(['(app)', 'kalender', '[slug]'])).toBe('kalender');
    // Everything else is reached from "Mehr".
    for (const first of ['mehr', 'settings', 'profile', 'import', 'foto', 'join-garden']) {
      expect(activeTab(['(app)', first])).toBe('mehr');
    }
    expect(activeTab(['(app)', 'settings', 'garden'])).toBe('mehr');
  });

  it('the editor and the first steps take the whole window; nothing else does', () => {
    expect(isFullScreen(['(app)', 'plan', 'edit'])).toBe(true);
    expect(isFullScreen(['(app)', 'onboarding', 'groesse'])).toBe(true);
    expect(isFullScreen(['(auth)', 'login'])).toBe(true);
    expect(isFullScreen(['(app)'])).toBe(false);
    expect(isFullScreen(['(app)', 'plan'])).toBe(false);
    expect(isFullScreen(['(app)', 'plan', 'new'])).toBe(false);
    expect(isFullScreen(['(app)', 'mehr'])).toBe(false);
    expect(isFullScreen(['(app)', 'foto', 'befunde'])).toBe(false);
  });
});

describe('every screen has a title', () => {
  it('each title key resolves to German text', () => {
    for (const [route, key] of Object.entries(SCREEN_TITLES)) {
      const text = lookup(key);
      expect(typeof text).toBe('string');
      expect((text as string).length).toBeGreaterThan(2);
      expect(text).not.toBe(key);
      expect(route.length).toBeGreaterThan(0);
    }
  });

  it('covers the screens that do not set a title themselves', () => {
    for (const route of ['index', 'mehr', 'settings', 'settings/garden', 'settings/sync', 'settings/ai', 'join-garden', 'profile/index', 'profile/plz', 'profile/archetype']) {
      expect(SCREEN_TITLES[route]).toBeTruthy();
    }
  });
});
