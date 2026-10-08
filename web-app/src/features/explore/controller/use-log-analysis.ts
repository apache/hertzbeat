/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ExactTimeWindow } from '@/shared/query-context';
import type { LogExploreQuery } from '../model/explore-query';
import { type LogAnalysisState, loadLogAnalysis } from '@/platform/perses';

import { buildLogAnalysisPath } from '../api/explore-log-analysis-api';
import { analysisLoadState } from './log-analysis-load-state';
import { exploreQueryKeys } from './explore-query-keys';
export function useLogAnalysis(
  query: LogExploreQuery,
  analysis: LogAnalysisState,
  window: ExactTimeWindow | undefined,
  enabled = true,
  refreshing = false
) {
  const active = enabled && !query.live && analysis.representation !== 'logs' && window !== undefined;
  const path = active ? buildLogAnalysisPath(query, window, analysis) : '';
  const result = useQuery({
    queryKey: exploreQueryKeys.logAnalysis(path),
    enabled: active,
    retry: false,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: ({ signal }) => loadLogAnalysis(path, window!, analysis, signal)
  });
  const { refetch } = result;
  useEffect(() => {
    if (active && refreshing) void refetch();
  }, [active, refreshing, refetch]);
  const state = analysisLoadState(result, active);
  return {
    state,
    data: active && !result.isError ? result.data : undefined,
    retry: () => {
      if (active) void result.refetch();
    }
  } as const;
}
