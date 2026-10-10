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
import { buildLogFacetPath, loadLogFacetValues } from '../api/explore-log-facets-api';
import { buildSubqueryFacetRequest, loadSubqueryFacet } from '../api/explore-log-subquery-api';
import { logFacetFieldSchema } from '../model/explore-log-facets';
import type { ExploreQuery } from '../model/explore-model';
import type { ExplorePageResultState } from '../model/explore-result-model';
import { exploreQueryKeys } from './explore-query-keys';
import { facetRequestsEnabled, facetScopeBlock, logFacetEvidenceWindow, logFacetLoadState } from './use-log-facets';
import { useLogFacetSearch } from './use-log-facet-search';

export function useLogFacetValues(
  query: ExploreQuery,
  result: ExplorePageResultState,
  field: string,
  available = true,
  source: 'a' | 'b' = 'a',
  appliedWindow?: ExactTimeWindow
) {
  const window = appliedWindow ?? logFacetEvidenceWindow(query, result);
  const enabled = available && facetRequestsEnabled(query, result, window);
  const scope = facetScopePath(query, window, enabled);
  const search = useLogFacetSearch(`${source}|${scope}|${field}`);
  const pending = validSubqueryValueSearch(query, search.valueSearch) ? search.pending : 'unavailable';
  const valuesEnabled = enabled && !!field && !pending;
  const path = valueRequestPath(query, window, field, search.valueSearch, valuesEnabled);
  const subquery = subqueryRequest(query, window, field, search.valueSearch, valuesEnabled);
  const values = useQuery({
    enabled: valuesEnabled,
    retry: false,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryKey: exploreQueryKeys.logFacetValues(source, subquery ? JSON.stringify(subquery) : path),
    queryFn: ({ signal }) => loadValues(query, window!, field, search.valueSearch, path, signal)
  });
  const { refetch } = values;
  useEffect(() => {
    if (valuesEnabled && result.kind === 'refreshing') void refetch();
  }, [valuesEnabled, result.kind, refetch]);
  return {
    values: logFacetLoadState(values, enabled && !!field, facetScopeBlock(result), pending),
    valueSearch: search.valueSearch,
    onValueSearchChange: search.onValueSearchChange,
    onRetry: () => valuesEnabled && void refetch()
  };
}

function validSubqueryValueSearch(query: ExploreQuery, search: string) {
  return (
    query.signal !== 'logs' || query.logSubquery === undefined || new TextEncoder().encode(search).byteLength <= 256
  );
}

function facetScopePath(query: ExploreQuery, window: ExactTimeWindow | undefined, enabled: boolean) {
  return enabled && query.signal === 'logs' && window ? buildLogFacetPath(query, window, 'fields') : '';
}

function subqueryRequest(
  query: ExploreQuery,
  window: ExactTimeWindow | undefined,
  field: string,
  search: string,
  enabled: boolean
) {
  return enabled && query.signal === 'logs' && query.logSubquery && window
    ? buildSubqueryFacetRequest({ ...query, start: window.from, end: window.to }, field, search)
    : undefined;
}

async function loadValues(
  query: ExploreQuery,
  window: ExactTimeWindow,
  field: string,
  search: string,
  path: string,
  signal: AbortSignal
) {
  if (query.signal !== 'logs' || query.logSubquery === undefined)
    return loadLogFacetValues(path, window, field, signal, search);
  const data = await loadSubqueryFacet({ ...query, start: window.from, end: window.to }, field, search, signal);
  const separator = field.indexOf(':');
  const parsed = logFacetFieldSchema.parse({
    id: field,
    source: field.slice(0, separator),
    key: field.slice(separator + 1)
  });
  return {
    state: 'ready' as const,
    window: data.window,
    field: parsed,
    coverage: { mode: 'full_window' as const },
    matchedCount: data.result.matchingTotal,
    missingOrNullCount: data.result.missingOrNullCount,
    search: data.result.search ?? null,
    values: data.result.values,
    truncated: data.result.truncated
  };
}

function valueRequestPath(
  query: ExploreQuery,
  window: ExactTimeWindow | undefined,
  field: string,
  search: string,
  enabled: boolean
) {
  if (!enabled || query.signal !== 'logs' || !window) return '';
  return buildLogFacetPath(query, window, 'values', field, search);
}
