// useProfile — hook returning profile state + setters bound to profileRepo.
// Loads persisted data on first mount; subsequent reads/writes go through profileStore + repo.
// Pattern: 02-PATTERNS.md §"app/src/hooks/useProfile.ts" (analogous to useFlag.ts shape).
//
// Bug-fix 2026-04-30: Also hydrate vereinsregeln from vereinsregelnRepo on mount
// so that the profile overview reflects persisted rules without requiring the user
// to navigate into the vereinsregeln screens first.
import { useEffect } from 'react';
import type { Klimazone, Archetype } from '@spatenstich/shared';
import { useProfileStore } from '../stores/profileStore';
import { useAuthStore } from '../stores/authStore';
import { loadProfile, saveProfile } from '../lib/profileRepo';
import { loadVereinsregeln } from '../lib/vereinsregelnRepo';

export interface UseProfileValue {
  plz: string | null;
  klimazone: Klimazone | null;
  archetype: Archetype | null;
  vereinsregeln: ReturnType<typeof useProfileStore.getState>['vereinsregeln'];
  setPlz: (plz: string, klimazone: Klimazone) => Promise<void>;
  setArchetype: (archetype: Archetype) => Promise<void>;
}

export function useProfile(): UseProfileValue {
  const plz = useProfileStore((s) => s.plz);
  const klimazone = useProfileStore((s) => s.klimazone);
  const archetype = useProfileStore((s) => s.archetype);
  const vereinsregeln = useProfileStore((s) => s.vereinsregeln);
  const storeSetPlz = useProfileStore((s) => s.setPlz);
  const storeSetArchetype = useProfileStore((s) => s.setArchetype);

  useEffect(() => {
    let cancelled = false;
    loadProfile()
      .then((p) => {
        if (cancelled || !p) return;
        if (p.plz && p.klimazone != null) storeSetPlz(p.plz, p.klimazone);
        if (p.archetype) storeSetArchetype(p.archetype);
      })
      .catch(() => {
        // Silent — banners on the Profile screen surface the missing state.
      });

    // Hydrate vereinsregeln from the repo so the profile overview shows the
    // correct count. Previously this was only loaded when the user navigated
    // into the vereinsregeln screens.
    const { mode, userId } = useAuthStore.getState();
    if (mode && userId) {
      loadVereinsregeln(mode, userId)
        .then((rules) => {
          if (cancelled) return;
          useProfileStore.getState().setVereinsregeln(rules);
        })
        .catch(() => {
          // Silent — banner on profile screen surfaces missing state.
        });
    }

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    plz,
    klimazone,
    archetype,
    vereinsregeln,
    setPlz: async (nextPlz, nextKlimazone) => {
      storeSetPlz(nextPlz, nextKlimazone);
      await saveProfile({ plz: nextPlz, klimazone: nextKlimazone });
    },
    setArchetype: async (nextArchetype) => {
      storeSetArchetype(nextArchetype);
      await saveProfile({ archetype: nextArchetype });
    },
  };
}
