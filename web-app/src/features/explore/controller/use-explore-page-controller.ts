/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
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
import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { mergeQueryContext, useQueryContextOptional, type QueryContext } from '@/shared/query-context';
import { useSharedTimeOptional } from '@/shared/time';

import { classifyExploreSignalError, loadLogSignal, loadMetricSignal, loadTraceSignal } from '../api/explore-api';
import { useExploreSubmission } from './use-explore-submission';
import {
  buildExplorePath,
  exploreHandoffState,
  exploreQueryContext,
  mergeExploreQuery,
  parseExploreQuery,
  querySubmissionTimePatch,
  type ExploreQuery,
  type ExploreQueryPatch
} from '../model/explore-model';
import type { ExplorePageResult, LogRow, MetricConsole, TraceRow } from '../model/explore-signal-contract';
import { metricResultState } from '../model/explore-signal-model';
import { exploreQueryKeys } from './explore-query-keys';

type HistoricalData = MetricConsole | ExplorePageResult<LogRow> | ExplorePageResult<TraceRow>;
export type ExplorePageResultState =
  | { kind: 'invalid' }
  | { kind: 'live' }
  | { kind: 'loading' }
  | { kind: 'transport_error' }
  | { kind: 'contract_error' }
  | { kind: 'storage_unavailable' }
  | { kind: 'missing_context' }
  | { kind: 'unsupported_query' }
  | { kind: 'error' }
  | { kind: 'empty' | 'ready'; signal: 'metrics'; data: MetricConsole }
  | { kind: 'empty' | 'ready'; signal: 'logs'; data: ExplorePageResult<LogRow> }
  | { kind: 'empty' | 'ready'; signal: 'traces'; data: ExplorePageResult<TraceRow> };

export function useExplorePageController() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const parsedQuery = useMemo(() => parseExploreQuery(searchParams), [searchParams]);
  const sharedContext = useQueryContextOptional();
  const sharedTime = useSharedTimeOptional();
  const fixedWindow = exactWindow(parsedQuery);
  const query = parsedQuery;
  const handoff = exploreHandoffState(query);
  const context = sharedContext?.context ?? exploreQueryContext(query);
  const historical = handoff !== 'invalid' && !(query.signal === 'logs' && query.live);
  const queryResult = useQuery({
    queryKey: exploreQueryKeys.history(query, fixedWindow, sharedTime?.refreshRevision ?? 0),
    queryFn: ({ signal }) => loadHistorical(query, signal),
    enabled: historical,
    retry: false,
    staleTime: 0,
    refetchInterval: historical ? 30_000 : false
  });
  const updateQuery = (changes: ExploreQueryPatch) => {
    const next = mergeExploreQuery(query, mergeContextChanges(context, changes));
    setSearchParams(searchFromPath(buildExplorePath(next)));
  };
  const submission = useExploreSubmission(query, patch =>
    updateQuery({
      ...patch,
      ...querySubmissionTimePatch(query, fixedWindow),
      pageIndex: undefined
    })
  );
  return {
    query,
    handoff,
    submission,
    result: resolveResult(query, handoff, queryResult.isPending, queryResult.error, queryResult.data),
    updateQuery,
    refresh: () => (historical ? queryResult.refetch().then(() => undefined) : Promise.resolve()),
    openPath: (path: string) => {
      void navigate(path);
    }
  };
}

const contextFields = [
  'collectorId',
  'serviceName',
  'serviceNamespace',
  'environment',
  'instance',
  'endpoint'
] as const;

function mergeContextChanges(context: QueryContext, changes: ExploreQueryPatch): ExploreQueryPatch {
  if (!contextFields.some(field => Object.hasOwn(changes, field))) return changes;
  const patch = Object.fromEntries(
    contextFields.flatMap(field => (Object.hasOwn(changes, field) ? [[field, changes[field]]] : []))
  ) as Partial<QueryContext>;
  const next = mergeQueryContext(context, patch);
  return {
    ...changes,
    collectorId: next.collectorId,
    serviceName: next.serviceName,
    serviceNamespace: next.serviceNamespace,
    environment: next.environment,
    instance: next.instance,
    endpoint: next.endpoint
  };
}

function exactWindow(query: ExploreQuery) {
  return query.start != null && query.end != null && query.start < query.end
    ? { from: query.start, to: query.end }
    : undefined;
}

function loadHistorical(query: ExploreQuery, signal: AbortSignal): Promise<HistoricalData> {
  if (query.signal === 'metrics') return loadMetricSignal(query, signal);
  if (query.signal === 'logs') return loadLogSignal(query, signal);
  return loadTraceSignal(query, signal);
}

function resolveResult(
  query: ExploreQuery,
  handoff: ReturnType<typeof exploreHandoffState>,
  pending: boolean,
  error: Error | null,
  data: HistoricalData | undefined
): ExplorePageResultState {
  if (handoff === 'invalid') return { kind: 'invalid' };
  if (query.signal === 'logs' && query.live) return { kind: 'live' };
  if (pending) return { kind: 'loading' };
  if (error) {
    const kind = classifyExploreSignalError(error);
    return { kind: kind === 'transport_error' || kind === 'contract_error' ? kind : 'error' };
  }
  if (!data) return { kind: 'error' };
  return resolveDataResult(query, data);
}

function resolveDataResult(query: ExploreQuery, data: HistoricalData): ExplorePageResultState {
  if (query.signal === 'metrics') {
    const metric = metricResultState(data as MetricConsole);
    if (
      metric.kind === 'storage_unavailable' ||
      metric.kind === 'missing_context' ||
      metric.kind === 'unsupported_query'
    ) {
      return { kind: metric.kind };
    }
    if (metric.kind === 'error') return { kind: 'error' };
    return { kind: metric.kind, signal: 'metrics', data: data as MetricConsole };
  }
  if (query.signal === 'logs') {
    const page = data as ExplorePageResult<LogRow>;
    return { kind: page.totalElements === 0 ? 'empty' : 'ready', signal: 'logs', data: page };
  }
  const page = data as ExplorePageResult<TraceRow>;
  return { kind: page.totalElements === 0 ? 'empty' : 'ready', signal: 'traces', data: page };
}

function searchFromPath(path: string) {
  const marker = path.indexOf('?');
  return marker < 0 ? new URLSearchParams() : new URLSearchParams(path.slice(marker + 1));
}
