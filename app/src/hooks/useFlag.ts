import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { FlagKey } from '@spatenstich/shared';

/**
 * FOUND-04: Feature-Flag-Hook
 * Reads the current value of a feature flag from the `feature_flags` table.
 * Cached for 5 minutes (staleTime) — no re-fetch within the window.
 * Global flags (user_id=NULL) and user-specific flags are both readable.
 *
 * Usage:
 *   const isEnabled = useFlag('example_flag');
 *
 * Toggle in Supabase Dashboard → reload app → new value visible without redeploy.
 */
export function useFlag(flagKey: FlagKey | string): boolean {
  const { data } = useQuery({
    queryKey: ['feature_flag', flagKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('enabled')
        .eq('flag_key', flagKey)
        .maybeSingle();
      if (error) return false;
      return data?.enabled ?? false;
    },
    staleTime: 5 * 60 * 1000, // 5 Minuten Cache (FOUND-04)
  });
  return data ?? false;
}
