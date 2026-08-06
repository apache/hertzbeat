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

import { ApiMessageError, apiMessageGet } from '@/core/http/api-message';
import { openBrowserEventStream } from '@/core/http/event-stream';
import { QUERY_CONTEXT_FIELDS } from '@/shared/query-context';

import {
  exploreHandoffState,
  exploreUsesExactWindow,
  timeRangeMilliseconds,
  type ExploreQuery,
  type LogExploreQuery,
  type MetricExploreQuery,
  type TraceExploreQuery
} from '../model/explore-query';
import {
  acceptedExploreField,
  isOrderedTraceDurationRange,
  parseMetricAggregation,
  parseMetricStep,
  parseTraceDuration
} from '../model/explore-field-contract';
import { ExploreSignalContractError, ExploreSignalMissingError } from '../model/explore-signal-contract';
import { parseLogOverview, parseLogPage, parseLogRow, parseLogStreamGap, parseLogTrend } from './explore-log-schema';
import { parseMetricConsole, parseMetricInventory } from './explore-metric-schema';
import { parseTraceDetail, parseTracePage, parseTraceSpans } from './explore-trace-schema';

export async function loadMetricSignal(query: MetricExploreQuery, signal?: AbortSignal) {
  const observedAt = Date.now();
  const resolvedQuery = query.query?.trim() ? query : await resolveInventoryMetricQuery(query, observedAt, signal);
  return parseMetricConsole(await apiMessageGet(buildSignalApiPath(resolvedQuery, observedAt), requestSignal(signal)));
}

export async function loadLogSignal(query: LogExploreQuery, signal?: AbortSignal) {
  const pageIndex = query.pageIndex ?? 0;
  return parseLogPage(await apiMessageGet(buildSignalApiPath(query), requestSignal(signal)), pageIndex, 20);
}

export async function loadLogHistoryEvidence(query: LogExploreQuery, signal?: AbortSignal) {
  const observedAt = Date.now();
  const page = parseLogPage(
    await apiMessageGet(buildSignalApiPath(query, observedAt), requestSignal(signal)),
    query.pageIndex ?? 0,
    20
  );
  const [overview, trend] = await Promise.allSettled([
    apiMessageGet(buildLogStatsApiPath(query, 'overview', observedAt), requestSignal(signal)).then(parseLogOverview),
    apiMessageGet(buildLogStatsApiPath(query, 'trend', observedAt), requestSignal(signal)).then(parseLogTrend)
  ]);
  if (signal?.aborted) throw signal.reason ?? new DOMException('Aborted', 'AbortError');
  return {
    page,
    overview:
      overview.status === 'fulfilled' ? { kind: 'ready' as const, data: overview.value } : { kind: 'error' as const },
    trend: trend.status === 'fulfilled' ? { kind: 'ready' as const, data: trend.value } : { kind: 'error' as const }
  };
}

export async function loadTraceSignal(query: TraceExploreQuery, signal?: AbortSignal) {
  const pageIndex = query.pageIndex ?? 0;
  return parseTracePage(await apiMessageGet(buildSignalApiPath(query), requestSignal(signal)), pageIndex, 20);
}

export async function loadTraceDetail(query: TraceExploreQuery, traceId: string, signal?: AbortSignal) {
  if (!traceId) throw new ExploreSignalContractError('traceId is required');
  const observedAt = Date.now();
  const [detail, spans] = await Promise.all([
    apiMessageGet(buildTraceDetailApiPath(query, traceId, false, observedAt), requestSignal(signal)),
    apiMessageGet(buildTraceDetailApiPath(query, traceId, true, observedAt), requestSignal(signal))
  ]);
  return { ...parseTraceDetail(detail, traceId), spans: parseTraceSpans(spans, traceId) };
}

export function buildTraceDetailApiPath(query: TraceExploreQuery, traceId: string, spans = false, now = Date.now()) {
  requireQueryableScope(query);
  if (!traceId) throw new ExploreSignalContractError('traceId is required');
  const params = sharedSignalParams(query, now);
  setValue(params, 'spanId', query.spanId);
  setValue(params, 'resourceFilter', query.resourceFilter);
  setValue(params, 'attributeFilter', query.attributeFilter);
  if (query.minDurationMs != null) params.set('minDurationMs', String(query.minDurationMs));
  if (query.maxDurationMs != null) params.set('maxDurationMs', String(query.maxDurationMs));
  return `/api/traces/${encodeURIComponent(traceId)}${spans ? '/spans' : ''}?${params.toString()}`;
}

