export const ARCHETYPES = {
  SELBSTVERSORGER: 'selbstversorger',
  FAMILIE: 'familien_naschgarten',
  MIX: 'mix_ausgewogen',
  ZIER: 'zier_erholung',
  BIODIVERSITAET: 'biodiversitaet',
  KRAEUTER: 'kraeuter_apotheker',
} as const;
export type Archetype = typeof ARCHETYPES[keyof typeof ARCHETYPES];
