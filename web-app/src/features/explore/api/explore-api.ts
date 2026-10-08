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

import { logStatisticEvidence } from './log-statistic-evidence';
import { loadMetricComposition } from './explore-metric-composition-api';
import { apiMessageGet } from '@/core/http/api-message';
import { QUERY_CONTEXT_FIELDS } from '@/shared/query-context';

import {
  exploreHandoffState,
  exploreUsesExactWindow,
  timeRangeMilliseconds,
  validTraceStructureQuery,
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
import { ExploreSignalContractError } from '../model/explore-signal-contract';
import { METRIC_INVENTORY_LIMIT } from '../model/explore-metric-inventory';
import { parseLogOverview, parseLogPage, parseLogTrend } from './explore-log-schema';
import { parseMetricConsole, parseMetricInventory } from './explore-metric-schema';
import { parseTracePage } from './explore-trace-schema';
import { parseTraceStructure } from '../model/explore-trace-structure';

export { classifyExploreSignalError } from './explore-signal-api-model';

export async function loadMetricSignal(query: MetricExploreQuery, signal?: AbortSignal) {
  if (query.metricPlan) {
    const window = resolveSignalWindow(query, Date.now());
    return loadMetricComposition(query, { from: window.start, to: window.end }, loadScalarMetric, signal);
  }
  if (!query.query?.trim()) return { kind: 'selection_required' } as const;
  return loadScalarMetric(query, signal);
}

export async function loadLogSignal(query: LogExploreQuery, signal?: AbortSignal) {
  const pageIndex = query.pageIndex ?? 0;
  return parseLogPage(
    await apiMessageGet(buildSignalApiPath(query), { ...requestSignal(signal), preserveErrorEnvelope: true }),
    pageIndex,
    20
  );
}

export async function loadLogHistoryEvidence(query: LogExploreQuery, signal?: AbortSignal) {
  const observedAt = Date.now();
  const page = parseLogPage(
    await apiMessageGet(buildSignalApiPath(query, observedAt), {
      ...requestSignal(signal),
      preserveErrorEnvelope: true
    }),
    query.pageIndex ?? 0,
    20
  );
  const statistics = await loadLogStatistics(query, signal, observedAt);
  return { page, ...statistics };
}

export async function loadLogStatistics(query: LogExploreQuery, signal?: AbortSignal, observedAt = Date.now()) {
  const requestWindow = resolveSignalWindow(query, observedAt);
  const [overview, trend] = await Promise.allSettled([
    apiMessageGet(buildLogStatsApiPath(query, 'overview', observedAt), {
      ...requestSignal(signal),
      preserveErrorEnvelope: true
    }).then(parseLogOverview),
    apiMessageGet(buildLogStatsApiPath(query, 'trend', observedAt), {
      ...requestSignal(signal),
      preserveErrorEnvelope: true
    })
      .then(parseLogTrend)
      .then(trend => requireTrendWindow(trend, requestWindow))
  ]);
  if (signal?.aborted) throw signal.reason ?? new DOMException('Aborted', 'AbortError');
  return {
    overview: logStatisticEvidence(overview),
    trend: logStatisticEvidence(trend)
  };
}

export async function loadTraceSignal(query: TraceExploreQuery, signal?: AbortSignal) {
  const pageIndex = query.pageIndex ?? 0;
  return parseTracePage(
    await apiMessageGet(buildSignalApiPath(query), requestSignal(signal)),
    pageIndex,
    20,
    query.sort ?? 'newest'
  );
}

export function buildSignalApiPath(query: ExploreQuery, now = Date.now()) {
  requireQueryableScope(query);
  if (query.signal === 'traces' && query.traceStructure !== undefined) {
    return `/api/traces/structure?${traceStructureParams(query, now).toString()}`;
  }
  return buildOrdinarySignalApiPath(query, now);
}

function buildOrdinarySignalApiPath(query: ExploreQuery, now: number) {
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
    setValue(params, 'sort', query.sort);
    setValue(params, 'logSort', query.logSort);
    appendLogFilters(params, query);
    return `/api/logs/list?${params.toString()}`;
  }

  params.set('sort', query.sort ?? 'newest');
  setEnabled(params, 'endExclusive', query.endExclusive);
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

export function buildTraceStructureAnalysisPath(query: TraceExploreQuery, now = Date.now()) {
  requireQueryableScope(query);
  return `/api/traces/structure/analysis?${traceStructureParams(query, now).toString()}`;
}

function traceStructureParams(query: TraceExploreQuery, now: number) {
  if (!validTraceStructureQuery(query) || query.traceStructure === undefined)
    throw new ExploreSignalContractError('Invalid structural trace query');
  const structure = parseTraceStructure(query.traceStructure)!;
  const window = resolveSignalWindow(query, now);
  const params = new URLSearchParams({
    start: String(window.start),
    end: String(window.end),
    relation: structure.relation,
    pageIndex: String(query.pageIndex ?? 0),
    pageSize: '20'
  });
  for (const [label, clause] of [
    ['a', structure.a],
    ['b', structure.b]
  ] as const) {
    setValue(params, `${label}ServiceName`, clause.serviceName ?? undefined);
    setValue(params, `${label}OperationName`, clause.operationName ?? undefined);
    setValue(params, `${label}Status`, clause.status ?? undefined);
  }
  return params;
}

function buildLogStatsApiPath(query: LogExploreQuery, kind: 'overview' | 'trend', now = Date.now()) {
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
  setValue(params, 'searchSyntax', query.searchSyntax);
  if (query.logGroupSelection !== undefined) params.set('logGroupSelection', query.logGroupSelection);
  if (query.logNumericRange !== undefined) params.set('logNumericRange', query.logNumericRange);
  setValue(params, 'severityText', query.severityText);
  setValue(params, 'severityCategory', query.severityCategory);
  setValue(params, 'resourceFilter', query.resourceFilter);
  setValue(params, 'attributeFilter', query.attributeFilter);
  setEnabled(params, 'hideInternal', query.hideInternal);
  setEnabled(params, 'hideNoise', query.hideNoise);
  const suffix = params.toString();
  return suffix ? `/api/logs/sse/subscribe?${suffix}` : '/api/logs/sse/subscribe';
}

export { openLogStream } from './explore-log-stream';

function sharedSignalParams(query: ExploreQuery, now: number) {
  const params = new URLSearchParams();
  const scoped = exploreHandoffState(query) === 'scoped';
  const window = resolveSignalWindow(query, now);
  setValue(params, QUERY_CONTEXT_FIELDS.entityId, query.entityId);
  setValue(params, 'serviceName', query.serviceName);
  setValue(params, 'serviceNamespace', query.serviceNamespace);
  setValue(params, 'environment', query.environment);
  if (scoped) setValue(params, 'collectorId', query.collectorId);
  appendOptionalDimensions(params, query);
  // Relative windows slide on every request; route timestamps are authoritative only for an exact window.
  params.set('start', String(window.start));
  params.set('end', String(window.end));
  return params;
}

function resolveSignalWindow(query: ExploreQuery, observedAt: number) {
  if (exploreUsesExactWindow(query)) {
    return { start: query.start!, end: query.end! };
  }
  return { start: observedAt - timeRangeMilliseconds(query.timeRange), end: observedAt };
}

function requireTrendWindow<T extends { start: number; end: number }>(
  trend: T,
  requestWindow: { start: number; end: number }
) {
  if (trend.start !== requestWindow.start || trend.end !== requestWindow.end) {
    throw new ExploreSignalContractError('Log trend does not match request window');
  }
  return trend;
}

export async function loadMetricInventory(query: MetricExploreQuery, search: string, signal?: AbortSignal) {
  requireQueryableScope(query);
  const params = sharedSignalParams(query, Date.now());
  params.set('limit', String(METRIC_INVENTORY_LIMIT));
  setValue(params, 'search', search.trim());
  return parseMetricInventory(
    await apiMessageGet(`/api/ingestion/otlp/metrics/inventory?${params.toString()}`, requestSignal(signal))
  );
}

function appendLogFilters(params: URLSearchParams, query: LogExploreQuery) {
  setValue(params, 'search', query.query);
  setValue(params, 'traceId', query.traceId);
  setValue(params, 'spanId', query.spanId);
  setValue(params, 'searchSyntax', query.searchSyntax);
  if (query.logGroupSelection !== undefined) params.set('logGroupSelection', query.logGroupSelection);
  if (query.logNumericRange !== undefined) params.set('logNumericRange', query.logNumericRange);
  setValue(params, 'severityText', query.severityText);
  setValue(params, 'severityCategory', query.severityCategory);
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

async function loadScalarMetric(query: MetricExploreQuery, signal?: AbortSignal) {
  return parseMetricConsole(
    await apiMessageGet(buildSignalApiPath(query), { ...requestSignal(signal), preserveErrorEnvelope: true })
  );
}
