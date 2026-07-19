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

import {
  exploreHandoffState,
  exploreUsesExactWindow,
  type ExploreQuery,
  type ExploreSignal,
  type ExploreTimeRange
} from './explore-query';

import { parseQueryContext, writeQueryContext, type ExactTimeWindow, type QueryContext } from '@/shared/query-context';

export {
  exploreHandoffState,
  exploreUsesExactWindow,
  timeRangeMilliseconds,
  type ExploreQuery,
  type ExploreSignal,
  type ExploreTimeRange,
  type LogExploreQuery,
  type MetricExploreQuery,
  type TraceExploreQuery
} from './explore-query';

export type ExploreQueryPatch = {
  signal?: ExploreSignal | undefined;
  timeRange?: ExploreTimeRange | undefined;
  serviceName?: string | undefined;
  serviceNamespace?: string | undefined;
  environment?: string | undefined;
  collectorId?: string | undefined;
  instance?: string | undefined;
  endpoint?: string | undefined;
  query?: string | undefined;
  windowMode?: 'preset' | undefined;
  start?: number | undefined;
  end?: number | undefined;
  traceId?: string | undefined;
  errorOnly?: boolean | undefined;
  live?: boolean | undefined;
  severityText?: string | undefined;
  spanId?: string | undefined;
  resourceFilter?: string | undefined;
  attributeFilter?: string | undefined;
  metricFilter?: string | undefined;
  groupBy?: string | undefined;
  aggregation?: string | undefined;
  step?: string | undefined;
  minDurationMs?: number | undefined;
  maxDurationMs?: number | undefined;
  pageIndex?: number | undefined;
};

const DEFAULT_EXPLORE_QUERY: ExploreQuery = {
  signal: 'traces',
  timeRange: 'last-30m'
};

export const EXPLORE_TIME_RANGES: ExploreTimeRange[] = ['last-15m', 'last-30m', 'last-1h', 'last-6h', 'last-24h'];

export function parseExploreQuery(params: URLSearchParams): ExploreQuery {
  const signal = readSignal(params.get('signal'));
  const timeRange = readTimeRange(params.get('timeRange'));
  const context = parseQueryContext(params);
  return normalizeExploreQuery({
    signal,
    timeRange,
    ...context,
    query: readValue(params.get('query')),
    windowMode: params.get('windowMode') === 'preset' ? 'preset' : undefined,
    traceId: readValue(params.get('traceId')),
    errorOnly: params.get('errorOnly') === 'true' ? true : undefined,
    start: readTimestamp(params.get('start')),
    end: readTimestamp(params.get('end')),
    live: params.get('live') === 'true' ? true : undefined,
    severityText: readValue(params.get('severityText')),
    spanId: readValue(params.get('spanId')),
    resourceFilter: readValue(params.get('resourceFilter')),
    attributeFilter: readValue(params.get('attributeFilter')),
    metricFilter: readValue(params.get('metricFilter')),
    groupBy: readValue(params.get('groupBy')),
    aggregation: readValue(params.get('aggregation')),
    step: readValue(params.get('step')),
    minDurationMs: readPositiveNumber(params.get('minDurationMs')),
    maxDurationMs: readPositiveNumber(params.get('maxDurationMs')),
    pageIndex: readPageIndex(params.get('page'))
  });
}

export function buildExplorePath(query: ExploreQuery) {
  const params = writeQueryContext(new URLSearchParams({ signal: query.signal, timeRange: query.timeRange }), query);
  setValue(params, 'query', query.query);
  appendSignalParams(params, query);
  if (query.windowMode === 'preset') params.set('windowMode', 'preset');
  if (query.start) params.set('start', String(query.start));
  if (query.end) params.set('end', String(query.end));
  return `/explore?${params.toString()}`;
}

export function exploreQueryContext(query: ExploreQuery): QueryContext {
  return {
    collectorId: query.collectorId,
    serviceName: query.serviceName,
    serviceNamespace: query.serviceNamespace,
    environment: query.environment,
    instance: query.instance,
    endpoint: query.endpoint
  };
}

/**
 * Transient evidence must be discarded whenever any route-owned query input
 * changes, otherwise a drawer can display data from the previous scope.
 */
export function exploreEvidenceScopeKey(query: ExploreQuery) {
  return buildExplorePath(query);
}

export function mergeExploreQuery(query: ExploreQuery, changes: ExploreQueryPatch): ExploreQuery {
  return normalizeExploreQuery({
    ...query,
    ...changes,
    signal: changes.signal ?? query.signal,
    timeRange: changes.timeRange ?? query.timeRange
  });
}

