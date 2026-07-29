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

import { applicationRoutePaths } from '@/shared/navigation/app-paths';
import { parseQueryContext, writeQueryContext } from '@/shared/query-context';

import { parseExploreFilterParams } from './explore-field-contract';
import type {
  ExploreQuery,
  ExploreQueryPatch,
  ExploreSignal,
  ExploreTimeRange,
  TraceExploreQuery
} from './explore-query';

const DEFAULT_SIGNAL: ExploreSignal = 'traces';
const DEFAULT_TIME_RANGE: ExploreTimeRange = 'last-30m';
export const EXPLORE_TIME_RANGES: ExploreTimeRange[] = ['last-15m', 'last-30m', 'last-1h', 'last-6h', 'last-24h'];
const AUTO_REFRESH_VALUES = [30_000, 60_000] as const;

export function parseExploreQuery(params: URLSearchParams): ExploreQuery {
  const context = parseAliasedContext(params);
  const time = parseUrlTime(params);
  return normalizeExploreQuery({
    signal: readSignal(params.get('signal')),
    timeRange: readTimeRange(aliasedValue(params, 'timeRange', 'range')),
    ...context,
    query: readValue(params.get('query')),
    windowMode: params.get('windowMode') === 'preset' ? 'preset' : undefined,
    traceId: readValue(params.get('traceId')),
    errorOnly: params.get('errorOnly') === 'true' ? true : undefined,
    autoRefreshMs: readAutoRefresh(params.get('autoRefresh')),
    start: time.start,
    end: time.end,
    live: readLiveMode(params),
    severityText: readValue(params.get('severityText')),
    spanId: readValue(params.get('spanId')),
    resourceFilter: readValue(params.get('resourceFilter')),
    attributeFilter: readValue(params.get('attributeFilter')),
    operationName: readValue(params.get('operationName')),
    metricFilter: readValue(params.get('metricFilter')),
    groupBy: readValue(params.get('groupBy')),
    ...parseExploreFilterParams(params),
    pageIndex: readPageIndex(params.get('page'))
  });
}

export function buildExplorePath(query: ExploreQuery) {
  const normalized = normalizeExploreQuery(query);
  const params = new URLSearchParams({ signal: normalized.signal, timeRange: normalized.timeRange });
  setValue(params, 'query', normalized.query);
  appendSignalParams(params, normalized);
  if (normalized.windowMode === 'preset') params.set('windowMode', 'preset');
  if (normalized.autoRefreshMs) params.set('autoRefresh', String(normalized.autoRefreshMs));
  if (normalized.start) params.set('start', String(normalized.start));
  if (normalized.end) params.set('end', String(normalized.end));
  return `${applicationRoutePaths.explore}?${writeQueryContext(params, normalized).toString()}`;
}

export function normalizeExploreQuery(
  query: ExploreQueryPatch & { signal: ExploreSignal; timeRange: ExploreTimeRange }
): ExploreQuery {
  const exactWindow = query.start != null && query.end != null && query.start < query.end;
  // A preset with residual timestamps is invalid handoff evidence. Preserve it so URL repair cannot widen scope.
  const invalidPresetEvidence = query.windowMode === 'preset' && (query.start != null || query.end != null);
  const shared = {
    timeRange: query.timeRange,
    intakeProfileId: query.intakeProfileId,
    serviceName: query.serviceName,
    serviceNamespace: query.serviceNamespace,
    environment: query.environment,
    collectorId: query.collectorId,
    instance: query.instance,
    endpoint: query.endpoint,
    query: query.query,
    windowMode: query.windowMode,
    autoRefreshMs: exactWindow ? undefined : query.autoRefreshMs,
    start: exactWindow || invalidPresetEvidence ? query.start : undefined,
    end: exactWindow || invalidPresetEvidence ? query.end : undefined
  };
  if (query.signal === 'metrics')
    return {
      ...shared,
      signal: 'metrics',
      operationName: query.operationName,
      metricFilter: query.metricFilter,
      groupBy: query.groupBy,
      aggregation: query.aggregation,
      step: query.step
    };
  const traceContext = {
    ...shared,
    traceId: query.traceId,
    resourceFilter: query.resourceFilter,
    attributeFilter: query.attributeFilter,
    pageIndex: query.pageIndex
  };
  if (query.signal === 'logs')
    return {
      ...traceContext,
      signal: 'logs',
      live: query.live,
      severityText: query.severityText,
      spanId: query.spanId
    };
  return {
    ...traceContext,
    signal: 'traces',
    spanId: query.spanId,
    errorOnly: query.errorOnly,
    minDurationMs: query.minDurationMs,
    maxDurationMs: query.maxDurationMs
  };
}

