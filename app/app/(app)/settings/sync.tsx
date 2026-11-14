// Save status (Phase 33, SYNC3-09): what is waiting to be synced, what failed and why,
// in plain words. A failed entry can be tried again or given up; it never holds up
// the others.

import * as React from 'react';
import { ScrollView, Text, View, Pressable, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import type { OutboxEntry } from '@spatenstich/shared';
import { storage } from '@/src/storage';
import { getSyncWorker } from '@/src/lib/sync/SyncWorker';
import { syncEvents } from '@/src/lib/sync/events';
import { useSyncStatus } from '@/src/hooks/useSyncStatus';
import {
  describeEntry,
  describeFailure,
  isFailedEntry,
  summarize,
} from '@/src/lib/sync/outboxWording';
import { t } from '@/src/lib/i18n';

export default function SyncDetailScreen(): React.JSX.Element {
  const [entries, setEntries] = React.useState<OutboxEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [confirmDiscardId, setConfirmDiscardId] = React.useState<string | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const { status, liveConnected } = useSyncStatus();

  const refresh = React.useCallback(async () => {
    try {
      setEntries(await storage.listOutboxEntries());
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
    const unsub = syncEvents.on(() => {
      void refresh();
    });
    return () => unsub();
  }, [refresh]);

  const pending = entries.filter((e) => !isFailedEntry(e));
  const failed = entries.filter(isFailedEntry);

  const handleRetry = async (id: string) => {
    setBusyId(id);
    try {
      await getSyncWorker().retryOp(id);
    } catch {
      // The entry shows again with its error; nothing else to say here.
    } finally {
      setBusyId(null);
      void refresh();
    }
  };

  const handleRetryAll = async () => {
    setBusyId('all');
    try {
      await getSyncWorker().retryAllFailed();
    } catch {
      // as above
    } finally {
      setBusyId(null);
      void refresh();
    }
  };

  const handleDiscard = async (id: string) => {
    setBusyId(id);
    try {
      await getSyncWorker().discardOp(id);
    } finally {
      setBusyId(null);
      setConfirmDiscardId(null);
      void refresh();
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator testID="sync-detail-loading" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-bg" testID="sync-detail-screen">
      <Stack.Screen options={{ title: t('sync.detail.title') }} />

      <View className="px-4 pt-4 pb-2 gap-2">
        <Text
          className="font-display text-xl text-ink"
          testID={entries.length === 0 ? 'sync-detail-empty' : 'sync-detail-summary'}
        >
          {summarize(pending.length, failed.length)}
        </Text>
        {status === 'offline' ? (
          <Text className="font-body text-sm text-ink-muted" testID="sync-detail-offline">
            {t('sync.detail.offlineHint')}
          </Text>
        ) : (
          <Text className="font-body text-sm text-ink-muted" testID="sync-detail-live">
            {liveConnected ? t('sync.detail.liveOn') : t('sync.detail.liveOff')}
          </Text>
        )}
      </View>

      {pending.length > 0 && (
        <View testID="sync-detail-pending-section">
          <Text className="px-4 pt-4 pb-2 font-body text-xs uppercase text-ink-muted">
            {t('sync.detail.pendingHeader')}
          </Text>
          {pending.map((entry) => (
            <View
              key={entry.id}
              testID={`sync-entry-${entry.id}`}
              className="px-4 py-3 border-b border-line"
            >
              <Text className="font-body text-sm text-ink">{describeEntry(entry)}</Text>
              <Text className="font-body text-xs text-ink-muted mt-1">
                {entry.attempts > 0 ? t('sync.detail.waitingRetry') : t('sync.detail.waiting')}
              </Text>
            </View>
          ))}
        </View>
      )}

      {failed.length > 0 && (
        <View testID="sync-detail-failed-section">
          <View className="px-4 pt-4 pb-2 flex-row items-center justify-between">
            <Text className="font-body text-xs uppercase text-warn">
              {t('sync.detail.failedHeader')}
            </Text>
            {failed.length > 1 ? (
              <Pressable
                testID="retry-all"
                disabled={busyId !== null}
                onPress={() => void handleRetryAll()}
                className="px-3 py-2 border border-line"
              >
                <Text className="font-body text-xs text-ink">{t('sync.detail.retryAllButton')}</Text>
              </Pressable>
            ) : null}
          </View>
          {failed.map((entry) => (
            <View
              key={entry.id}
              testID={`sync-entry-${entry.id}`}
              className="px-4 py-3 border-b border-line"
            >
              <Text className="font-body text-sm text-ink">{describeEntry(entry)}</Text>
              <Text className="font-body text-sm text-warn mt-1" testID={`reason-${entry.id}`}>
                {describeFailure(entry.lastError)}
              </Text>
              {entry.lastError ? (
                <Text className="font-body text-xs text-ink-muted mt-1">
                  {t('sync.detail.lastError')}: {entry.lastError}
                </Text>
              ) : null}
              <View className="flex-row gap-2 mt-3">
                <Pressable
                  testID={`retry-${entry.id}`}
                  disabled={busyId !== null}
                  onPress={() => void handleRetry(entry.id)}
                  className="px-3 py-2 bg-primary"
                >
                  <Text className="font-body text-xs text-on-primary">
                    {t('sync.detail.retryButton')}
                  </Text>
                </Pressable>
                <Pressable
                  testID={`discard-${entry.id}`}
                  disabled={busyId !== null}
                  onPress={() =>
                    setConfirmDiscardId(confirmDiscardId === entry.id ? null : entry.id)
                  }
                  className="px-3 py-2 border border-line"
                >
                  <Text className="font-body text-xs text-ink">{t('sync.detail.discardButton')}</Text>
                </Pressable>
              </View>
              {confirmDiscardId === entry.id ? (
                <View
                  testID={`discard-confirm-${entry.id}`}
                  className="mt-3 p-3 bg-warn-soft border border-line"
                >
                  <Text className="font-body text-sm text-ink">{t('sync.detail.discardConfirm')}</Text>
                  <View className="flex-row gap-2 mt-3">
                    <Pressable
                      testID={`discard-confirm-yes-${entry.id}`}
                      disabled={busyId !== null}
                      onPress={() => void handleDiscard(entry.id)}
                      className="px-3 py-2 bg-danger-soft border border-line"
                    >
                      <Text className="font-body text-xs text-danger">
                        {t('sync.detail.discardConfirmYes')}
                      </Text>
                    </Pressable>
                    <Pressable
                      testID={`discard-confirm-no-${entry.id}`}
                      onPress={() => setConfirmDiscardId(null)}
                      className="px-3 py-2 border border-line"
                    >
                      <Text className="font-body text-xs text-ink">
                        {t('sync.detail.discardConfirmNo')}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
