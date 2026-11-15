// What the app may ask the model to do. The app names a feature and sends that feature's
// input; it never sends a prompt, a model name or a token limit of its own. That keeps
// the function from being usable as a general-purpose proxy on Dirk's API key.
//
// Phase 34: the connection test. Phase 35: photo comparison and its close-up follow-up.
// Phase 36: the order of today's tasks.
// Pure TypeScript without imports from outside this folder (see pricing.ts for why).

import {
  closeupPrompt,
  normalizeResult,
  photoCheckPrompt,
  readCloseupInput,
  readPhotoCheckInput,
  RESULT_SCHEMA,
  type ContentBlock,
} from './photo.ts';
import { normalizeSort, readTaskSortInput, SORT_SCHEMA, taskSortPrompt } from './tasks.ts';

export type Effort = 'low' | 'medium' | 'high';

export interface FeatureRequest {
  system: string;
  messages: { role: 'user'; content: string | ContentBlock[] }[];
  maxTokens: number;
  effort: Effort;
  /** JSON shape the answer must have (structured outputs). */
  schema?: Record<string, unknown>;
  /** Turns the answer text into the data the app receives; null when it is unusable. */
  parse?: (text: string) => unknown | null;
  /** How long the model call may take. */
  timeoutMs?: number;
}

export type FeatureBuilder = (input: unknown) => FeatureRequest | null;

const GARDEN_HELPER =
  'Du bist der Gartenhelfer der Kleingarten-App Spatenstich. Du sprichst Deutsch und duzt die Person.';

// Edge functions must answer within 150 seconds; leave room for the usage book.
const PHOTO_TIMEOUT_MS = 125_000;

export const FEATURES: Record<string, FeatureBuilder> = {
  // A tiny request that proves the whole chain works: sign-in, membership, key, model,
  // usage book. Takes no input, so there is nothing a caller could steer.
  test: () => ({
    system: GARDEN_HELPER,
    messages: [
      {
        role: 'user',
        content:
          'Das ist ein Verbindungstest aus den Einstellungen der App. Antworte mit genau einem kurzen, freundlichen Satz, dass du für den Garten bereit bist.',
      },
    ],
    // Thinking counts towards this limit; the answer itself is one sentence.
    maxTokens: 2000,
    effort: 'low',
  }),

  // Up to six photos against the plan. The answer is a list of findings (photo.ts).
  photo_check: (raw) => {
    const input = readPhotoCheckInput(raw);
    if (!input) return null;
    const prompt = photoCheckPrompt(input);
    return {
      system: prompt.system,
      messages: [{ role: 'user', content: prompt.content }],
      // Thinking and the findings share this limit.
      maxTokens: 12_000,
      effort: 'medium',
      schema: RESULT_SCHEMA,
      parse: (text) => normalizeResult(text, input.elements),
      timeoutMs: PHOTO_TIMEOUT_MS,
    };
  },

  // A close-up the model asked for; the answer replaces the earlier finding.
  photo_closeup: (raw) => {
    const input = readCloseupInput(raw);
    if (!input) return null;
    const prompt = closeupPrompt(input);
    return {
      system: prompt.system,
      messages: [{ role: 'user', content: prompt.content }],
      maxTokens: 6000,
      effort: 'medium',
      schema: RESULT_SCHEMA,
      parse: (text) => {
        const result = normalizeResult(text, input.elements);
        return result && result.findings.length > 0 ? result : null;
      },
      timeoutMs: PHOTO_TIMEOUT_MS,
    };
  },

  // The order of today's tasks, with one sentence of reason each (tasks.ts). The list
  // itself comes from the app; the model cannot add, drop or change a task.
  task_sort: (raw) => {
    const input = readTaskSortInput(raw);
    if (!input) return null;
    const prompt = taskSortPrompt(input);
    return {
      system: prompt.system,
      messages: [{ role: 'user', content: prompt.text }],
      maxTokens: 6000,
      effort: 'low',
      schema: SORT_SCHEMA,
      parse: (text) => normalizeSort(text, input.tasks),
    };
  },
};

export function buildFeature(feature: unknown, input: unknown): FeatureRequest | null {
  if (typeof feature !== 'string' || !Object.prototype.hasOwnProperty.call(FEATURES, feature)) return null;
  return FEATURES[feature]!(input);
}
