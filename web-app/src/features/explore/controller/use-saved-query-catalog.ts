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

import { useQueries, useQueryClient } from '@tanstack/react-query';

import { loadSavedQueries } from '../api/explore-saved-query-api';
import { classifyExploreSignalError } from '../api/explore-signal-api-model';
import type { ExploreSignal } from '../model/explore-query';
import type { SavedQueryGroup } from '../model/explore-saved-query-view-model';

const signals: ExploreSignal[] = ['metrics', 'logs', 'traces'];
const savedQueryKeys = {
  all: ['explore-saved-queries'] as const,
  list: (signal: ExploreSignal) => ['explore-saved-queries', signal] as const
};

export function useSavedQueryCatalog(enabled: boolean) {
  const client = useQueryClient();
  const results = useQueries({
    queries: signals.map(signal => ({
      queryKey: savedQueryKeys.list(signal),
      queryFn: ({ signal: abortSignal }: { signal: AbortSignal }) => loadSavedQueries(signal, abortSignal),
      enabled,
      retry: false,
      staleTime: 0
    }))
  });
  const groups: SavedQueryGroup[] = results.map((result, index) => ({
    signal: signals[index]!,
    state: result.error ? failureState(result.error) : result.isPending ? 'loading' : 'ready',
    records: result.error ? [] : (result.data ?? [])
  }));
  return { groups, refresh: () => void client.invalidateQueries({ queryKey: savedQueryKeys.all }) };
}

function failureState(error: unknown): SavedQueryGroup['state'] {
  const kind = classifyExploreSignalError(error);
  return kind === 'missing' ||
    kind === 'invalid_query' ||
    kind === 'invalid_filter' ||
    kind === 'calculated_budget_exceeded' ||
    kind === 'calculated_invalid_pattern'
    ? 'error'
    : kind;
}
