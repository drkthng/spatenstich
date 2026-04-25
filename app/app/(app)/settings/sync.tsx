// Sync-Status Detail-Screen — Plan 03-06 Task 04
// Lists pending + failed outbox entries with Retry / Verwerfen (inline-confirm-expansion).
// Uses getSyncWorker() Singleton-Accessor from Plan 03-04.
// Inline-confirm-expansion pattern (NO Modal) per UI-SPEC line 234.

import * as React from 'react';
import { ScrollView, Text, View, Pressable, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { storage } from '@/src/storage';
import { getSyncWorker } from '@/src/lib/sync/SyncWorker';
import { syncEvents } from '@/src/lib/sync/events';
import de from '@spatenstich/shared/i18n/de';
import type { OutboxEntry } from '@spatenstich/shared';
import { MAX_ATTEMPTS } from '@/src/lib/sync/backoff';

const t = de as any;

// i18n helpers for template strings
const entryLabel = (entity: string, op: string): string =>
  (t.sync.detail.entryLabel as string)
    .replace('{entity}', entity)
    .replace('{op}', op);

const attemptsLabel = (n: number): string =>
  (t.sync.detail.attemptsLabel as string).replace('{n}', String(n));

function isFailed(e: OutboxEntry): boolean {
  return e.attempts >= MAX_ATTEMPTS && e.lastError !== null;
}

export default function SyncDetailScreen(): React.JSX.Element {
  const [entries, setEntries] = React.useState<OutboxEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [confirmDiscardId, setConfirmDiscardId] = React.useState<string | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    try {
      const list = await storage.listOutboxEntries();
      setEntries(list);
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

  const pending = entries.filter((e) => !isFailed(e));
  const failed = entries.filter(isFailed);

  const handleRetry = async (id: string) => {
    setBusyId(id);
    try {
      const worker = getSyncWorker();
      await worker.retryOp(id);
    } catch {
      // Error visible via badge status change
    } finally {
      setBusyId(null);
      void refresh();
    }
  };

  const handleDiscard = async (id: string) => {
    setBusyId(id);
    try {
      const worker = getSyncWorker();
      await worker.discardOp(id);
    } finally {
      setBusyId(null);
      setConfirmDiscardId(null);
      void refresh();
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator testID="sync-detail-loading" />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-gray-900"
      testID="sync-detail-screen"
    >
      <Stack.Screen options={{ title: t.sync.detail.title }} />

      {entries.length === 0 && (
        <Text
          className="p-4 text-gray-600 dark:text-gray-400"
          testID="sync-detail-empty"
        >
          {t.sync.detail.empty}
        </Text>
      )}

      {pending.length > 0 && (
        <View testID="sync-detail-pending-section">
          <Text className="px-4 pt-4 pb-2 text-xs uppercase text-gray-500">
            {t.sync.detail.pendingHeader}
          </Text>
          {pending.map((entry) => (
            <View
              key={entry.id}
              testID={`sync-entry-${entry.id}`}
              className="px-4 py-3 border-b border-gray-200 dark:border-gray-700"
            >
              <Text className="text-sm">
                {entryLabel(entry.entity, entry.operation)}
              </Text>
              <Text className="text-xs text-gray-500">
                {attemptsLabel(entry.attempts)}
              </Text>
            </View>
          ))}
        </View>
      )}

      {failed.length > 0 && (
        <View testID="sync-detail-failed-section">
          <Text className="px-4 pt-4 pb-2 text-xs uppercase text-amber-600">
            {t.sync.detail.failedHeader}
          </Text>
          {failed.map((entry) => (
            <View
              key={entry.id}
              testID={`sync-entry-${entry.id}`}
              className="px-4 py-3 border-b border-gray-200 dark:border-gray-700"
            >
              <Text className="text-sm">
                {entryLabel(entry.entity, entry.operation)}
              </Text>
              {entry.lastError ? (
                <Text className="text-xs text-amber-700 mt-1">
                  {t.sync.detail.lastError}: {entry.lastError}
                </Text>
              ) : null}
              <Text className="text-xs text-gray-500 mt-1">
                {attemptsLabel(entry.attempts)}
              </Text>

              {/* Retry + Verwerfen Buttons */}
              <View className="flex-row gap-2 mt-2">
                <Pressable
                  testID={`retry-${entry.id}`}
                  disabled={busyId === entry.id}
                  onPress={() => void handleRetry(entry.id)}
                  className="px-3 py-1 bg-blue-600 rounded"
                >
                  <Text className="text-white text-xs">{t.sync.detail.retryButton}</Text>
                </Pressable>
                <Pressable
                  testID={`discard-${entry.id}`}
                  disabled={busyId === entry.id}
                  onPress={() =>
                    setConfirmDiscardId(confirmDiscardId === entry.id ? null : entry.id)
                  }
                  className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded"
                >
                  <Text className="text-xs">{t.sync.detail.discardButton}</Text>
                </Pressable>
              </View>

              {/* Inline-Confirm-Expansion (no Modal) — UI-SPEC line 234 */}
              {confirmDiscardId === entry.id && (
                <View
                  testID={`discard-confirm-${entry.id}`}
                  className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/30 rounded"
                >
                  <Text className="text-xs mb-2">{t.sync.detail.discardConfirm}</Text>
                  <View className="flex-row gap-2">
                    <Pressable
                      testID={`discard-confirm-yes-${entry.id}`}
                      onPress={() => void handleDiscard(entry.id)}
                      className="px-3 py-1 bg-red-600 rounded"
                    >
                      <Text className="text-white text-xs">{t.sync.detail.discardConfirmYes}</Text>
                    </Pressable>
                    <Pressable
                      testID={`discard-confirm-no-${entry.id}`}
                      onPress={() => setConfirmDiscardId(null)}
                      className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded"
                    >
                      <Text className="text-xs">{t.sync.detail.discardConfirmNo}</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
