// Analysing Screen — polls ai_jobs status via TanStack Query, auto-navigates on done.
// Phase 4 Plan 04 — UI-SPEC §"Analysis Loading", Threat T-4-04-02 (timeout 120s).
import * as React from 'react';
import { View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/src/lib/supabase';
import { storage } from '@/src/storage';
import { useAuthStore } from '@/src/stores/authStore';
import { useCaptureStore } from '@/src/stores/captureStore';
import { uploadPending } from '@/src/lib/photos/PhotoUploader';
import { AnalysisLoader } from '@/src/components/AnalysisLoader';
import type { PhotoQueueRow } from '@spatenstich/shared';

const TIMEOUT_MS = 120_000; // 2 minutes client-side timeout

export default function AnalysingScreen(): React.JSX.Element {
  const router = useRouter();
  const params = useLocalSearchParams<{ jobId?: string }>();
  const activeGardenId = useAuthStore((s) => s.activeGardenId);

  const [localError, setLocalError] = React.useState(false);
  const [jobId, setJobId] = React.useState<string | null>(params.jobId ?? null);
  const [edgeFunctionInvoked, setEdgeFunctionInvoked] = React.useState(false);

  // Determine jobId from local photo_queue (local-only table via StorageAdapter)
  React.useEffect(() => {
    if (jobId || !activeGardenId) return;
    (async () => {
      const rows = await storage.getRowsByGarden<PhotoQueueRow>('photo_queue', activeGardenId);
      const uploaded = rows
        .filter((r) => r.uploadStatus === 'uploaded' && r.jobId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      if (uploaded.length > 0 && uploaded[0].jobId) {
        setJobId(uploaded[0].jobId);
      }
    })();
  }, [jobId, activeGardenId]);

  // Trigger photo upload in case photos are still pending
  React.useEffect(() => {
    uploadPending().catch(() => {});
  }, []);

  // Invoke Edge Function directly for immediate processing
  // (handles case where pg_cron is not active — Open Question 1 from RESEARCH.md)
  React.useEffect(() => {
    if (edgeFunctionInvoked) return;
    // Small delay to let upload complete first
    const timer = setTimeout(() => {
      supabase.functions.invoke('ai-job-consumer').catch(() => {});
      setEdgeFunctionInvoked(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, [edgeFunctionInvoked]);

  // TanStack Query polling for job status
  const { data: jobData } = useQuery({
    queryKey: ['ai_job', jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_jobs')
        .select('status, last_error')
        .eq('id', jobId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!jobId && !localError,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'done' || status === 'failed') return false;
      return 3000; // Poll every 3 seconds
    },
    staleTime: 0,
  });

  // Client-side timeout (T-4-04-02 mitigation)
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setLocalError(true);
    }, TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

  // Auto-navigate on 'done'
  React.useEffect(() => {
    if (jobData?.status === 'done') {
      router.replace({
        pathname: '/(app)/capture/confirm',
        params: { jobId: jobId! },
      } as any);
    }
  }, [jobData?.status, jobId, router]);

  // Determine display state
  const isError =
    localError || jobData?.status === 'failed';

  const handleCancel = () => {
    useCaptureStore.getState().reset();
    router.replace('/(app)/capture/dimensions' as any);
  };

  const handleRetry = async () => {
    setLocalError(false);
    setEdgeFunctionInvoked(false);
    // Re-trigger upload for any pending photos
    await uploadPending().catch(() => {});
    // Re-invoke Edge Function
    setTimeout(() => {
      supabase.functions.invoke('ai-job-consumer').catch(() => {});
      setEdgeFunctionInvoked(true);
    }, 1000);
  };

  return (
    <View className="flex-1 bg-[#F9F7F4] dark:bg-[#1C1917]">
      <AnalysisLoader
        state={isError ? 'error' : 'loading'}
        onCancel={handleCancel}
        onRetry={handleRetry}
        testID="analysis-loader"
      />
    </View>
  );
}
