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

import { apiMessageGet, type PageResult } from '@/core/http/api-message';

import {
  exploreHandoffState,
  exploreUsesExactWindow,
  timeRangeMilliseconds,
  type ExploreQuery,
  type LogExploreQuery,
  type MetricExploreQuery,
  type TraceExploreQuery
} from './explore-query';
import type { LogRow, MetricConsole, TraceDetail, TraceRow } from './explore-signal-contract';

export type ExplorePageResult<T> = PageResult<T>;

export function loadMetricSignal(query: MetricExploreQuery, signal?: AbortSignal) {
  return apiMessageGet<MetricConsole>(buildSignalApiPath(query), requestSignal(signal));
}

export function loadLogSignal(query: LogExploreQuery, signal?: AbortSignal) {
  return apiMessageGet<PageResult<LogRow>>(buildSignalApiPath(query), requestSignal(signal));
}

export function loadTraceSignal(query: TraceExploreQuery, signal?: AbortSignal) {
  return apiMessageGet<PageResult<TraceRow>>(buildSignalApiPath(query), requestSignal(signal));
}

export function loadTraceDetail(traceId: string, signal?: AbortSignal) {
  return apiMessageGet<TraceDetail>(`/api/traces/${traceId}`, requestSignal(signal));
}

export function buildSignalApiPath(query: ExploreQuery, now = Date.now()) {
  const params = sharedSignalParams(query, now);

  if (query.signal === 'metrics') {
    setValue(params, 'query', query.query);
    setValue(params, 'filter', query.metricFilter);
    setValue(params, 'groupBy', query.groupBy);
    setValue(params, 'aggregation', query.aggregation);
    setValue(params, 'step', query.step);
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
    return `/api/logs/list?${params.toString()}`;
  }

  setValue(params, 'operationName', query.query);
  setValue(params, 'traceId', query.traceId);
  setValue(params, 'resourceFilter', query.resourceFilter);
  if (query.minDurationMs != null) params.set('minDurationMs', String(query.minDurationMs));
  if (query.maxDurationMs != null) params.set('maxDurationMs', String(query.maxDurationMs));
  if (query.errorOnly) params.set('errorOnly', 'true');
  return `/api/traces/list?${params.toString()}`;
}

export function buildLogStreamPath(query: LogExploreQuery) {
  const params = new URLSearchParams();
  const scoped = exploreHandoffState(query) === 'scoped';
  setValue(params, 'serviceName', query.serviceName);
  if (scoped) setValue(params, 'serviceNamespace', query.serviceNamespace);
  setValue(params, 'environment', query.environment);
  if (scoped) setValue(params, 'collectorId', query.collectorId);
  setValue(params, 'logContent', query.query);
  setValue(params, 'traceId', query.traceId);
  setValue(params, 'spanId', query.spanId);
  setValue(params, 'severityText', query.severityText);
  setValue(params, 'resourceFilter', query.resourceFilter);
  setValue(params, 'attributeFilter', query.attributeFilter);
  const suffix = params.toString();
  return suffix ? `/api/logs/sse/subscribe?${suffix}` : '/api/logs/sse/subscribe';
}

export function openLogStream(path: string) {
  return new EventSource(path);
}

function sharedSignalParams(query: ExploreQuery, now: number) {
  const params = new URLSearchParams();
  const end = query.end ?? now;
  const scoped = exploreHandoffState(query) === 'scoped';
  const exact = exploreUsesExactWindow(query);
  setValue(params, 'serviceName', query.serviceName);
  if (scoped) setValue(params, 'serviceNamespace', query.serviceNamespace);
  setValue(params, 'environment', query.environment);
  if (scoped) setValue(params, 'collectorId', query.collectorId);
  params.set('start', String(exact ? query.start : end - timeRangeMilliseconds(query.timeRange)));
  params.set('end', String(end));
  return params;
}

function setValue(params: URLSearchParams, key: string, value: string | undefined) {
  if (value) params.set(key, value);
}

function requestSignal(signal?: AbortSignal) {
  return { signal: signal ?? null };
}
