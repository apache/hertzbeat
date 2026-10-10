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
import { buildCalculatedFacetRequest, loadCalculatedFacet } from '../api/explore-log-calculated-v2-api';
import type { ExploreQuery } from '../model/explore-model';
import type { ExplorePageResultState } from '../model/explore-result-model';
import { facetRequestsEnabled, facetScopeBlock, logFacetEvidenceWindow, logFacetLoadState } from './use-log-facets';
import { exploreQueryKeys } from './explore-query-keys';

export function useCalculatedFacetValues(
  query: ExploreQuery,
  result: ExplorePageResultState,
  field: string,
  valueSearch: string,
  available: boolean
) {
  const window = logFacetEvidenceWindow(query, result);
  const enabled =
    available &&
    query.signal === 'logs' &&
    query.logCalculatedV2 !== undefined &&
    facetRequestsEnabled(query, result, window);
  const scoped =
    enabled && query.signal === 'logs' && window
      ? { ...query, start: window.from, end: window.to, windowMode: undefined }
      : undefined;
  const request = scoped ? buildCalculatedFacetRequest(scoped, field, valueSearch) : undefined;
  const values = useQuery({
    enabled,
    retry: false,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryKey: exploreQueryKeys.logCalculatedFacet(request),
    queryFn: ({ signal }) => loadCalculatedFacet(scoped!, field, valueSearch, signal)
  });
  return {
    values: logFacetLoadState(values, enabled, facetScopeBlock(result)),
    onRetry: () => enabled && void values.refetch()
  };
}
