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

import type { LogSubqueryContext } from './explore-log-subquery';

// Domain query contract shared by URL state and transport adapters.
export type ExploreSignal = 'metrics' | 'logs' | 'traces';

export type { ExploreTimeRange } from './explore-time-range';
import type { ExploreTimeRange } from './explore-time-range';
export type MetricTemporalAggregation = 'raw' | 'rate' | 'increase' | 'delta';
export type MetricRollupControl = `rollup_${string}` | `nested_${string}`;
export type TraceSort = 'newest' | 'duration_desc';
export type TraceSpanScope = 'root' | 'entrypoint';

type SharedExploreQuery = {
  source?: string | undefined;
  savedView?: string | undefined;
  returnTo?: string | undefined;
  servicesReturnTo?: string | undefined;
  dashboardReturnTo?: string | undefined;
  timeRange: ExploreTimeRange;
  entityId?: string | undefined;
  monitorId?: string | undefined;
  serviceName?: string | undefined;
  serviceNamespace?: string | undefined;
  environment?: string | undefined;
  intakeProfileId?: string | undefined;
  collectorId?: string | undefined;
  instance?: string | undefined;
  endpoint?: string | undefined;
  query?: string | undefined;
  windowMode?: 'preset' | undefined;
  autoRefreshMs?: number | undefined;
  start?: number | undefined;
  end?: number | undefined;
  timeZone?: string | undefined;
};

export type MetricExploreQuery = SharedExploreQuery & {
  signal: 'metrics';
  operationName?: string | undefined;
  metricPlan?: string | undefined;
  metricView?: string | undefined;
  metricFilter?: string | undefined;
  groupBy?: string | undefined;
  aggregation?: string | undefined;
  temporalAggregation?: MetricTemporalAggregation | MetricRollupControl | undefined;
  step?: string | undefined;
};

export type LogExploreQuery = SharedExploreQuery &
  LogSubqueryContext & {
    signal: 'logs';
    /** Retired route field is kept only to reject old links without broadening the query. */
    logReferenceJoin?: string | undefined;
    // Keep invalid route sort text until validation rejects it.
    sort?: string | undefined;
    logSort?: string | undefined;
    logRecordUid?: string | undefined;
    logView?: string | undefined;
    logAnalysis?: string | undefined;
    logAggregation?: string | undefined;
    logTransactions?: string | undefined;
    logCalculated?: string | undefined;
    logCalculatedV2?: string | undefined;
    traceReturnTo?: string | undefined;
    live?: boolean | undefined;
    logGroupSelection?: string | undefined;
    logNumericRange?: string | undefined;
    searchSyntax?: string | undefined;
    severityText?: string | undefined;
    // Preserve untrusted route text so invalid categories fail validation instead of broadening the query.
    severityCategory?: string | undefined;
    traceId?: string | undefined;
    spanId?: string | undefined;
    resourceFilter?: string | undefined;
    attributeFilter?: string | undefined;
    hideInternal?: boolean | undefined;
    hideNoise?: boolean | undefined;
    pageIndex?: number | undefined;
  };

export type TraceExploreQuery = SharedExploreQuery & {
  signal: 'traces';
  traceView?: string | undefined;
  traceStructure?: string | undefined;
  traceStructureView?: 'patterns' | 'flow' | undefined;
  endExclusive?: boolean | undefined;
  traceId?: string | undefined;
  spanId?: string | undefined;
  errorOnly?: boolean | undefined;
  sort?: TraceSort | undefined;
  resourceFilter?: string | undefined;
  attributeFilter?: string | undefined;
  spanScope?: TraceSpanScope | undefined;
  hideInternal?: boolean | undefined;
  minDurationMs?: number | undefined;
  maxDurationMs?: number | undefined;
  pageIndex?: number | undefined;
};

export type ExploreQuery = MetricExploreQuery | LogExploreQuery | TraceExploreQuery;
