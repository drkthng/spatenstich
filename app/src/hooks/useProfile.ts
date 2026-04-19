// useProfile — hook returning profile state + setters bound to profileRepo.
// Loads persisted data on first mount; subsequent reads/writes go through profileStore + repo.
// Pattern: 02-PATTERNS.md §"app/src/hooks/useProfile.ts" (analogous to useFlag.ts shape).
import { useEffect } from 'react';
import type { Klimazone, Archetype } from '@spatenstich/shared';
import { useProfileStore } from '../stores/profileStore';
import { loadProfile, saveProfile } from '../lib/profileRepo';

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
