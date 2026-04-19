// In-memory Zustand store for Vereinsregeln — Plan 02-04 Task 2-04-01.
// D-11 NO persist middleware — hydration is driven by the useVereinsregeln hook.
// RULES-04 client-side guard: toggleAktiv / removeRule / updateRule are no-ops on
// istBKleingG entries. Three-layer defense is completed by VereinsregelRow (UI)
// and vereinsregelnRepo (server-side / storage guard).
import { create } from 'zustand';
import type { VereinsRegel } from '@spatenstich/shared';

export interface VereinsregelnState {
  rules: VereinsRegel[];
  hydrated: boolean;
  setRules: (rules: VereinsRegel[]) => void;
  addRule: (rule: VereinsRegel) => void;
  toggleAktiv: (ruleId: string) => void;
  removeRule: (ruleId: string) => void;
  updateRule: (ruleId: string, patch: Partial<VereinsRegel>) => void;
  reset: () => void;
}

export const useVereinsregelnStore = create<VereinsregelnState>()((set) => ({
  rules: [],
  hydrated: false,
  setRules: (rules) => set({ rules, hydrated: true }),
  addRule: (rule) => set((s) => ({ rules: [...s.rules, rule] })),
  toggleAktiv: (ruleId) =>
    set((s) => ({
      rules: s.rules.map((r) =>
        r.id === ruleId && !r.istBKleingG ? { ...r, aktiv: !r.aktiv } : r,
      ),
    })),
  removeRule: (ruleId) =>
    set((s) => ({
      // Keep BKleingG entries regardless — UI never calls this for them, but
      // this is a second layer of defense for RULES-04.
      rules: s.rules.filter((r) => r.id !== ruleId || r.istBKleingG),
    })),
  updateRule: (ruleId, patch) =>
    set((s) => ({
      rules: s.rules.map((r) =>
        r.id === ruleId && !r.istBKleingG ? { ...r, ...patch } : r,
      ),
    })),
  reset: () => set({ rules: [], hydrated: false }),
}));
