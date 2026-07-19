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

// Domain query contract shared by URL state and transport adapters.
export type ExploreSignal = 'metrics' | 'logs' | 'traces';

export type ExploreTimeRange = 'last-15m' | 'last-30m' | 'last-1h' | 'last-6h' | 'last-24h';

type SharedExploreQuery = {
  timeRange: ExploreTimeRange;
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
};

export type MetricExploreQuery = SharedExploreQuery & {
  signal: 'metrics';
  metricFilter?: string | undefined;
  groupBy?: string | undefined;
  aggregation?: string | undefined;
  step?: string | undefined;
};

export type LogExploreQuery = SharedExploreQuery & {
  signal: 'logs';
  live?: boolean | undefined;
  severityText?: string | undefined;
  traceId?: string | undefined;
  spanId?: string | undefined;
  resourceFilter?: string | undefined;
  attributeFilter?: string | undefined;
  pageIndex?: number | undefined;
};

export type TraceExploreQuery = SharedExploreQuery & {
  signal: 'traces';
  traceId?: string | undefined;
  errorOnly?: boolean | undefined;
  resourceFilter?: string | undefined;
  minDurationMs?: number | undefined;
  maxDurationMs?: number | undefined;
  pageIndex?: number | undefined;
};

export type ExploreQuery = MetricExploreQuery | LogExploreQuery | TraceExploreQuery;

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

export function exploreHandoffState(query: ExploreQuery): 'none' | 'scoped' | 'invalid' {
  if (![query.serviceNamespace, query.collectorId, query.windowMode].some(isPresent)) {
    return 'none';
  }
  if (![query.serviceName, query.serviceNamespace, query.environment, query.collectorId].every(isPresent))
    return 'invalid';
  if (query.windowMode === 'preset') {
    return !isPresent(query.start) && !isPresent(query.end) ? 'scoped' : 'invalid';
  }
  return validExactWindow(query.start, query.end) ? 'scoped' : 'invalid';
}

export function exploreUsesExactWindow(query: ExploreQuery) {
  return (
    exploreHandoffState(query) !== 'invalid' &&
    query.windowMode !== 'preset' &&
    validExactWindow(query.start, query.end)
  );
}

function isPresent(value: unknown) {
  return value != null;
}

function validExactWindow(start: number | undefined, end: number | undefined) {
  return start != null && end != null && start < end;
}
