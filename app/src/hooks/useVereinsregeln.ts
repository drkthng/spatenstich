// Hydration hook for Vereinsregeln state — Plan 02-04 Task 2-04-01.
// Mirrors the useProfile hook from Plan 02-02: on mount, load persisted rules
// from the mode-aware repo and push them into the Zustand store.
//
// Bug-fix 2026-04-30: Also bridges loaded rules into profileStore so that the
// profile overview page (which reads profileStore.vereinsregeln) reflects the
// persisted state. Previously profileStore.vereinsregeln was never populated.
import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useVereinsregelnStore } from '../stores/vereinsregelnStore';
import { useProfileStore } from '../stores/profileStore';
import { loadVereinsregeln } from '../lib/vereinsregelnRepo';

export interface UseVereinsregelnValue {
  rules: ReturnType<typeof useVereinsregelnStore.getState>['rules'];
  hydrated: boolean;
}

export function useVereinsregeln(): UseVereinsregelnValue {
  const mode = useAuthStore((s) => s.mode);
  const userId = useAuthStore((s) => s.userId);
  const rules = useVereinsregelnStore((s) => s.rules);
  const hydrated = useVereinsregelnStore((s) => s.hydrated);
  const setRules = useVereinsregelnStore((s) => s.setRules);

  useEffect(() => {
    if (!mode || !userId || hydrated) return;
    loadVereinsregeln(mode, userId)
      .then((loaded) => {
        setRules(loaded);
        // Bridge to profileStore so profile overview reflects persisted state.
        useProfileStore.getState().setVereinsregeln(loaded);
      })
      .catch(() => {
        // Silent — UI surfaces missing state via InlineBanner on the profile.
      });
  }, [mode, userId, hydrated, setRules]);

  return { rules, hydrated };
}
