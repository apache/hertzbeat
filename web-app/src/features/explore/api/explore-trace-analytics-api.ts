/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { ExactTimeWindow } from '@/shared/query-context';
import type { TraceExploreQuery } from '../model/explore-query';
import { ExploreSignalContractError } from '../model/explore-signal-contract';
import { buildSignalApiPath } from './explore-api';
import { loadHertzBeatTraceAnalytics, type TraceAnalyticsRequest } from '@/platform/perses';
import { HertzBeatResponseContractError } from '@/platform/perses';
export type { TraceAnalyticsRequest } from '@/platform/perses';
export function buildTraceAnalyticsPath(
  query: TraceExploreQuery,
  window: ExactTimeWindow,
  request: TraceAnalyticsRequest
) {
  const params = new URLSearchParams(
    buildSignalApiPath({ ...query, start: window.from, end: window.to, windowMode: undefined }).split('?')[1]
  );
  params.set('population', request.population);
  if (request.kind === 'spans') return `/api/traces/spans?${params}`;
  for (const key of ['sort', 'pageIndex', 'pageSize']) params.delete(key);
  if (request.kind === 'histogram') {
    params.set('bucketCount', '30');
    return `/api/traces/stats/histogram?${params}`;
  }
  if (!request.field) throw new ExploreSignalContractError();
  params.set(request.kind === 'groups' ? 'groupBy' : 'field', request.field);
  params.set('limit', '20');
  if (request.kind === 'groups') params.set('orderBy', request.orderBy ?? 'count-desc');
  return `/api/traces/${request.kind === 'groups' ? 'stats/groups' : 'facets/values'}?${params}`;
}
export async function loadTraceAnalytics<K extends TraceAnalyticsRequest['kind']>(
  path: string,
  request: TraceAnalyticsRequest & { kind: K },
  signal?: AbortSignal
) {
  try {
    return await loadHertzBeatTraceAnalytics(path, request, signal);
  } catch (error) {
    if (error instanceof HertzBeatResponseContractError) throw new ExploreSignalContractError();
    throw error;
  }
}
