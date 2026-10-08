/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
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
