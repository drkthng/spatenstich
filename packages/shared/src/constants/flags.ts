// Phase 20 Plan 02 (D-05/D-06): Compile-Time-Feature-Schalter statt Supabase-Query.
// `feature_flags` (Tabelle + useFlag-Hook) faellt mit Migration 020 komplett weg —
// dieser Export ist die EINZIGE Quelle fuer Feature-Gates im Client. Kein React,
// keine Supabase-Abhaengigkeit, keine Runtime-Aenderung ohne neuen Build.
export const FEATURES = {
  vereinsregeln: false,
} as const;
