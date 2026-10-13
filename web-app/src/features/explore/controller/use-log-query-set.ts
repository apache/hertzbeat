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

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ExactTimeWindow } from '@/shared/query-context';
import type { LogExploreQuery } from '../model/explore-query';
import { logQuerySetRequest, loadLogQuerySet, type LogAnalysisState } from '@/platform/perses';
import { buildSignalApiPath } from '../api/explore-api';
import { analysisLoadState } from './log-analysis-load-state';
import { exploreQueryKeys } from './explore-query-keys';

export function useLogQuerySet(
  query: LogExploreQuery,
  analysis: LogAnalysisState,
  window: ExactTimeWindow | undefined,
  enabled: boolean,
  refreshing: boolean
) {
  const active = enabled && !query.live && Boolean(analysis.querySet) && window !== undefined;
  const prepared = prepare(query, analysis, window, active);
  const result = useQuery({
    queryKey: exploreQueryKeys.logQuerySet(prepared.request ?? { query, analysis, window }),
    enabled: active,
    retry: false,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: ({ signal }) => {
      if (prepared.error) throw prepared.error;
      return loadLogQuerySet(prepared.request!, window!, analysis, signal);
    }
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

function prepare(
  query: LogExploreQuery,
  analysis: LogAnalysisState,
  window: ExactTimeWindow | undefined,
  active: boolean
) {
  if (!active || !window) return {} as { request?: ReturnType<typeof logQuerySetRequest>; error?: Error };
  try {
    return {
      request: logQuerySetRequest(
        new URLSearchParams(
          buildSignalApiPath({ ...query, start: window.from, end: window.to, windowMode: undefined }).split('?')[1]
        ),
        window,
        analysis
      )
    };
  } catch (error) {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }
}
