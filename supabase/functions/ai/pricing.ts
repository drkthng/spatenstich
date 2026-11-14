// What a request costs, from the token counts the API reports.
// Pure TypeScript without imports, so the same file runs in the edge function (Deno)
// and in its tests (handler_test.ts, run with `deno test`).
//
// Prices in US dollars per million tokens, Anthropic first-party rates as of 2026-11.
// A cache write costs 1.25 times the input price (5-minute cache).

export interface ModelPrice {
  input: number;
  output: number;
  cacheRead: number;
}

export const DEFAULT_MODEL = 'claude-opus-5-5';

export const PRICES: Record<string, ModelPrice> = {
  'claude-opus-5-5': { input: 4, output: 20, cacheRead: 0.2 },
  'claude-opus-5': { input: 5, output: 25, cacheRead: 0.5 },
  'claude-opus-4-8': { input: 5, output: 25, cacheRead: 0.5 },
  'claude-sonnet-5-5': { input: 2, output: 10, cacheRead: 0.1 },
  'claude-sonnet-5': { input: 2, output: 10, cacheRead: 0.2 },
  'claude-haiku-5-5': { input: 0.1, output: 0.5, cacheRead: 0.01 },
};

/**
 * A model that is not in the table (a fallback this file does not know yet) is charged
 * at the dearest known rate, so the usage book never shows less than was spent.
 */
export const UNKNOWN_MODEL_PRICE: ModelPrice = { input: 8, output: 40, cacheRead: 0.8 };

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

export function priceFor(model: string | null | undefined): ModelPrice {
  if (!model) return UNKNOWN_MODEL_PRICE;
  return PRICES[model] ?? UNKNOWN_MODEL_PRICE;
}

/** Cost in US dollars, rounded up to a millionth of a dollar. */
export function costUsd(model: string | null | undefined, usage: TokenUsage): number {
  const price = priceFor(model);
  const dollars =
    (usage.inputTokens * price.input +
      usage.outputTokens * price.output +
      usage.cacheReadTokens * price.cacheRead +
      usage.cacheWriteTokens * price.input * 1.25) /
    1_000_000;
  return Math.ceil(dollars * 1_000_000) / 1_000_000;
}

/** Token counts from an API response's `usage` object; missing fields count as zero. */
export function readUsage(usage: Record<string, unknown> | null | undefined): TokenUsage {
  const n = (key: string): number => {
    const value = usage?.[key];
    return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  };
  return {
    inputTokens: n('input_tokens'),
    outputTokens: n('output_tokens'),
    cacheReadTokens: n('cache_read_input_tokens'),
    cacheWriteTokens: n('cache_creation_input_tokens'),
  };
}
