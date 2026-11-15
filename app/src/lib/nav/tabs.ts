// Phase 37 (NAV3-01): the four areas of the app and which one a route belongs to.
// Pure, so the rules can be tested without a router.

export type TabKey = 'heute' | 'plan' | 'kalender' | 'mehr';

export interface TabItem {
  key: TabKey;
  /** i18n key of the label. */
  label: string;
  /** Where a tap leads. */
  href: string;
}

export const TABS: TabItem[] = [
  { key: 'heute', label: 'nav.heute', href: '/(app)' },
  { key: 'plan', label: 'nav.plan', href: '/(app)/plan' },
  { key: 'kalender', label: 'nav.kalender', href: '/(app)/kalender' },
  { key: 'mehr', label: 'nav.mehr', href: '/(app)/mehr' },
];

/** From this width on the areas stand in a sidebar instead of a bar at the bottom. */
export const SIDEBAR_FROM_PX = 900;

/**
 * The area a route belongs to. `segments` are the route segments as the router gives
 * them, for example ['(app)', 'kalender', '[slug]'].
 */
export function activeTab(segments: readonly string[]): TabKey {
  const [group, first] = segments;
  if (group !== '(app)') return 'heute';
  switch (first) {
    case undefined:
    case 'index':
      return 'heute';
    case 'plan':
      return 'plan';
    case 'kalender':
      return 'kalender';
    default:
      // Settings, garden, account, import, photo check, findings: all reached from "Mehr".
      return 'mehr';
  }
}

/**
 * Screens that take the whole window: the editor (it has its own top bar and needs the
 * room) and the first steps after signing up.
 */
export function isFullScreen(segments: readonly string[]): boolean {
  const [group, first, second] = segments;
  if (group !== '(app)') return true;
  if (first === 'plan' && second === 'edit') return true;
  if (first === 'onboarding') return true;
  return false;
}

/**
 * Pages anyone may read, signed in or not: privacy notes and Impressum. The sign-in guard
 * leaves them alone.
 */
export const PUBLIC_ROUTES = ['datenschutz', 'impressum'] as const;

export function isPublicRoute(segments: readonly string[]): boolean {
  return segments.length > 0 && (PUBLIC_ROUTES as readonly string[]).includes(segments[0]!);
}

/** Titles of the screens, by route name inside the (app) group (i18n keys). */
export const SCREEN_TITLES: Record<string, string> = {
  index: 'nav.heute',
  'plan/index': 'nav.plan',
  'plan/new': 'plan.new.title',
  'kalender/index': 'nav.kalender',
  mehr: 'nav.mehr',
  settings: 'more.account.title',
  'settings/garden': 'more.garden.title',
  'settings/sync': 'more.sync.title',
  'settings/ai': 'more.ai.title',
  'join-garden': 'more.join.title',
  'profile/index': 'more.profile.title',
  'profile/plz': 'more.plz.title',
  'profile/archetype': 'more.archetype.title',
  'import/index': 'import.title',
  'foto/index': 'photo.title',
  'foto/befunde': 'photo.findings.title',
  'foto/pflanze': 'photo.plant.title',
};
