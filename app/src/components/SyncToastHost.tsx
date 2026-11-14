// Phase 33: short notices about what sync did. Two cases need words:
//   - a change of mine lost against a later one (SYNC3-03: "wer überschrieben wurde,
//     sieht einen Hinweis");
//   - the partner changed the plan while I have the editor open (SYNC3-04).
// Everything else that sync does is visible without a notice.

import * as React from 'react';
import { Pressable, Text, View } from 'react-native';
import type { ProfileRow } from '@spatenstich/shared';
import { storage } from '../storage';
import { syncEvents } from '../lib/sync/events';
import { t } from '../lib/i18n';

const SHOW_MS = 6000;

type Listener = (message: string) => void;
const listeners = new Set<Listener>();

/** Shows a notice in the host, wherever it is mounted. */
export function showSyncToast(message: string): void {
  for (const listener of listeners) listener(message);
}

/** The display name of a member, or a neutral word when it is not known on this device. */
export async function memberName(userId: string | null | undefined): Promise<string> {
  if (!userId) return t('sync.toast.someone');
  try {
    const profile = await storage.getRow<ProfileRow>('profiles', userId);
    return profile?.displayName?.trim() || t('sync.toast.someone');
  } catch {
    return t('sync.toast.someone');
  }
}

export function SyncToastHost(): React.JSX.Element | null {
  const [message, setMessage] = React.useState<string | null>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = React.useCallback((next: string) => {
    if (timer.current) clearTimeout(timer.current);
    setMessage(next);
    timer.current = setTimeout(() => setMessage(null), SHOW_MS);
  }, []);

  React.useEffect(() => {
    listeners.add(show);
    const unsubscribe = syncEvents.on((evt) => {
      if (evt.type !== 'conflict_resolved') return;
      void memberName(evt.winnerUserId).then((name) => show(t('sync.toast.conflictTaken', { name })));
    });
    return () => {
      listeners.delete(show);
      unsubscribe();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [show]);

  if (!message) return null;
  return (
    <View
      pointerEvents="box-none"
      className="absolute left-0 right-0 bottom-0 items-center px-4 pb-6"
      testID="sync-toast-host"
    >
      <Pressable
        onPress={() => setMessage(null)}
        accessibilityRole="button"
        accessibilityLabel={`${message} ${t('sync.toast.dismiss')}`}
        className="bg-primary border border-line px-4 py-3 max-w-[520px]"
        testID="sync-toast"
      >
        <Text className="text-on-primary font-body text-sm">{message}</Text>
      </Pressable>
    </View>
  );
}