export function buildCrossSignalPath(
  query: ExploreQuery,
  signal: ExploreSignal,
  context: { traceId?: string | undefined }
) {
  return buildExplorePath(
    mergeExploreQuery(query, {
      ...signalSelectionPatch(signal),
      traceId: context.traceId ?? (query.signal === 'metrics' ? undefined : query.traceId)
    })
  );
}

/**
 * Keep investigation scope when changing signals, but drop the free-text
 * expression because it means a metric name, log search, or operation name
 * depending on the selected signal.
 */
export function signalSelectionPatch(signal: ExploreSignal): ExploreQueryPatch {
  return { signal, query: undefined, live: undefined, pageIndex: undefined };
}

export function querySubmissionTimePatch(query: ExploreQuery, routeWindow?: ExactTimeWindow): ExploreQueryPatch {
  if (exploreUsesExactWindow(query)) return {};
  return routeWindow
    ? { start: routeWindow.from, end: routeWindow.to, windowMode: undefined }
    : { start: undefined, end: undefined };
}

export function presetTimeRangePatch(query: ExploreQuery, timeRange: ExploreTimeRange): ExploreQueryPatch {
  return {
    timeRange,
    windowMode: exploreHandoffState(query) === 'scoped' ? 'preset' : undefined,
    start: undefined,
    end: undefined
  };
}

function readSignal(value: string | null): ExploreSignal {
  return value === 'metrics' || value === 'logs' || value === 'traces' ? value : DEFAULT_EXPLORE_QUERY.signal;
}

function readTimeRange(value: string | null): ExploreTimeRange {
  return EXPLORE_TIME_RANGES.includes(value as ExploreTimeRange)
    ? (value as ExploreTimeRange)
    : DEFAULT_EXPLORE_QUERY.timeRange;
}

function readValue(value: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function readTimestamp(value: string | null) {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const timestamp = Number(value);
  return Number.isSafeInteger(timestamp) && timestamp > 0 ? timestamp : undefined;
}

function readPageIndex(value: string | null) {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const pageIndex = Number(value);
  return Number.isSafeInteger(pageIndex) && pageIndex > 0 ? pageIndex : undefined;
}

function readPositiveNumber(value: string | null) {
  if (!value) return undefined;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : undefined;
}

function setValue(params: URLSearchParams, key: string, value: string | undefined) {
  if (value) params.set(key, value);
}

function appendSignalParams(params: URLSearchParams, query: ExploreQuery) {
  if (query.signal === 'metrics') {
    setValue(params, 'metricFilter', query.metricFilter);
    setValue(params, 'groupBy', query.groupBy);
    setValue(params, 'aggregation', query.aggregation);
    setValue(params, 'step', query.step);
    return;
  }
  setValue(params, 'traceId', query.traceId);
  setValue(params, 'resourceFilter', query.resourceFilter);
  if (query.pageIndex) params.set('page', String(query.pageIndex));
  if (query.signal === 'logs') {
    if (query.live) params.set('live', 'true');
    setValue(params, 'severityText', query.severityText);
    setValue(params, 'spanId', query.spanId);
    setValue(params, 'attributeFilter', query.attributeFilter);
    return;
  }
  if (query.errorOnly) params.set('errorOnly', 'true');
  if (query.minDurationMs != null) params.set('minDurationMs', String(query.minDurationMs));
  if (query.maxDurationMs != null) params.set('maxDurationMs', String(query.maxDurationMs));
}

function normalizeExploreQuery(
  query: ExploreQueryPatch & { signal: ExploreSignal; timeRange: ExploreTimeRange }
): ExploreQuery {
  const shared = {
    timeRange: query.timeRange,
    serviceName: query.serviceName,
    serviceNamespace: query.serviceNamespace,
    environment: query.environment,
    collectorId: query.collectorId,
    instance: query.instance,
    endpoint: query.endpoint,
    query: query.query,
    windowMode: query.windowMode,
    start: query.start,
    end: query.end
  };
  if (query.signal === 'metrics')
    return {
      ...shared,
      signal: 'metrics',
      metricFilter: query.metricFilter,
      groupBy: query.groupBy,
      aggregation: query.aggregation,
      step: query.step
    };
  const traceContext = {
    ...shared,
    traceId: query.traceId,
    resourceFilter: query.resourceFilter,
    pageIndex: query.pageIndex
  };
  if (query.signal === 'logs')
    return {
      ...traceContext,
      signal: 'logs',
      live: query.live,
      severityText: query.severityText,
      spanId: query.spanId,
      attributeFilter: query.attributeFilter
    };
  return {
    ...traceContext,
    signal: 'traces',
    errorOnly: query.errorOnly,
    minDurationMs: query.minDurationMs,
    maxDurationMs: query.maxDurationMs
  };
}
