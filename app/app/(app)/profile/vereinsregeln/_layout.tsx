// Vereinsregeln nested Stack layout — Plan 02-04 Task 2-04-02.
// Shares the Stack header convention with the (app) parent layout (centered title).
import { Stack } from 'expo-router';

export default function VereinsregelnLayout() {
  return <Stack screenOptions={{ headerTitleAlign: 'center' }} />;
}
