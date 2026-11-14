// Phase 34 (AI-03, AI-04, AI-05): the month's budget and the usage book, as the app
// reads them. Both come straight from the server; the last summary is kept on the device
// so the screen has something to show without a connection.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { AiUsageEntry, AiUsageSummary } from '@spatenstich/shared';
import { supabase } from '../supabase';
import { storage } from '../../storage';

// The typed client does not know the Phase 34 tables and functions yet.
const db = supabase as unknown as SupabaseClient;

export const AI_USAGE_CACHE_PREFIX = 'ai_usage:';

export interface CachedSummary {
  summary: AiUsageSummary;
  fetchedAt: string;
}

export interface UsageView extends CachedSummary {
  /** True when the server could not be asked and this is the last known state. */
  stale: boolean;
}

const n = (value: unknown): number => {
  const parsed = typeof value === 'string' ? Number(value) : value;
  return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : 0;
};

export function summaryFromDb(row: Record<string, unknown>): AiUsageSummary {
  return {
    limitUsd: n(row['limit_usd']),
    spentUsd: n(row['spent_usd']),
    remainingUsd: n(row['remaining_usd']),
    requests: n(row['requests']),
    monthStart: String(row['month_start'] ?? ''),
    nextMonthStart: String(row['next_month_start'] ?? ''),
    warn: row['warn'] === true,
    blocked: row['blocked'] === true,
    isOwner: row['is_owner'] === true,
    hourlyLimit: n(row['hourly_limit']),
    myRequestsLastHour: n(row['my_requests_last_hour']),
  };
}

export function entryFromDb(row: Record<string, unknown>): AiUsageEntry {
  const status = row['status'];
  return {
    id: String(row['id']),
    userId: String(row['user_id']),
    feature: String(row['feature']),
    model: typeof row['model'] === 'string' ? row['model'] : null,
    inputTokens: n(row['input_tokens']),
    outputTokens: n(row['output_tokens']),
    costUsd: n(row['cost_usd']),
    status: status === 'refused' || status === 'error' ? status : 'ok',
    createdAt: String(row['created_at'] ?? ''),
  };
}

async function remember(gardenId: string, summary: AiUsageSummary): Promise<CachedSummary> {
  const cached: CachedSummary = { summary, fetchedAt: new Date().toISOString() };
  try {
    await storage.set(`${AI_USAGE_CACHE_PREFIX}${gardenId}`, JSON.stringify(cached));
  } catch {
    // The screen still shows the fresh value; only the offline copy is missing.
  }
  return cached;
}

async function recall(gardenId: string): Promise<CachedSummary | null> {
  try {
    const raw = await storage.get(`${AI_USAGE_CACHE_PREFIX}${gardenId}`);
    return raw ? (JSON.parse(raw) as CachedSummary) : null;
  } catch {
    return null;
  }
}

/** The month's budget: fresh from the server, or the last known state, or null. */
export async function loadAiUsage(gardenId: string): Promise<UsageView | null> {
  try {
    const { data, error } = await db.rpc('ai_usage_summary', { p_garden_id: gardenId });
    if (error || !data) throw error ?? new Error('no data');
    const cached = await remember(gardenId, summaryFromDb(data as Record<string, unknown>));
    return { ...cached, stale: false };
  } catch {
    const cached = await recall(gardenId);
    return cached ? { ...cached, stale: true } : null;
  }
}

export type SetLimitError = 'not_owner' | 'out_of_range' | 'failed';

/** Sets the monthly limit (owner only). Returns the new summary or why it did not work. */
export async function setAiMonthlyLimit(
  gardenId: string,
  limitUsd: number,
): Promise<{ ok: true; view: UsageView } | { ok: false; error: SetLimitError }> {
  try {
    const { data, error } = await db.rpc('set_ai_monthly_limit', {
      p_garden_id: gardenId,
      p_limit_usd: limitUsd,
    });
    if (error) {
      const code = (error as { code?: string }).code;
      return { ok: false, error: code === '42501' ? 'not_owner' : code === '22023' ? 'out_of_range' : 'failed' };
    }
    const cached = await remember(gardenId, summaryFromDb(data as Record<string, unknown>));
    return { ok: true, view: { ...cached, stale: false } };
  } catch {
    return { ok: false, error: 'failed' };
  }
}

/** The newest lines of the usage book. Empty when it cannot be read. */
export async function loadUsageBook(gardenId: string, limit = 30): Promise<AiUsageEntry[]> {
  try {
    const { data, error } = await db
      .from('ai_usage')
      .select('id, user_id, feature, model, input_tokens, output_tokens, cost_usd, status, created_at')
      .eq('garden_id', gardenId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return (data as Record<string, unknown>[]).map(entryFromDb);
  } catch {
    return [];
  }
}
