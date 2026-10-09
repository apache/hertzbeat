/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { useQuery } from '@tanstack/react-query';
import type { ExactTimeWindow } from '@/shared/query-context';
import { buildLogPatternSamplePath, loadLogPatternSample } from '../api/explore-log-patterns-api';
import type { LogExploreQuery } from '../model/explore-query';
import { exploreQueryKeys } from './explore-query-keys';

export function useLogPatternSample(
  query: LogExploreQuery,
  window: ExactTimeWindow,
  revision: number,
  mode: 'patterns' | 'calculated',
  enabled = true
) {
  const path = buildLogPatternSamplePath(query, window);
  const load = useQuery({
    queryKey:
      mode === 'patterns'
        ? exploreQueryKeys.logPatterns(path, revision)
        : exploreQueryKeys.logCalculated(path, revision),
    queryFn: ({ signal }) => loadLogPatternSample(path, signal),
    enabled,
    retry: false,
    refetchOnWindowFocus: false
  });
  return { path, load };
}