function parseAliasedContext(params: URLSearchParams) {
  return {
    ...parseQueryContext(params),
    serviceNamespace: readValue(aliasedValue(params, 'serviceNamespace', 'namespace')),
    instance: readValue(aliasedValue(params, 'instance', 'serviceInstanceId')),
    endpoint: readValue(aliasedValue(params, 'endpoint', 'http.route'))
  };
}

function appendSignalParams(params: URLSearchParams, query: ExploreQuery) {
  if (query.signal === 'metrics') {
    for (const [key, value] of [
      ['operationName', query.operationName],
      ['metricFilter', query.metricFilter],
      ['groupBy', query.groupBy],
      ['aggregation', query.aggregation],
      ['step', query.step]
    ] as const)
      setValue(params, key, value);
    return;
  }
  setValue(params, 'traceId', query.traceId);
  setValue(params, 'resourceFilter', query.resourceFilter);
  setValue(params, 'attributeFilter', query.attributeFilter);
  setValue(params, 'spanId', query.spanId);
  if (query.pageIndex) params.set('page', String(query.pageIndex));
  if (query.signal === 'logs') {
    if (query.live) params.set('mode', 'live');
    setValue(params, 'severityText', query.severityText);
    return;
  }
  if (query.errorOnly) params.set('errorOnly', 'true');
  if (query.minDurationMs != null) params.set('minDurationMs', String(query.minDurationMs));
  if (query.maxDurationMs != null) params.set('maxDurationMs', String(query.maxDurationMs));
}

function readSignal(value: string | null): ExploreSignal {
  return value === 'metrics' || value === 'logs' || value === 'traces' ? value : DEFAULT_SIGNAL;
}

function readTimeRange(value: string | null): ExploreTimeRange {
  return EXPLORE_TIME_RANGES.includes(value as ExploreTimeRange) ? (value as ExploreTimeRange) : DEFAULT_TIME_RANGE;
}

function readValue(value: string | null) {
  return value?.trim() || undefined;
}

function readAutoRefresh(value: string | null) {
  const parsed = readPositiveInteger(value);
  return AUTO_REFRESH_VALUES.includes(parsed as (typeof AUTO_REFRESH_VALUES)[number]) ? parsed : undefined;
}

function readTimestamp(value: string | null) {
  return readPositiveInteger(value);
}

function parseUrlTime(params: URLSearchParams) {
  const start = readTimestamp(params.get('start'));
  const end = readTimestamp(params.get('end'));
  return { start, end };
}

function readPageIndex(value: string | null) {
  const parsed = readPositiveInteger(value);
  return parsed && parsed > 0 ? parsed : undefined;
}

function readPositiveInteger(value: string | null) {
  if (!value || !/^\d+$/u.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function readLiveMode(params: URLSearchParams) {
  const mode = params.get('mode');
  return mode !== null ? (mode === 'live' ? true : undefined) : params.get('live') === 'true' ? true : undefined;
}

function aliasedValue(params: URLSearchParams, canonical: string, alias: string) {
  return params.has(canonical) ? params.get(canonical) : params.get(alias);
}

function setValue(params: URLSearchParams, key: string, value: string | undefined) {
  if (value) params.set(key, value);
}
