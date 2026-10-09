/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { useEffect } from 'react';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import type { ExactTimeWindow } from '@/shared/query-context';
import { buildLogFacetPath, loadLogFacetFields } from '../api/explore-log-facets-api';
import { classifyExploreSignalError } from '../api/explore-signal-api-model';
import { exploreHandoffState, exploreUsesExactWindow, type ExploreQuery } from '../model/explore-model';
import type { ExplorePageResultState } from '../model/explore-result-model';
import { exploreQueryKeys } from './explore-query-keys';

export type LogFacetLoad<T> = {
  state:
    | 'idle'
    | 'loading'
    | 'ready'
    | 'error'
    | 'permission'
    | 'unavailable'
    | 'calculated_budget_exceeded'
    | 'calculated_invalid_pattern';
  data?: T;
};

export function useLogFacetCatalog(
  query: ExploreQuery,
  result: ExplorePageResultState,
  available = true,
  appliedWindow?: ExactTimeWindow,
  refreshOnResult = false
) {
  const window = appliedWindow ?? logFacetEvidenceWindow(query, result);
  const blocked = facetScopeBlock(result);
  const enabled = available && facetRequestsEnabled(query, result, window);
  const path = enabled && query.signal === 'logs' && window ? buildLogFacetPath(query, window, 'fields') : '';
  const fields = useQuery({
    enabled,
    retry: false,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryKey: exploreQueryKeys.logFacets(path),
    queryFn: ({ signal }) => loadLogFacetFields(path, window!, signal)
  });
  const { refetch } = fields;
  useEffect(() => {
    if (enabled && refreshOnResult && result.kind === 'refreshing') void refetch();
  }, [enabled, refreshOnResult, result.kind, refetch]);
  return { fields: logFacetLoadState(fields, enabled, blocked), onCatalogRetry: () => enabled && void refetch() };
}

export function logFacetLoadState<T>(
  result: UseQueryResult<T>,
  enabled: boolean,
  blocked: ReturnType<typeof facetScopeBlock>,
  pending?: 'loading' | 'unavailable'
): LogFacetLoad<T> {
  if (blocked) return { state: blocked };
  if (!enabled) return { state: 'idle' };
  if (pending) return { state: pending };
  if (result.isError) {
    const kind = classifyExploreSignalError(result.error);
    if (kind === 'permission') return { state: 'permission' };
    if (kind === 'invalid_filter') return { state: 'unavailable' };
  }
  const retained = result.data === undefined ? {} : { data: result.data };
  if (result.isFetching || result.isPending) return { state: 'loading', ...retained };
  if (result.isError) return { state: 'error', ...retained };
  return { state: 'ready', data: result.data };
}

export function facetRequestsEnabled(
  query: ExploreQuery,
  result: ExplorePageResultState,
  window: ReturnType<typeof logFacetEvidenceWindow>
) {
  return (
    !facetScopeBlock(result) &&
    result.kind !== 'invalid' &&
    query.signal === 'logs' &&
    !query.live &&
    !query.logRecordUid &&
    !!window &&
    exploreHandoffState(query) !== 'invalid'
  );
}

export function facetScopeBlock(result: ExplorePageResultState) {
  const kind = result.kind === 'stale_error' ? result.errorKind : result.kind;
  if (kind === 'permission') return 'permission';
  if (kind === 'invalid_filter') return 'unavailable';
  if (kind === 'calculated_budget_exceeded' || kind === 'calculated_invalid_pattern') return kind;
  return undefined;
}

export function logFacetEvidenceWindow(query: ExploreQuery, result: ExplorePageResultState) {
  if (exploreUsesExactWindow(query)) return { from: query.start!, to: query.end! };
  // useExploreHistory retains evidence only for the same request owner, never across changed filters.
  const evidence = result.kind === 'refreshing' || result.kind === 'stale_error' ? result.evidence : result;
  return 'window' in evidence && 'signal' in evidence && evidence.signal === 'logs' ? evidence.window : undefined;
}
