// useProfile — postcode, climate zone, garden type and club rules for the screens.
//
// Phase 33 (SYNC3-06): with an account, postcode, climate zone and garden type belong
// to the garden (gardens.plz / klimazone / archetype). Both members see the same
// values, they survive a reload, and a sync that changes them shows here by itself.
// Without an account they stay in the local profile.

import { useEffect } from 'react';
import type { Klimazone, Archetype } from '@spatenstich/shared';
import { useProfileStore } from '../stores/profileStore';
import { useAuthStore } from '../stores/authStore';
import { loadProfile, saveProfile } from '../lib/profileRepo';
import { loadVereinsregeln } from '../lib/vereinsregelnRepo';
import { loadGarden, updateGarden } from '../lib/gardenRepo';
import { useDataVersion } from '../lib/sync/dataVersion';

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
  const mode = useAuthStore((s) => s.mode);
  const userId = useAuthStore((s) => s.userId);
  const activeGardenId = useAuthStore((s) => s.activeGardenId);
  const gardenVersion = useDataVersion('gardens');

  useEffect(() => {
    let cancelled = false;
    if (mode === 'account') {
      if (activeGardenId) {
        loadGarden(mode, activeGardenId)
          .then((garden) => {
            if (cancelled || !garden) return;
            useProfileStore.setState({
              plz: garden.plz ?? null,
              klimazone: garden.klimazone ?? null,
              archetype: garden.archetype ?? null,
            });
          })
          .catch(() => {
            // Offline with nothing stored yet: the values appear after the first sync.
          });
      }
    } else {
      loadProfile()
        .then((p) => {
          if (cancelled || !p) return;
          if (p.plz && p.klimazone != null) storeSetPlz(p.plz, p.klimazone);
          if (p.archetype) storeSetArchetype(p.archetype);
        })
        .catch(() => {
          // Storage not ready: the defaults stay.
        });
    }
    if (mode && userId) {
      loadVereinsregeln(mode, userId)
        .then((rules) => {
          if (cancelled) return;
          useProfileStore.getState().setVereinsregeln(rules);
        })
        .catch(() => {
          // No rules stored.
        });
    }
    return () => {
      cancelled = true;
    };
  }, [mode, userId, activeGardenId, gardenVersion, storeSetPlz, storeSetArchetype]);

  return {
    plz,
    klimazone,
    archetype,
    vereinsregeln,
    setPlz: async (nextPlz, nextKlimazone) => {
      storeSetPlz(nextPlz, nextKlimazone);
      if (mode === 'account' && activeGardenId && userId) {
        await updateGarden(mode, activeGardenId, userId, { plz: nextPlz, klimazone: nextKlimazone });
      } else {
        await saveProfile({ plz: nextPlz, klimazone: nextKlimazone });
      }
    },
    setArchetype: async (nextArchetype) => {
      storeSetArchetype(nextArchetype);
      if (mode === 'account' && activeGardenId && userId) {
        await updateGarden(mode, activeGardenId, userId, { archetype: nextArchetype });
      } else {
        await saveProfile({ archetype: nextArchetype });
      }
    },
  };
}
