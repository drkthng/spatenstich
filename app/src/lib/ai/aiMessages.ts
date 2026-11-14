// Phase 34 (AI-06, AI-07): words for everything that can happen to an AI request, and
// the small formatters the usage screen needs. Pure functions.

import type { AiCode, AiUsageSummary } from '@spatenstich/shared';
import { t } from '../i18n';

/** A sentence a gardener understands. Never raw error text. */
export function aiMessage(code: AiCode): string {
  const key = `ai.error.${code}`;
  const text = t(key);
  return text === key ? t('ai.error.service_error') : text;
}

/** "12,34 $"; amounts under a cent are not shown as "0,00 $". */
export function formatUsd(amount: number): string {
  if (amount > 0 && amount < 0.01) return t('ai.money.underCent');
  return `${amount.toFixed(2).replace('.', ',')} $`;
}

/** "1. Dezember" */
export function formatDay(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'long', timeZone: 'Europe/Berlin' }).format(date);
}

/** "14.11., 20:15" */
export function formatMoment(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('de-DE', {
    day: 'numeric',
    month: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Berlin',
  }).format(date);
}

/** Share of the limit that is used, 0 to 1. */
export function usedShare(summary: Pick<AiUsageSummary, 'limitUsd' | 'spentUsd'>): number {
  if (summary.limitUsd <= 0) return summary.spentUsd > 0 ? 1 : 0;
  return Math.max(0, Math.min(1, summary.spentUsd / summary.limitUsd));
}

export function requestsLine(count: number): string {
  if (count === 0) return t('ai.usage.requestsNone');
  if (count === 1) return t('ai.usage.requestsOne');
  return t('ai.usage.requestsMany', { n: count });
}

/** The line under the bar: what is left, a warning, or the stop. */
export function budgetLine(summary: AiUsageSummary): { text: string; tone: 'normal' | 'warn' | 'blocked' } {
  const date = formatDay(summary.nextMonthStart);
  if (summary.blocked) return { text: t('ai.usage.blocked', { date }), tone: 'blocked' };
  const remaining = t('ai.usage.remaining', { remaining: formatUsd(summary.remainingUsd), date });
  if (summary.warn) return { text: `${t('ai.usage.warn')} ${remaining}`, tone: 'warn' };
  return { text: remaining, tone: 'normal' };
}

/** A typed limit, with a comma or a point. Null when it is not a usable amount. */
export function parseLimit(text: string): number | null {
  const cleaned = text.trim().replace(/\s|\$/g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const value = Number(cleaned);
  return value >= 0 && value <= 1000 ? value : null;
}
