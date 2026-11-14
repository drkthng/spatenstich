// Phase 34: the app side of the AI access. Whatever happens to a request, the app gets
// a code and its own words for it; raw error text never reaches the screen.

process.env['EXPO_PUBLIC_SUPABASE_URL'] = 'https://test.example';
process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] = 'test-anon-key';

const mockInvoke = jest.fn();
const mockRpc = jest.fn();
const mockFrom = jest.fn();

jest.mock('@supabase/supabase-js', () => {
  class FunctionsHttpError extends Error {
    context: unknown;
    constructor(context: unknown) {
      super('Edge Function returned a non-2xx status code');
      this.context = context;
    }
  }
  class FunctionsFetchError extends Error {}
  class FunctionsRelayError extends Error {}
  return { FunctionsHttpError, FunctionsFetchError, FunctionsRelayError };
});

jest.mock('../../supabase', () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => mockInvoke(...args) },
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

let mockAuth: { mode: string | null; activeGardenId: string | null } = { mode: 'account', activeGardenId: 'g-1' };
jest.mock('../../../stores/authStore', () => ({
  useAuthStore: { getState: () => mockAuth },
}));

const mockKv = new Map<string, string>();
jest.mock('../../../storage', () => ({
  storage: {
    get: (key: string) => Promise.resolve(mockKv.get(key) ?? null),
    set: (key: string, value: string) => {
      mockKv.set(key, value);
      return Promise.resolve();
    },
  },
}));

import { FunctionsFetchError, FunctionsHttpError } from '@supabase/supabase-js';
import { AI_RETRYABLE, AI_SERVER_CODES, type AiCode, type AiUsageSummary } from '@spatenstich/shared';
import de from '@spatenstich/shared/i18n/de';
import { callAi, readAiResponse } from '../aiClient';
import { aiMessage, budgetLine, formatUsd, parseLimit, requestsLine, usedShare } from '../aiMessages';
import { entryFromDb, loadAiUsage, loadUsageBook, setAiMonthlyLimit, summaryFromDb } from '../usage';
import { base64Bytes, fitWithin, MAX_IMAGE_EDGE } from '../imageResize';

const setOnline = (online: boolean) => {
  Object.defineProperty(globalThis, 'navigator', { value: { onLine: online }, configurable: true });
};

beforeEach(() => {
  mockInvoke.mockReset();
  mockRpc.mockReset();
  mockFrom.mockReset();
  mockKv.clear();
  mockAuth = { mode: 'account', activeGardenId: 'g-1' };
  setOnline(true);
});

describe('callAi', () => {
  it('sends the feature and the garden, nothing else', async () => {
    mockInvoke.mockResolvedValue({
      data: { ok: true, text: 'Bereit.', usage: { costUsd: 0.0014 }, limitUsd: 100, spentUsd: 1.5 },
      error: null,
    });
    const result = await callAi('test');
    expect(mockInvoke).toHaveBeenCalledWith('ai', { body: { gardenId: 'g-1', feature: 'test' } });
    expect(result).toEqual({ ok: true, text: 'Bereit.', costUsd: 0.0014, limitUsd: 100, spentUsd: 1.5 });
  });

  it('offline: says so without sending anything (AI-06)', async () => {
    setOnline(false);
    const result = await callAi('test');
    expect(mockInvoke).not.toHaveBeenCalled();
    expect(result).toMatchObject({ ok: false, code: 'offline', retryable: true });
  });

  it('without an account or a garden nothing is sent', async () => {
    mockAuth = { mode: 'local', activeGardenId: null };
    expect(await callAi('test')).toMatchObject({ ok: false, code: 'not_authenticated' });
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('reads the code from an error answer of the function', async () => {
    const context = { json: () => Promise.resolve({ ok: false, code: 'budget_exhausted', limitUsd: 100, spentUsd: 100.4 }) };
    mockInvoke.mockResolvedValue({ data: null, error: new (FunctionsHttpError as never as new (c: unknown) => Error)(context) });
    expect(await callAi('test')).toEqual({
      ok: false, code: 'budget_exhausted', retryable: false, limitUsd: 100, spentUsd: 100.4,
    });
  });

  it('a refusal comes with status 200 and is still a failure with its own words (AI-07)', async () => {
    mockInvoke.mockResolvedValue({ data: { ok: false, code: 'refused' }, error: null });
    const result = await callAi('test');
    expect(result).toMatchObject({ ok: false, code: 'refused', retryable: false });
    expect(aiMessage('refused')).toBe('Die KI hat diese Anfrage abgelehnt.');
  });

  it('a request that never got through is "unavailable", or "offline" when the device says so', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: new (FunctionsFetchError as never as new () => Error)() });
    expect(await callAi('test')).toMatchObject({ code: 'unavailable', retryable: true });
    mockInvoke.mockImplementation(() => {
      setOnline(false);
      return Promise.reject(new TypeError('Failed to fetch'));
    });
    expect(await callAi('test')).toMatchObject({ code: 'offline' });
  });

  it('anything unexpected becomes a general error, never raw text', async () => {
    const cases: unknown[] = [
      null,
      'Internal Server Error <html>',
      { ok: true },
      { ok: true, text: '   ' },
      { ok: false, code: 'something_new', message: 'stack trace here' },
      { error: 'sk-ant-leak' },
    ];
    for (const body of cases) {
      const result = readAiResponse(body);
      expect(result).toMatchObject({ ok: false, code: 'service_error' });
      expect(JSON.stringify(result)).not.toContain('stack');
      expect(JSON.stringify(result)).not.toContain('sk-ant');
    }
    const broken = { json: () => Promise.reject(new Error('not json')) };
    mockInvoke.mockResolvedValue({ data: null, error: new (FunctionsHttpError as never as new (c: unknown) => Error)(broken) });
    expect(await callAi('test')).toMatchObject({ code: 'service_error' });
  });
});

