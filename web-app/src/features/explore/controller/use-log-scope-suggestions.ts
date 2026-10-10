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

import { useQueries } from '@tanstack/react-query';
import { buildLogScopeSuggestionPath, loadLogScopeSuggestions } from '../api/explore-log-scope-suggestions';
import { exploreHandoffState, exploreUsesExactWindow, type ExploreQuery } from '../model/explore-model';
import type { ExplorePageResultState } from '../model/explore-result-model';
import type {
  LogScopeDimension,
  LogScopeSuggestion,
  LogScopeSuggestions
} from '../model/explore-log-scope-suggestions';
import { exploreQueryKeys } from './explore-query-keys';

const dimensions: LogScopeDimension[] = ['serviceName', 'environment'];
export function useLogScopeSuggestions(query: ExploreQuery, result: ExplorePageResultState): LogScopeSuggestions {
  const window = exploreUsesExactWindow(query)
    ? { from: query.start!, to: query.end! }
    : 'window' in result
      ? result.window
      : undefined;
  const enabled =
    result.kind !== 'invalid' &&
    query.signal === 'logs' &&
    !query.live &&
    !!window &&
    exploreHandoffState(query) !== 'invalid';
  const paths = dimensions.map(dimension =>
    enabled && query.signal === 'logs' && window ? buildLogScopeSuggestionPath(query, window, dimension) : ''
  );
  const results = useQueries({
    queries: dimensions.map((dimension, index) => ({
      queryKey: exploreQueryKeys.logScopeSuggestions(paths[index] || dimension),
      queryFn: ({ signal }: { signal: AbortSignal }) => loadLogScopeSuggestions(paths[index]!, dimension, signal),
      enabled,
      retry: false,
      staleTime: 60_000,
      refetchOnWindowFocus: false
    }))
  });
  const states = results.map((value): LogScopeSuggestion => {
    if (!enabled) return { state: 'idle', values: [] };
    if (value.isFetching || value.isPending) return { state: 'loading', values: [] };
    if (value.isError) return { state: 'error', values: [] };
    return { state: value.data?.length ? 'ready' : 'empty', values: value.data ?? [] };
  });
  return { serviceName: states[0]!, environment: states[1]! };
}
