// Phase 34: what the app and the AI edge function say to each other.
// The function (supabase/functions/ai) keeps its own copy of the code list in
// outcome.ts, because it is built separately. Keep the two in step.

/** Codes the edge function answers with when a request did not produce a result. */
export const AI_SERVER_CODES = [
  'not_authenticated',
  'not_member',
  'bad_request',
  'budget_exhausted',
  'rate_limited',
  'not_configured',
  'provider_billing',
  'refused',
  'overloaded',
  'unavailable',
  'service_error',
] as const;

export type AiServerCode = (typeof AI_SERVER_CODES)[number];

/** `offline` is decided on the device: the request was never sent. */
export type AiCode = AiServerCode | 'offline';

/** Worth trying again without changing anything? */
export const AI_RETRYABLE: Record<AiCode, boolean> = {
  offline: true,
  not_authenticated: false,
  not_member: false,
  bad_request: false,
  budget_exhausted: false,
  rate_limited: true,
  not_configured: false,
  provider_billing: false,
  refused: false,
  overloaded: true,
  unavailable: true,
  service_error: true,
};

export function isAiServerCode(value: unknown): value is AiServerCode {
  return typeof value === 'string' && (AI_SERVER_CODES as readonly string[]).includes(value);
}

/** The features the edge function knows. */
export type AiFeature = 'test';

export interface AiSuccess {
  ok: true;
  text: string;
  costUsd: number;
  limitUsd: number | null;
  spentUsd: number | null;
}

export interface AiFailure {
  ok: false;
  code: AiCode;
  retryable: boolean;
  limitUsd: number | null;
  spentUsd: number | null;
}

export type AiResult = AiSuccess | AiFailure;

/** What both members see about the month's budget. */
export interface AiUsageSummary {
  limitUsd: number;
  spentUsd: number;
  remainingUsd: number;
  requests: number;
  monthStart: string;
  nextMonthStart: string;
  /** From 80 % of the limit. */
  warn: boolean;
  /** At 100 %: further requests are refused until the month changes. */
  blocked: boolean;
  isOwner: boolean;
  hourlyLimit: number;
  myRequestsLastHour: number;
}

/** One line of the usage book. */
export interface AiUsageEntry {
  id: string;
  userId: string;
  feature: string;
  model: string | null;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  status: 'ok' | 'refused' | 'error';
  createdAt: string;
}
