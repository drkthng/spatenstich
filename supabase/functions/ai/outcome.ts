// The answers the edge function can give, and how failures map onto them.
// Pure TypeScript without imports (see pricing.ts for why).
//
// The app never sees raw error text (AI-07). It gets one of these codes and puts its
// own words to it. The same list lives in packages/shared/src/ai/contract.ts.

export type AiCode =
  | 'not_authenticated' // no valid sign-in
  | 'not_member' // signed in, but not a member of this garden
  | 'bad_request' // unknown feature or malformed input
  | 'budget_exhausted' // the garden's monthly limit is used up
  | 'rate_limited' // this person sent too many requests in the last hour
  | 'not_configured' // no API key stored, or the key is not accepted
  | 'provider_billing' // the Anthropic account has no credit
  | 'refused' // the model declined the request
  | 'overloaded' // the service is busy, try again shortly
  | 'unavailable' // the service could not be reached in time
  | 'service_error'; // anything else that went wrong on the way

export const HTTP_STATUS: Record<AiCode, number> = {
  not_authenticated: 401,
  not_member: 403,
  bad_request: 400,
  budget_exhausted: 402,
  rate_limited: 429,
  not_configured: 503,
  provider_billing: 503,
  refused: 200,
  overloaded: 503,
  unavailable: 504,
  service_error: 502,
};

/** Worth trying again without changing anything? */
export const RETRYABLE: Record<AiCode, boolean> = {
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

export type FailureKind = 'connection' | 'status';

/**
 * Maps a failed model call onto a code. `kind` says whether the service answered at all;
 * `status` is the HTTP status when it did.
 */
export function classifyFailure(kind: FailureKind, status?: number): AiCode {
  if (kind === 'connection') return 'unavailable';
  switch (status) {
    case 401:
    case 403:
      return 'not_configured';
    case 402:
      return 'provider_billing';
    case 408:
    case 504:
      return 'unavailable';
    case 429:
    case 529:
      return 'overloaded';
    default:
      return 'service_error';
  }
}

export interface Precheck {
  member: boolean;
  budget_exhausted: boolean;
  rate_limited: boolean;
}

/** The first reason not to call the model, or null when the request may go ahead. */
export function gate(precheck: Precheck | null | undefined): AiCode | null {
  if (!precheck) return 'service_error';
  if (!precheck.member) return 'not_member';
  if (precheck.budget_exhausted) return 'budget_exhausted';
  if (precheck.rate_limited) return 'rate_limited';
  return null;
}
