// The decision path of the AI function, without any outside world in it. index.ts hands
// in the real things (auth service, database, model); the tests hand in fakes
// (handler_test.ts). Uses only web standards (Request, Response).
//
// Every request goes through the same steps:
//   1. Who is asking? The sign-in token is checked with the auth service.     (AI-02)
//   2. May they? Member of the garden, monthly limit not used up, not too many
//      requests in the last hour.                                     (AI-02/05/08)
//   3. What for? The app names a feature; prompts and limits live in features.ts.
//   4. The model call.
//   5. The usage book: garden, person, feature, tokens, cost.                 (AI-03)
// The answer is the text plus a code; raw error text never leaves the function (AI-07).

import { buildFeature, type FeatureRequest } from './features.ts';
import { classifyFailure, gate, HTTP_STATUS, RETRYABLE, type AiCode, type FailureKind, type Precheck } from './outcome.ts';
import { costUsd, DEFAULT_MODEL, readUsage, type TokenUsage } from './pricing.ts';

export interface PrecheckResult extends Precheck {
  limit_usd: number;
  spent_usd: number;
}

export interface ModelResult {
  model: string;
  text: string;
  refused: boolean;
  usage: Record<string, unknown> | null;
}

/** What callModel throws when the call did not produce a response. */
export class ModelCallError extends Error {
  constructor(
    readonly kind: FailureKind,
    readonly status?: number,
  ) {
    super(`model call failed: ${kind}${status ? ` ${status}` : ''}`);
  }
}

export interface UsageRow {
  gardenId: string;
  userId: string;
  feature: string;
  model: string | null;
  usage: TokenUsage;
  cost: number;
  status: 'ok' | 'refused' | 'error';
  errorCode?: AiCode;
}

export interface HandlerDeps {
  /** The user id behind a sign-in token, or null when the token is not valid. */
  getUserId(token: string): Promise<string | null>;
  /** Membership and limits for this person in this garden; null when it cannot be asked. */
  precheck(gardenId: string, userId: string): Promise<PrecheckResult | null>;
  /** Is an API key stored? */
  hasKey(): boolean;
  callModel(request: FeatureRequest): Promise<ModelResult>;
  /** Writes one row of the usage book; false when it could not be written. */
  record(row: UsageRow): Promise<boolean>;
  corsHeaders: Record<string, string>;
  log?(message: string, ...details: unknown[]): void;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Room for a handful of downscaled photos (Phase 35). */
export const MAX_BODY_BYTES = 12 * 1024 * 1024;
const NO_USAGE: TokenUsage = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };

export function createHandler(deps: HandlerDeps): (req: Request) => Promise<Response> {
  const json = (body: Record<string, unknown>, status: number): Response =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...deps.corsHeaders, 'Content-Type': 'application/json' },
    });
  const fail = (code: AiCode, extra: Record<string, unknown> = {}): Response =>
    json({ ok: false, code, retryable: RETRYABLE[code], ...extra }, HTTP_STATUS[code]);
  const log = deps.log ?? (() => {});

  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: deps.corsHeaders });
    if (req.method !== 'POST') return fail('bad_request');

    // 1. Who is asking?
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
    if (!token) return fail('not_authenticated');
    const userId = await deps.getUserId(token);
    if (!userId) return fail('not_authenticated');

    // The request itself.
    if (Number(req.headers.get('content-length') ?? '0') > MAX_BODY_BYTES) return fail('bad_request');
    let body: { gardenId?: unknown; feature?: unknown; input?: unknown };
    try {
      body = await req.json();
    } catch {
      return fail('bad_request');
    }
    if (!body || typeof body !== 'object') return fail('bad_request');
    const gardenId = typeof body.gardenId === 'string' && UUID.test(body.gardenId) ? body.gardenId : null;
    if (!gardenId) return fail('bad_request');
    const featureName = typeof body.feature === 'string' ? body.feature : '';
    const feature = buildFeature(body.feature, body.input);
    if (!feature) return fail('bad_request');

    // 2. May they?
    const check = await deps.precheck(gardenId, userId);
    const blocked = gate(check);
    if (blocked) {
      return fail(blocked, check ? { limitUsd: Number(check.limit_usd), spentUsd: Number(check.spent_usd) } : {});
    }
    const limitUsd = Number(check!.limit_usd);
    const spentBefore = Number(check!.spent_usd);

    // 3. Is there a key at all?
    if (!deps.hasKey()) return fail('not_configured');

    // 4. The model call, 5. the usage book.
    try {
      const result = await deps.callModel(feature);
      const usage = readUsage(result.usage);
      const cost = costUsd(result.model, usage);
      const text = result.text.trim();
      const status = result.refused ? 'refused' : text ? 'ok' : 'error';
      const recorded = await deps.record({
        gardenId,
        userId,
        feature: featureName,
        model: result.model,
        usage,
        cost,
        status,
        errorCode: result.refused ? 'refused' : text ? undefined : 'service_error',
      });
      if (!recorded) log('ai: a request could not be written to the usage book');
      const budget = { limitUsd, spentUsd: spentBefore + cost };
      if (result.refused) return fail('refused', budget);
      if (!text) return fail('service_error', budget);
      return json(
        {
          ok: true,
          feature: featureName,
          text,
          usage: { ...usage, costUsd: cost, model: result.model, recorded },
          ...budget,
        },
        200,
      );
    } catch (error) {
      const code: AiCode =
        error instanceof ModelCallError ? classifyFailure(error.kind, error.status) : 'service_error';
      // Code and status only: the error text may quote the request.
      log('ai: model call failed', code, error instanceof ModelCallError ? (error.status ?? 'no-status') : 'unexpected');
      // A request that was sent counts towards the hourly limit, also when it failed.
      await deps.record({
        gardenId,
        userId,
        feature: featureName,
        model: DEFAULT_MODEL,
        usage: NO_USAGE,
        cost: 0,
        status: 'error',
        errorCode: code,
      });
      return fail(code);
    }
  };
}
