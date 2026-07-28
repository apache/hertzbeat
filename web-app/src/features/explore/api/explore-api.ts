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
import { parseLogPage, parseLogRow, parseLogStreamGap } from './explore-log-schema';
import { parseMetricConsole } from './explore-metric-schema';
import { parseTraceDetail, parseTracePage } from './explore-trace-schema';

export async function loadMetricSignal(query: MetricExploreQuery, signal?: AbortSignal) {
  return parseMetricConsole(await apiMessageGet(buildSignalApiPath(query), requestSignal(signal)));
}

export async function loadLogSignal(query: LogExploreQuery, signal?: AbortSignal) {
  const pageIndex = query.pageIndex ?? 0;
  return parseLogPage(await apiMessageGet(buildSignalApiPath(query), requestSignal(signal)), pageIndex, 20);
}

export async function loadTraceSignal(query: TraceExploreQuery, signal?: AbortSignal) {
  const pageIndex = query.pageIndex ?? 0;
  return parseTracePage(await apiMessageGet(buildSignalApiPath(query), requestSignal(signal)), pageIndex, 20);
}

export async function loadTraceDetail(traceId: string, signal?: AbortSignal) {
  if (!traceId) throw new ExploreSignalContractError('traceId is required');
  const raw = await apiMessageGet(`/api/traces/${encodeURIComponent(traceId)}`, requestSignal(signal));
  return parseTraceDetail(raw, traceId);
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
    setValue(params, 'filter', query.metricFilter);
    setValue(params, 'groupBy', query.groupBy);
    setValue(params, 'aggregation', acceptedExploreField(parseMetricAggregation(query.aggregation)));
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
    return `/api/logs/list?${params.toString()}`;
  }

  setValue(params, 'operationName', query.query);
  setValue(params, 'traceId', query.traceId);
  setValue(params, 'resourceFilter', query.resourceFilter);
  const minimumDuration = acceptedExploreField(parseTraceDuration(String(query.minDurationMs ?? '')));
  const maximumDuration = acceptedExploreField(parseTraceDuration(String(query.maxDurationMs ?? '')));
  if (isOrderedTraceDurationRange(minimumDuration, maximumDuration)) {
    if (minimumDuration != null) params.set('minDurationMs', String(minimumDuration));
    if (maximumDuration != null) params.set('maxDurationMs', String(maximumDuration));
  }
  if (query.errorOnly) params.set('errorOnly', 'true');
  return `/api/traces/list?${params.toString()}`;
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

function setValue(params: URLSearchParams, key: string, value: string | undefined) {
  if (value) params.set(key, value);
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
