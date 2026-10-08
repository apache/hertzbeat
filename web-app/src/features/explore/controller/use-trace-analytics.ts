/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { useEffect, useState } from 'react';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import {
  buildTraceAnalyticsPath,
  loadTraceAnalytics,
  type TraceAnalyticsRequest
} from '../api/explore-trace-analytics-api';
import { classifyExploreSignalError } from '../api/explore-signal-api-model';
import { exploreHandoffState, exploreUsesExactWindow, type ExploreQuery } from '../model/explore-model';
import type { ExplorePageResultState } from '../model/explore-result-model';
import type { TraceFacetField } from '../model/explore-trace-analytics';
import { exploreQueryKeys } from './explore-query-keys';
import { draftFromQuery, type ExploreSubmissionDraft } from '../model/explore-submission-model';
import { useTraceFacetSelection } from './use-trace-facet-selection';
import { useTraceView } from './use-trace-view';
import type { TraceLoad } from '../model/explore-trace-analytics';
export function useTraceAnalytics(
  query: ExploreQuery,
  result: ExplorePageResultState,
  onViewChange: (encoded: string) => void,
  draft: ExploreSubmissionDraft = draftFromQuery(query)
) {
  const facetSelection = useTraceFacetSelection(query, draft);
  const view = useTraceView(
    query.signal === 'traces' ? query : { signal: 'traces', timeRange: query.timeRange },
    onViewChange
  );
  const [field, onFieldChange] = useState<TraceFacetField>('serviceName');
  const window = traceAnalyticsWindow(query, result);
  const enabled =
    query.signal === 'traces' &&
    query.traceStructure === undefined &&
    result.kind !== 'invalid' &&
    result.kind !== 'permission' &&
    !!window &&
    exploreHandoffState(query) !== 'invalid' &&
    !view.invalid;
  const { population, mode, groupBy } = view.view;
  const path = (request: TraceAnalyticsRequest) =>
    enabled && query.signal === 'traces' && window ? buildTraceAnalyticsPath(query, window, request) : '';
  const refresh = result.kind === 'refreshing';
  const histogramRequest = { kind: 'histogram' as const, population },
    facetRequest = { kind: 'facets' as const, population, field };
  const groupRequest = { kind: 'groups' as const, population, field: groupBy },
    spanRequest = { kind: 'spans' as const, population: 'matched_spans' as const };
  const histogram = useAnalyticsRequest(path(histogramRequest), histogramRequest, enabled, refresh);
  const facets = useAnalyticsRequest(path(facetRequest), facetRequest, enabled, refresh);
  const groups = useAnalyticsRequest(path(groupRequest), groupRequest, enabled && mode === 'groups', refresh);
  const spans = useAnalyticsRequest(
    path(spanRequest),
    spanRequest,
    enabled && mode === 'list' && population === 'matched_spans',
    refresh
  );
  return { view, histogram, facets, groups, spans, field, onFieldChange, window, facetSelection };
}
function useAnalyticsRequest<K extends TraceAnalyticsRequest['kind']>(
  path: string,
  request: TraceAnalyticsRequest & { kind: K },
  enabled: boolean,
  refreshing: boolean
) {
  const query = useQuery({
    queryKey: exploreQueryKeys.traceAnalytics(path),
    enabled,
    retry: false,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: ({ signal }) => loadTraceAnalytics(path, request, signal)
  });
  const { refetch } = query;
  useEffect(() => {
    if (enabled && refreshing) void refetch();
  }, [enabled, refreshing, refetch]);
  return {
    ...traceLoadState(query, enabled),
    retry: () => {
      if (enabled) void refetch();
    }
  };
}
function traceLoadState<T>(result: UseQueryResult<T>, enabled: boolean): TraceLoad<T> {
  if (!enabled) return { state: 'idle' };
  if (result.isError && classifyExploreSignalError(result.error) === 'permission') return { state: 'permission' };
  const data = result.data === undefined ? {} : { data: result.data };
  if (result.isFetching || result.isPending) return { state: 'loading', ...data };
  if (result.isError) return { state: 'error', ...data };
  return { state: 'ready', data: result.data };
}
function traceAnalyticsWindow(query: ExploreQuery, result: ExplorePageResultState) {
  if (exploreUsesExactWindow(query)) return { from: query.start!, to: query.end! };
  const evidence = result.kind === 'refreshing' || result.kind === 'stale_error' ? result.evidence : result;
  return 'window' in evidence && 'signal' in evidence && evidence.signal === 'traces' ? evidence.window : undefined;
}