describe('words for every outcome', () => {
  it('every code has its own German sentence and a retry flag', () => {
    const codes: AiCode[] = [...AI_SERVER_CODES, 'offline'];
    const sentences = new Set<string>();
    for (const code of codes) {
      const text = aiMessage(code);
      expect(text).not.toBe(`ai.error.${code}`);
      expect(text.length).toBeGreaterThan(20);
      expect(typeof AI_RETRYABLE[code]).toBe('boolean');
      sentences.add(text);
    }
    expect(sentences.size).toBe(codes.length);
    // No code without words, no words without a code.
    expect(Object.keys((de as { ai: { error: object } }).ai.error).sort()).toEqual([...codes].sort());
  });

  it('an unknown code falls back to the general sentence', () => {
    expect(aiMessage('whatever' as AiCode)).toBe(aiMessage('service_error'));
  });
});

describe('budget display (AI-04, AI-05)', () => {
  const summary = (patch: Partial<AiUsageSummary> = {}): AiUsageSummary => ({
    limitUsd: 100,
    spentUsd: 12.34,
    remainingUsd: 87.66,
    requests: 3,
    monthStart: '2026-10-31T23:00:00+00:00',
    nextMonthStart: '2026-11-30T23:00:00+00:00',
    warn: false,
    blocked: false,
    isOwner: true,
    hourlyLimit: 20,
    myRequestsLastHour: 1,
    ...patch,
  });

  it('formats money the German way', () => {
    expect(formatUsd(12.34)).toBe('12,34 $');
    expect(formatUsd(100)).toBe('100,00 $');
    expect(formatUsd(0)).toBe('0,00 $');
    expect(formatUsd(0.0014)).toBe('weniger als 0,01 $');
  });

  it('says what is left, warns from 80 %, and stops at 100 %', () => {
    expect(budgetLine(summary())).toEqual({ text: 'Noch 87,66 $ bis zum 1. Dezember.', tone: 'normal' });
    const warn = budgetLine(summary({ spentUsd: 85, remainingUsd: 15, warn: true }));
    expect(warn.tone).toBe('warn');
    expect(warn.text).toContain('Über 80 %');
    expect(warn.text).toContain('15,00 $');
    const blocked = budgetLine(summary({ spentUsd: 100.2, remainingUsd: 0, blocked: true }));
    expect(blocked.tone).toBe('blocked');
    expect(blocked.text).toContain('bis zum 1. Dezember gesperrt');
    expect(blocked.text).toContain('Alles andere funktioniert weiter');
  });

  it('bar share stays between 0 and 1', () => {
    expect(usedShare({ limitUsd: 100, spentUsd: 25 })).toBe(0.25);
    expect(usedShare({ limitUsd: 100, spentUsd: 180 })).toBe(1);
    expect(usedShare({ limitUsd: 0, spentUsd: 0 })).toBe(0);
    expect(usedShare({ limitUsd: 0, spentUsd: 1 })).toBe(1);
  });

  it('counts requests in words', () => {
    expect(requestsLine(0)).toBe('Noch keine Anfrage in diesem Monat.');
    expect(requestsLine(1)).toBe('1 Anfrage in diesem Monat.');
    expect(requestsLine(7)).toBe('7 Anfragen in diesem Monat.');
  });

  it('reads a typed limit with comma or point and refuses nonsense', () => {
    expect(parseLimit('100')).toBe(100);
    expect(parseLimit(' 49,50 ')).toBe(49.5);
    expect(parseLimit('20.5 $')).toBe(20.5);
    expect(parseLimit('0')).toBe(0);
    for (const bad of ['', 'abc', '-5', '1001', '12,345', '1e3']) expect(parseLimit(bad)).toBeNull();
  });
});

