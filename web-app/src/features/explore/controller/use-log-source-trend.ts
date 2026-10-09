/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { useQuery } from '@tanstack/react-query';
import type { ExactTimeWindow } from '@/shared/query-context';
import { loadLogStatistics } from '../api/explore-api';
import type { LogExploreQuery } from '../model/explore-model';
import { exploreQueryKeys } from './explore-query-keys';

export function useLogSourceTrend({
  query,
  projected,
  window,
  refreshRevision,
  active
}: {
  query: LogExploreQuery;
  projected: LogExploreQuery | undefined;
  window: ExactTimeWindow | undefined;
  refreshRevision: number;
  active: boolean;
}) {
  return useQuery({
    queryKey: exploreQueryKeys.logSourceTrend(projected ?? query, window, refreshRevision),
    enabled: active,
    retry: false,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    queryFn: ({ signal }) => loadLogStatistics(projected!, signal)
  });
}
