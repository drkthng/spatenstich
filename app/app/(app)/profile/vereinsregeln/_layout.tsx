// Vereinsregeln nested Stack layout — Plan 02-04 Task 2-04-02.
// Shares the Stack header convention with the (app) parent layout (centered title).
// Phase 20 Plan 02 (D-05): Routengruppe ist hinter FEATURES.vereinsregeln gegated —
// ohne aktives Feature ist sie nicht erreichbar (Redirect zurueck zum Profil).
import { Stack, Redirect } from 'expo-router';
import { FEATURES } from '@spatenstich/shared';

export default function VereinsregelnLayout() {
  if (!FEATURES.vereinsregeln) {
    return <Redirect href="/(app)/profile" />;
  }
  return <Stack screenOptions={{ headerTitleAlign: 'center' }} />;
}
