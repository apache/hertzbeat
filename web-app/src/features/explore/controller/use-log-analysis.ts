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