describe('usage from the server', () => {
  const dbSummary = {
    limit_usd: 100, spent_usd: '12.3400', remaining_usd: 87.66, requests: 3,
    month_start: '2026-10-31T23:00:00+00:00', next_month_start: '2026-11-30T23:00:00+00:00',
    warn: false, blocked: false, is_owner: false, hourly_limit: 20, my_requests_last_hour: 2,
  };

  it('maps the summary and keeps a copy for times without a connection', async () => {
    mockRpc.mockResolvedValue({ data: dbSummary, error: null });
    const fresh = await loadAiUsage('g-1');
    expect(mockRpc).toHaveBeenCalledWith('ai_usage_summary', { p_garden_id: 'g-1' });
    expect(fresh).toMatchObject({ stale: false, summary: { limitUsd: 100, spentUsd: 12.34, isOwner: false } });

    mockRpc.mockRejectedValue(new TypeError('Failed to fetch'));
    const offline = await loadAiUsage('g-1');
    expect(offline).toMatchObject({ stale: true, summary: { spentUsd: 12.34 } });
    expect(await loadAiUsage('g-other')).toBeNull();
  });

  it('setting the limit reports why it did not work', async () => {
    mockRpc.mockResolvedValue({ data: { ...dbSummary, limit_usd: 50 }, error: null });
    const ok = await setAiMonthlyLimit('g-1', 50);
    expect(mockRpc).toHaveBeenCalledWith('set_ai_monthly_limit', { p_garden_id: 'g-1', p_limit_usd: 50 });
    expect(ok).toMatchObject({ ok: true, view: { summary: { limitUsd: 50 } } });
    mockRpc.mockResolvedValue({ data: null, error: { code: '42501' } });
    expect(await setAiMonthlyLimit('g-1', 50)).toEqual({ ok: false, error: 'not_owner' });
    mockRpc.mockResolvedValue({ data: null, error: { code: '22023' } });
    expect(await setAiMonthlyLimit('g-1', 5000)).toEqual({ ok: false, error: 'out_of_range' });
    mockRpc.mockRejectedValue(new Error('x'));
    expect(await setAiMonthlyLimit('g-1', 50)).toEqual({ ok: false, error: 'failed' });
  });

  it('reads the usage book, newest first, and survives an error', async () => {
    const limit = jest.fn().mockResolvedValue({
      data: [{ id: 'u1', user_id: 'a', feature: 'test', model: 'claude-opus-5-5', input_tokens: 60, output_tokens: 40, cost_usd: '0.001040', status: 'ok', created_at: '2026-11-14T20:15:00+00:00' }],
      error: null,
    });
    const order = jest.fn(() => ({ limit }));
    const eq = jest.fn(() => ({ order }));
    mockFrom.mockReturnValue({ select: jest.fn(() => ({ eq })) });
    const rows = await loadUsageBook('g-1');
    expect(mockFrom).toHaveBeenCalledWith('ai_usage');
    expect(eq).toHaveBeenCalledWith('garden_id', 'g-1');
    expect(order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(rows).toEqual([
      { id: 'u1', userId: 'a', feature: 'test', model: 'claude-opus-5-5', inputTokens: 60, outputTokens: 40, costUsd: 0.00104, status: 'ok', createdAt: '2026-11-14T20:15:00+00:00' },
    ]);
    limit.mockResolvedValue({ data: null, error: { code: '42501' } });
    expect(await loadUsageBook('g-1')).toEqual([]);
  });

  it('mappers tolerate missing fields', () => {
    expect(summaryFromDb({})).toMatchObject({ limitUsd: 0, spentUsd: 0, warn: false, blocked: false, isOwner: false });
    expect(entryFromDb({ id: 1, user_id: 2, feature: 'x', status: 'weird' })).toMatchObject({ status: 'ok', costUsd: 0, model: null });
  });
});

describe('photo size (AI-08)', () => {
  it('a phone photo is brought down to the longest edge allowed', () => {
    expect(fitWithin(4032, 3024)).toEqual({ width: 1568, height: 1176, scaled: true });
    expect(fitWithin(3024, 4032)).toEqual({ width: 1176, height: 1568, scaled: true });
    expect(Math.max(...Object.values(fitWithin(8000, 100)).filter((v): v is number => typeof v === 'number'))).toBe(MAX_IMAGE_EDGE);
  });
  it('a small picture is left as it is, never enlarged', () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600, scaled: false });
    expect(fitWithin(1568, 1568)).toEqual({ width: 1568, height: 1568, scaled: false });
    expect(fitWithin(0, 0)).toEqual({ width: 0, height: 0, scaled: false });
  });
  it('an extreme strip keeps at least one pixel', () => {
    expect(fitWithin(20000, 5)).toEqual({ width: 1568, height: 1, scaled: true });
  });
  it('knows how many bytes a base64 string stands for', () => {
    expect(base64Bytes('QUJD')).toBe(3);
    expect(base64Bytes('QUI=')).toBe(2);
    expect(base64Bytes('QQ==')).toBe(1);
  });
});
