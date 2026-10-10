/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useQuery } from '@tanstack/react-query';
import { loadCalculatedAnalysis } from '../api/explore-log-calculated-v2-api';
import { loadSubqueryAnalysis } from '../api/explore-log-subquery-api';
import { classifyExploreSignalError } from '../api/explore-signal-api-model';
import type { LogExploreQuery } from '../model/explore-query';
import type { CalculatedAnalysisResponse } from '../model/explore-calculated-analysis-contract';
import { exploreQueryKeys } from './explore-query-keys';

export function useCalculatedAnalysis(
  query: LogExploreQuery,
  window: { from: number; to: number } | undefined,
  enabled: boolean,
  revision: number
) {
  const scoped = window ? { ...query, start: window.from, end: window.to } : query;
  const active = enabled && Boolean(window);
  const result = useQuery<CalculatedAnalysisResponse>({
    queryKey: exploreQueryKeys.logCalculatedAnalysis(scoped, revision),
    enabled: active,
    queryFn: ({ signal }) =>
      scoped.logSubquery ? loadSubqueryAnalysis(scoped, signal) : loadCalculatedAnalysis(scoped, signal),
    retry: false,
    staleTime: 60_000,
    refetchOnWindowFocus: false
  });
  const error = result.isError ? classifyExploreSignalError(result.error) : undefined;
  return {
    invalidMessageKey: query.logSubquery ? 'explore.logSubquery.analysisInvalid' : undefined,
    state: !active
      ? ('idle' as const)
      : result.isPending || result.isFetching
        ? ('loading' as const)
        : (error ?? ('ready' as const)),
    data: active && !result.isError ? result.data : undefined,
    retry: () => {
      if (active) void result.refetch();
    }
  };
}
