/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { exploreQueryKeys } from './explore-query-keys';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ExactTimeWindow } from '@/shared/query-context';
import type { LogExploreQuery } from '../model/explore-query';
import { type LogAnalysisState, loadLogComparison } from '@/platform/perses';

import { buildLogComparisonRequest } from '../api/explore-log-comparison-api';
import { comparisonFilterFailure } from '../api/explore-log-comparison-failure';
import { analysisLoadState } from './log-analysis-load-state';
export function useLogComparison(
  query: LogExploreQuery,
  analysis: LogAnalysisState,
  window: ExactTimeWindow | undefined,
  enabled = true,
  refreshing = false
) {
  const active = comparisonActive(query, analysis, window, enabled);
  const prepared = prepareComparison(query, window, analysis, active);
  const result = useQuery({
    queryKey: exploreQueryKeys.logComparison(prepared.request ?? { query, window, analysis }),
    enabled: active,
    retry: false,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: ({ signal }) => {
      if (prepared.error) throw prepared.error;
      return loadLogComparison(prepared.request!, window!, analysis, signal);
    }
  });
  const { refetch } = result;
  useEffect(() => {
    if (active && refreshing) void refetch();
  }, [active, refreshing, refetch]);
  const state = analysisLoadState(result, active);
  const invalidFilter =
    state === 'error' ? comparisonFilterFailure(result.error, comparisonQueries(query, analysis)) : undefined;
  return {
    state: invalidFilter ? 'invalid_filter' : state,
    invalidFilter,
    data: active && !result.isError ? result.data : undefined,
    retry: () => {
      if (active) void result.refetch();
    }
  } as const;
}

function comparisonActive(
  query: LogExploreQuery,
  analysis: LogAnalysisState,
  window: ExactTimeWindow | undefined,
  enabled: boolean
) {
  return (
    enabled &&
    !query.live &&
    analysis.comparison?.search !== undefined &&
    analysis.representation !== 'logs' &&
    window !== undefined
  );
}

function comparisonQueries(query: LogExploreQuery, analysis: LogAnalysisState) {
  const comparison = analysis.comparison;
  return {
    a: query,
    b:
      comparison?.search === undefined
        ? undefined
        : { search: comparison.search, searchSyntax: comparison.searchSyntax }
  };
}

function prepareComparison(
  query: LogExploreQuery,
  window: ExactTimeWindow | undefined,
  analysis: LogAnalysisState,
  active: boolean
): { request?: ReturnType<typeof buildLogComparisonRequest>; error?: Error } {
  if (!active || !window) return {};
  try {
    return { request: buildLogComparisonRequest(query, window, analysis) };
  } catch (error) {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }
}
