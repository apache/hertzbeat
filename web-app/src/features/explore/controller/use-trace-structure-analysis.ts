/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { useQuery } from '@tanstack/react-query';
import type { ExactTimeWindow } from '@/shared/query-context';
import type { TraceExploreQuery } from '../model/explore-query';
import { buildTraceStructureAnalysisPath } from '../api/explore-api';
import { loadTraceStructureAnalysis } from '../api/explore-trace-structure-analysis';
import { classifyExploreSignalError } from '../api/explore-signal-api-model';
import { exploreQueryKeys } from './explore-query-keys';

export function useTraceStructureAnalysis(
  query: TraceExploreQuery,
  window: ExactTimeWindow | undefined,
  active: boolean,
  revision: number
) {
  const enabled = active && window !== undefined && query.traceStructure !== undefined;
  const path = enabled
    ? buildTraceStructureAnalysisPath({
        ...query,
        start: window.from,
        end: window.to,
        windowMode: undefined
      })
    : '';
  const result = useQuery({
    queryKey: exploreQueryKeys.traceStructureAnalysis(path, revision),
    enabled,
    retry: false,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: ({ signal }) => loadTraceStructureAnalysis(path, signal)
  });
  const state = !enabled
    ? 'idle'
    : result.isPending || result.isFetching
      ? 'loading'
      : result.isError
        ? classifyExploreSignalError(result.error)
        : 'ready';
  return { state, data: state === 'ready' ? result.data : undefined, retry: () => void result.refetch() } as const;
}
