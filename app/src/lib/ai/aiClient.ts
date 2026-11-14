// Phase 34: the app's only way to the AI. It calls the edge function `ai`; the API key
// lives there and never comes near this file.
//
// Whatever happens, the caller gets a result object, never an exception and never raw
// error text (AI-06, AI-07). `aiMessage()` in aiMessages.ts turns a code into words.

import { FunctionsFetchError, FunctionsHttpError } from '@supabase/supabase-js';
import {
  AI_RETRYABLE,
  isAiServerCode,
  type AiCode,
  type AiFailure,
  type AiFeature,
  type AiResult,
} from '@spatenstich/shared';
import { supabase } from '../supabase';
import { useAuthStore } from '../../stores/authStore';

function failure(code: AiCode, body?: Record<string, unknown> | null): AiFailure {
  return {
    ok: false,
    code,
    retryable: AI_RETRYABLE[code],
    limitUsd: num(body?.['limitUsd']),
    spentUsd: num(body?.['spentUsd']),
  };
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

/** Reads the function's answer, whatever HTTP status it came with. */
export function readAiResponse(body: unknown): AiResult {
  if (!body || typeof body !== 'object') return failure('service_error');
  const data = body as Record<string, unknown>;
  if (data['ok'] === true && typeof data['text'] === 'string' && data['text'].trim().length > 0) {
    const usage = (data['usage'] ?? {}) as Record<string, unknown>;
    return {
      ok: true,
      text: data['text'],
      costUsd: num(usage['costUsd']) ?? 0,
      limitUsd: num(data['limitUsd']),
      spentUsd: num(data['spentUsd']),
    };
  }
  return failure(isAiServerCode(data['code']) ? data['code'] : 'service_error', data);
}

/**
 * Sends one request to the AI. `feature` names what is wanted; the prompt, the model and
 * the limits are the server's business.
 */
export async function callAi(feature: AiFeature, input?: unknown): Promise<AiResult> {
  const { mode, activeGardenId } = useAuthStore.getState();
  if (mode !== 'account' || !activeGardenId) return failure('not_authenticated');
  if (isOffline()) return failure('offline');

  try {
    const { data, error } = await supabase.functions.invoke('ai', {
      body: { gardenId: activeGardenId, feature, ...(input === undefined ? {} : { input }) },
    });
    if (!error) return readAiResponse(data);
    if (error instanceof FunctionsHttpError) {
      // The function answered with an error status; its body carries the code.
      try {
        return readAiResponse(await (error.context as Response).json());
      } catch {
        return failure('service_error');
      }
    }
    if (error instanceof FunctionsFetchError) return failure(isOffline() ? 'offline' : 'unavailable');
    return failure('service_error');
  } catch {
    return failure(isOffline() ? 'offline' : 'unavailable');
  }
}
