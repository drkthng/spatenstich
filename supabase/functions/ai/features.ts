// What the app may ask the model to do. The app names a feature and sends that feature's
// input; it never sends a prompt, a model name or a token limit of its own. That keeps
// the function from being usable as a general-purpose proxy on Dirk's API key.
//
// Phase 34 has one feature, the connection test. Photo comparison (Phase 35) and task
// sorting (Phase 36) add theirs here.
// Pure TypeScript without imports (see pricing.ts for why).

export type Effort = 'low' | 'medium' | 'high';

export interface FeatureRequest {
  system: string;
  messages: { role: 'user'; content: string }[];
  maxTokens: number;
  effort: Effort;
}

export type FeatureBuilder = (input: unknown) => FeatureRequest | null;

const GARDEN_HELPER =
  'Du bist der Gartenhelfer der Kleingarten-App Spatenstich. Du sprichst Deutsch und duzt die Person.';

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
};

export function buildFeature(feature: unknown, input: unknown): FeatureRequest | null {
  if (typeof feature !== 'string' || !Object.prototype.hasOwnProperty.call(FEATURES, feature)) return null;
  return FEATURES[feature]!(input);
}
