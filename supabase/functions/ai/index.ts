// supabase/functions/ai/index.ts
// Phase 34: the one place where the app talks to the Claude API.
//
// The API key is a secret of this function (ANTHROPIC_API_KEY). It never reaches a
// device, the bundle, the repository or a log line. What happens to a request is
// decided in handler.ts; this file only connects it to the real auth service, the
// database and the model.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { corsHeaders } from '../_shared/cors.ts';
import { createHandler, ModelCallError, type PrecheckResult } from './handler.ts';
import { DEFAULT_MODEL } from './pricing.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

// Service role: checks the caller's token, asks the limits, writes the usage book.
const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

Deno.serve(
  createHandler({
    corsHeaders,
    log: (message, ...details) => console.error(message, ...details),

    async getUserId(token) {
      const { data, error } = await admin.auth.getUser(token);
      return error ? null : (data.user?.id ?? null);
    },

    async precheck(gardenId, userId) {
      const { data, error } = await admin.rpc('ai_precheck', {
        p_garden_id: gardenId,
        p_user_id: userId,
      });
      if (error) {
        console.error('ai: precheck failed', error.code ?? 'unknown');
        return null;
      }
      return data as PrecheckResult;
    },

    hasKey: () => Boolean(Deno.env.get('ANTHROPIC_API_KEY')),

    async callModel(request) {
      // The key is read here, handed to the SDK, and goes nowhere else.
      const anthropic = new Anthropic({
        apiKey: Deno.env.get('ANTHROPIC_API_KEY'),
        timeout: request.timeoutMs ?? 90_000,
        // A long photo request is not repeated: a second try would run past the time an
        // edge function may take.
        maxRetries: request.timeoutMs ? 0 : 1,
      });
      try {
        const response = await anthropic.beta.messages.create({
          model: DEFAULT_MODEL,
          max_tokens: request.maxTokens,
          // If the model's safety checks decline a request, the API retries it on a
          // fallback model inside the same call instead of simply stopping.
          betas: ['server-side-fallback-2026-07-01'],
          fallbacks: 'default',
          output_config: request.schema
            ? { effort: request.effort, format: { type: 'json_schema', schema: request.schema } }
            : { effort: request.effort },
          system: request.system,
          messages: request.messages,
        });
        const text = response.content
          .filter((block) => block.type === 'text')
          .map((block) => (block as { text: string }).text)
          .join('\n');
        return {
          model: response.model,
          text,
          refused: response.stop_reason === 'refusal',
          truncated: response.stop_reason === 'max_tokens',
          usage: response.usage as unknown as Record<string, unknown>,
        };
      } catch (error) {
        // Most specific first. Connection errors (and timeouts, a subclass) carry no status.
        if (error instanceof Anthropic.APIConnectionError) throw new ModelCallError('connection');
        if (error instanceof Anthropic.APIError) throw new ModelCallError('status', error.status);
        throw error;
      }
    },

    async record(row) {
      const entry = {
        garden_id: row.gardenId,
        user_id: row.userId,
        feature: row.feature,
        model: row.model,
        input_tokens: row.usage.inputTokens,
        output_tokens: row.usage.outputTokens,
        cache_read_tokens: row.usage.cacheReadTokens,
        cache_write_tokens: row.usage.cacheWriteTokens,
        cost_usd: row.cost,
        status: row.status,
        error_code: row.errorCode ?? null,
      };
      for (let attempt = 0; attempt < 2; attempt++) {
        const { error } = await admin.from('ai_usage').insert(entry);
        if (!error) return true;
        console.error('ai: usage book write failed', error.code ?? 'unknown');
      }
      return false;
    },
  }),
);
