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

export type ExploreSignal = 'metrics' | 'logs' | 'traces';

export type ExploreTimeRange = 'last-15m' | 'last-30m' | 'last-1h' | 'last-6h' | 'last-24h';

export type ExploreQuery = {
  signal: ExploreSignal;
  timeRange: ExploreTimeRange;
  serviceName?: string | undefined;
  environment?: string | undefined;
  query?: string | undefined;
  traceId?: string | undefined;
  errorOnly?: boolean | undefined;
};

const DEFAULT_EXPLORE_QUERY: ExploreQuery = {
  signal: 'traces',
  timeRange: 'last-30m'
};

export const EXPLORE_TIME_RANGES: ExploreTimeRange[] = ['last-15m', 'last-30m', 'last-1h', 'last-6h', 'last-24h'];

export function parseExploreQuery(params: URLSearchParams): ExploreQuery {
  const signal = readSignal(params.get('signal'));
  const timeRange = readTimeRange(params.get('timeRange'));
  return {
    signal,
    timeRange,
    serviceName: readValue(params.get('serviceName')),
    environment: readValue(params.get('environment')),
    query: readValue(params.get('query')),
    traceId: readValue(params.get('traceId')),
    errorOnly: params.get('errorOnly') === 'true' ? true : undefined
  };
}

export function buildExplorePath(query: ExploreQuery) {
  const params = new URLSearchParams({ signal: query.signal, timeRange: query.timeRange });
  setValue(params, 'serviceName', query.serviceName);
  setValue(params, 'environment', query.environment);
  setValue(params, 'query', query.query);
  setValue(params, 'traceId', query.traceId);
  if (query.errorOnly) params.set('errorOnly', 'true');
  return `/explore?${params.toString()}`;
}

export function buildSignalApiPath(query: ExploreQuery) {
  const params = new URLSearchParams();
  setValue(params, 'serviceName', query.serviceName);
  setValue(params, 'environment', query.environment);
  setValue(params, 'start', String(Date.now() - timeRangeMilliseconds(query.timeRange)));
  setValue(params, 'end', String(Date.now()));

  if (query.signal === 'metrics') {
    setValue(params, 'query', query.query);
    return `/api/ingestion/otlp/metrics/console?${params.toString()}`;
  }

  params.set('pageIndex', '0');
  params.set('pageSize', '20');
  if (query.signal === 'logs') {
    setValue(params, 'search', query.query);
    setValue(params, 'traceId', query.traceId);
    return `/api/logs/list?${params.toString()}`;
  }

  setValue(params, 'operationName', query.query);
  setValue(params, 'traceId', query.traceId);
  if (query.errorOnly) params.set('errorOnly', 'true');
  return `/api/traces/list?${params.toString()}`;
}

export function buildCrossSignalPath(query: ExploreQuery, signal: ExploreSignal, context: { traceId?: string | undefined }) {
  return buildExplorePath({
    ...query,
    signal,
    traceId: context.traceId ?? query.traceId
  });
}

export function timeRangeMilliseconds(timeRange: ExploreTimeRange) {
  const minutes: Record<ExploreTimeRange, number> = {
    'last-15m': 15,
    'last-30m': 30,
    'last-1h': 60,
    'last-6h': 360,
    'last-24h': 1440
  };
  return minutes[timeRange] * 60_000;
}

function readSignal(value: string | null): ExploreSignal {
  return value === 'metrics' || value === 'logs' || value === 'traces' ? value : DEFAULT_EXPLORE_QUERY.signal;
}

function readTimeRange(value: string | null): ExploreTimeRange {
  return EXPLORE_TIME_RANGES.includes(value as ExploreTimeRange) ? value as ExploreTimeRange : DEFAULT_EXPLORE_QUERY.timeRange;
}

function readValue(value: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function setValue(params: URLSearchParams, key: string, value: string | undefined) {
  if (value) params.set(key, value);
}