export function classifyExploreSignalError(
  reason: unknown
): 'missing' | 'permission' | 'transport_error' | 'contract_error' | 'error' {
  if (reason instanceof ExploreSignalMissingError) return 'missing';
  if (reason instanceof ExploreSignalContractError) return 'contract_error';
  if (reason instanceof ApiMessageError) {
    if (reason.status === 404 || (reason.status === 200 && reason.code === 3)) return 'missing';
    if (reason.status === 401 || reason.status === 403) return 'permission';
    if (reason.cause !== undefined || reason.status === undefined || [0, 502, 503, 504].includes(reason.status)) {
      return 'transport_error';
    }
  }
  return 'error';
}

export function buildSignalApiPath(query: ExploreQuery, now = Date.now()) {
  requireQueryableScope(query);
  const params = sharedSignalParams(query, now);

  if (query.signal === 'metrics') {
    setValue(params, 'query', query.query);
    setValue(params, 'operationName', query.operationName);
    setValue(params, 'filter', query.metricFilter);
    setValue(params, 'groupBy', query.groupBy);
    setValue(params, 'aggregation', acceptedExploreField(parseMetricAggregation(query.aggregation)));
    setValue(params, 'temporalAggregation', query.temporalAggregation);
    setValue(params, 'step', acceptedExploreField(parseMetricStep(query.step)));
    return `/api/ingestion/otlp/metrics/console?${params.toString()}`;
  }

  params.set('pageIndex', String(query.pageIndex ?? 0));
  params.set('pageSize', '20');
  if (query.signal === 'logs') {
    setValue(params, 'search', query.query);
    setValue(params, 'traceId', query.traceId);
    setValue(params, 'spanId', query.spanId);
    setValue(params, 'severityText', query.severityText);
    setValue(params, 'resourceFilter', query.resourceFilter);
    setValue(params, 'attributeFilter', query.attributeFilter);
    setEnabled(params, 'hideInternal', query.hideInternal);
    setEnabled(params, 'hideNoise', query.hideNoise);
    return `/api/logs/list?${params.toString()}`;
  }

  setValue(params, 'operationName', query.query);
  setValue(params, 'traceId', query.traceId);
  setValue(params, 'resourceFilter', query.resourceFilter);
  setValue(params, 'attributeFilter', query.attributeFilter);
  const minimumDuration = acceptedExploreField(parseTraceDuration(String(query.minDurationMs ?? '')));
  const maximumDuration = acceptedExploreField(parseTraceDuration(String(query.maxDurationMs ?? '')));
  if (isOrderedTraceDurationRange(minimumDuration, maximumDuration)) {
    if (minimumDuration != null) params.set('minDurationMs', String(minimumDuration));
    if (maximumDuration != null) params.set('maxDurationMs', String(maximumDuration));
  }
  if (query.errorOnly) params.set('errorOnly', 'true');
  setValue(params, 'spanScope', query.spanScope);
  setEnabled(params, 'hideInternal', query.hideInternal);
  return `/api/traces/list?${params.toString()}`;
}

export function buildLogStatsApiPath(query: LogExploreQuery, kind: 'overview' | 'trend', now = Date.now()) {
  requireQueryableScope(query);
  const params = sharedSignalParams(query, now);
  appendLogFilters(params, query);
  return `/api/logs/stats/${kind}?${params.toString()}`;
}

export function buildLogStreamPath(query: LogExploreQuery) {
  requireQueryableScope(query);
  const params = new URLSearchParams();
  const scoped = exploreHandoffState(query) === 'scoped';
  setValue(params, 'serviceName', query.serviceName);
  setValue(params, 'serviceNamespace', query.serviceNamespace);
  setValue(params, 'environment', query.environment);
  if (scoped) setValue(params, 'collectorId', query.collectorId);
  appendOptionalDimensions(params, query);
  setValue(params, 'logContent', query.query);
  setValue(params, 'traceId', query.traceId);
  setValue(params, 'spanId', query.spanId);
  setValue(params, 'severityText', query.severityText);
  setValue(params, 'resourceFilter', query.resourceFilter);
  setValue(params, 'attributeFilter', query.attributeFilter);
  setEnabled(params, 'hideInternal', query.hideInternal);
  setEnabled(params, 'hideNoise', query.hideNoise);
  const suffix = params.toString();
  return suffix ? `/api/logs/sse/subscribe?${suffix}` : '/api/logs/sse/subscribe';
}

