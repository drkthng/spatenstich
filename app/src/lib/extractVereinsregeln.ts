// app/src/lib/extractVereinsregeln.ts
// RULES-01 — client wrapper for the `extract-vereinsregeln` Edge Function.
//
// Contract (matches Plan 02-03 Task 2-03-03):
// - Calls the Edge Function via supabase.functions.invoke(name, { body })
// - Typed return: VereinsRegelCandidate[]
// - Distinguishes 5 error categories via ExtractVereinsregelnError.code:
//     'invalid_input' | 'timeout' | 'cancelled' | 'network' | 'server'
// - Internal timeout TIMEOUT_MS (55 seconds — server Edge Function hard limit is 60s —
//   we fail BEFORE the server gives up, per RESEARCH.md line 476 and UI-SPEC.md
//   line 160).
// - Accepts an optional external AbortSignal so the UI's "Abbrechen" button
//   (UI-SPEC.md line 159) can cancel the call.
//
// Security invariants:
// - NO import of @anthropic-ai/sdk (Anthropic SDK is server-side only — FOUND-06).
// - NO reference to the Anthropic server API key in this file (triple-gated by bundle-scan CI).
// - VereinsRegelCandidate is declared LOCALLY (not imported from @spatenstich/shared)
//   to avoid inter-plan file overlap with Plan 02-01. Plan 02-04 will promote the
//   type to the shared package when it needs it more broadly.

import { supabase } from './supabase';

const TIMEOUT_MS = 55_000;

/**
 * Candidate VereinsRegel returned from PDF extraction — mirrors the Edge
 * Function's server-side type. Omits server-assigned fields (id, user_id,
 * erstellt_am, aktiv) that are attached when the user confirms the rule.
 */
export type VereinsRegelCandidate = {
  titel: string;
  beschreibung?: string;
  wert?: number;
  einheit?: string;
  source: 'pdf_extraction';
  istBKleingG: false;
};

export type ExtractErrorCode =
  | 'invalid_input'
  | 'timeout'
  | 'cancelled'
  | 'network'
  | 'server';

export class ExtractVereinsregelnError extends Error {
  public code: ExtractErrorCode;
  constructor(code: ExtractErrorCode, message: string) {
    super(message);
    this.name = 'ExtractVereinsregelnError';
    this.code = code;
  }
}

export interface ExtractVereinsregelnInput {
  storagePath: string;
  userId: string;
  /**
   * Optional external AbortSignal — when its `abort` event fires, the wrapper
   * rejects with code='cancelled'. Used by the UI's "Abbrechen" button in the
   * Plan 02-04 confirmation screen.
   */
  signal?: AbortSignal;
}

type EdgeResponseBody = {
  rules?: VereinsRegelCandidate[];
  error?: string;
};

/**
 * Extract Vereinsregeln candidates from an uploaded PDF.
 *
 * Rejects with ExtractVereinsregelnError for every failure path so callers get
 * a stable taxonomy (`.code`) for UI error states.
 *
 * Note: supabase-js v2.103.2 `functions.invoke` does not accept an AbortSignal,
 * so our controller races the invoke promise at the wrapper level rather than
 * cancelling the underlying fetch. The Edge Function still enforces its own
 * 60s Supabase-platform timeout server-side.
 */
export async function extractVereinsregeln(
  input: ExtractVereinsregelnInput,
): Promise<VereinsRegelCandidate[]> {
  if (!input.storagePath || !input.userId) {
    throw new ExtractVereinsregelnError(
      'invalid_input',
      'storagePath and userId required',
    );
  }

  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => {
    controller.abort('timeout');
  }, TIMEOUT_MS);

  const onExternalAbort = () => controller.abort('cancelled');
  input.signal?.addEventListener('abort', onExternalAbort);

  // Promise that rejects when our controller aborts — allows us to race
  // the invoke call and report the correct error code even though
  // supabase.functions.invoke cannot be cancelled directly.
  const abortPromise = new Promise<never>((_, reject) => {
    controller.signal.addEventListener('abort', () => {
      const reason = controller.signal.reason;
      const code: ExtractErrorCode =
        reason === 'timeout' ? 'timeout' : 'cancelled';
      reject(new ExtractVereinsregelnError(code, String(reason ?? code)));
    });
  });

  try {
    const invokePromise = supabase.functions.invoke<EdgeResponseBody>(
      'extract-vereinsregeln',
      {
        body: {
          storagePath: input.storagePath,
          userId: input.userId,
        },
      },
    );

    const result = (await Promise.race([invokePromise, abortPromise])) as {
      data: EdgeResponseBody | null;
      error: { message?: string } | null;
    };

    if (result.error) {
      throw new ExtractVereinsregelnError(
        'server',
        result.error.message ?? 'server_error',
      );
    }
    if (result.data?.error) {
      throw new ExtractVereinsregelnError('server', result.data.error);
    }
    return result.data?.rules ?? [];
  } catch (e) {
    if (e instanceof ExtractVereinsregelnError) throw e;
    if (controller.signal.aborted) {
      const reason = controller.signal.reason;
      const code: ExtractErrorCode =
        reason === 'timeout' ? 'timeout' : 'cancelled';
      throw new ExtractVereinsregelnError(code, String(reason ?? code));
    }
    const message = e instanceof Error ? e.message : 'network_error';
    throw new ExtractVereinsregelnError('network', message);
  } finally {
    clearTimeout(timeoutHandle);
    input.signal?.removeEventListener('abort', onExternalAbort);
  }
}
