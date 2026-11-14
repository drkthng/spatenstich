// German UI strings with {name} placeholders (Masterplan WP 22.1).
// New code imports `t` from here; older files still carry their own copy of the lookup.
import de from '@spatenstich/shared/i18n/de';

type Vars = Record<string, string | number>;

export function t(key: string, vars?: Vars): string {
  const value = key
    .split('.')
    .reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), de);
  if (typeof value !== 'string') return key;
  if (!vars) return value;
  return value.replace(/\{(\w+)\}/g, (m, name: string) => (name in vars ? String(vars[name]) : m));
}