export function openLogStream(
  path: string,
  handlers: {
    onOpen: () => void;
    onLog: (row: ReturnType<typeof parseLogRow>) => void;
    onGap: (gap: ReturnType<typeof parseLogStreamGap>) => void;
    onRetrying: () => void;
    onUnavailable: () => void;
    onContractError: () => void;
  }
) {
  return openBrowserEventStream(path, {
    eventNames: ['LOG_EVENT', 'LOG_STREAM_GAP'],
    onOpen: handlers.onOpen,
    onRetrying: handlers.onRetrying,
    onUnavailable: handlers.onUnavailable,
    onEvent: (name, data) => {
      try {
        const value = JSON.parse(data) as unknown;
        if (name === 'LOG_STREAM_GAP') handlers.onGap(parseLogStreamGap(value));
        else handlers.onLog(parseLogRow(value));
      } catch (error) {
        if (error instanceof ExploreSignalContractError || error instanceof SyntaxError) {
          handlers.onContractError();
          return;
        }
        throw error;
      }
    }
  });
}

function sharedSignalParams(query: ExploreQuery, now: number) {
  const params = new URLSearchParams();
  const scoped = exploreHandoffState(query) === 'scoped';
  const exact = exploreUsesExactWindow(query);
  setValue(params, 'serviceName', query.serviceName);
  setValue(params, 'serviceNamespace', query.serviceNamespace);
  setValue(params, 'environment', query.environment);
  if (scoped) setValue(params, 'collectorId', query.collectorId);
  appendOptionalDimensions(params, query);
  // Relative windows slide on every request; route timestamps are authoritative only for an exact window.
  params.set('start', String(exact ? query.start : now - timeRangeMilliseconds(query.timeRange)));
  params.set('end', String(exact ? query.end : now));
  return params;
}

async function resolveInventoryMetricQuery(
  query: MetricExploreQuery,
  observedAt: number,
  signal?: AbortSignal
): Promise<MetricExploreQuery> {
  const inventory = parseMetricInventory(
    await apiMessageGet(buildMetricInventoryApiPath(query, observedAt), requestSignal(signal))
  );
  // A successfully empty inventory has no metric to select; `up` is the stable established fallback.
  return { ...query, query: inventory.items[0]?.metricName ?? 'up' };
}

function buildMetricInventoryApiPath(query: MetricExploreQuery, now = Date.now()) {
  const params = sharedSignalParams(query, now);
  params.set('limit', '20');
  return `/api/ingestion/otlp/metrics/inventory?${params.toString()}`;
}

function appendLogFilters(params: URLSearchParams, query: LogExploreQuery) {
  setValue(params, 'search', query.query);
  setValue(params, 'traceId', query.traceId);
  setValue(params, 'spanId', query.spanId);
  setValue(params, 'severityText', query.severityText);
  setValue(params, 'resourceFilter', query.resourceFilter);
  setValue(params, 'attributeFilter', query.attributeFilter);
  setEnabled(params, 'hideInternal', query.hideInternal);
  setEnabled(params, 'hideNoise', query.hideNoise);
}

function setValue(params: URLSearchParams, key: string, value: string | undefined) {
  if (value) params.set(key, value);
}

function setEnabled(params: URLSearchParams, key: string, value: boolean | undefined) {
  if (value) params.set(key, 'true');
}

function appendOptionalDimensions(params: URLSearchParams, query: ExploreQuery) {
  setValue(params, QUERY_CONTEXT_FIELDS.instance, query.instance);
  setValue(params, QUERY_CONTEXT_FIELDS.endpoint, query.endpoint);
}

function requireQueryableScope(query: ExploreQuery) {
  if (exploreHandoffState(query) === 'invalid') {
    throw new Error('Invalid instrumentation context');
  }
}

function requestSignal(signal?: AbortSignal) {
  return { signal: signal ?? null };
}
