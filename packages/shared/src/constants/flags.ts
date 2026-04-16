export const FLAGS = { EXAMPLE: 'example_flag' } as const;
export type FlagKey = typeof FLAGS[keyof typeof FLAGS];
