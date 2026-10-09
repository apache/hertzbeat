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

import { validLogExploreModes } from './explore-log-calculated-v2';
import { validLogNumericRange } from '@/shared/log-numeric-range';
import { validLogSort } from './explore-log-order';
import { isLogRecordUid, validExploreTimeZone } from './explore-field-contract';
import { parseTraceStructure } from './explore-trace-structure';
import type { LogSubqueryContext } from './explore-log-subquery';

// Domain query contract shared by URL state and transport adapters.
export type ExploreSignal = 'metrics' | 'logs' | 'traces';

export type { ExploreTimeRange } from './explore-time-range';
import type { ExploreTimeRange } from './explore-time-range';
export { timeRangeMilliseconds } from './explore-time-range';
export type MetricTemporalAggregation = 'raw' | 'rate' | 'increase' | 'delta';
export type MetricRollupControl = `rollup_${string}` | `nested_${string}`;
export type TraceSort = 'newest' | 'duration_desc';
export type TraceSpanScope = 'root' | 'entrypoint';

type SharedExploreQuery = {
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

export function validTraceStructureQuery(query: TraceExploreQuery): boolean {
  if (query.traceStructure === undefined) return query.traceStructureView === undefined;
  if (query.traceStructureView !== undefined && !['patterns', 'flow'].includes(query.traceStructureView)) return false;
  if (!parseTraceStructure(query.traceStructure)) return false;
  return (
    ![
      query.entityId,
      query.monitorId,
      query.intakeProfileId,
      query.collectorId,
      query.instance,
      query.endpoint,
      query.serviceName,
      query.serviceNamespace,
      query.environment,
      query.query,
      query.traceId,
      query.spanId,
      query.resourceFilter,
      query.attributeFilter,
      query.spanScope,
      query.minDurationMs,
      query.maxDurationMs,
      query.traceView,
      query.errorOnly,
      query.hideInternal,
      query.endExclusive
    ].some(value => value !== undefined && value !== false) &&
    (query.sort === undefined || query.sort === 'newest')
  );
}

const TRACE_ID_PATTERN = /^[0-9a-f]{32}$/u;

export type ExploreQueryPatch = LogSubqueryContext & {
  logReferenceJoin?: string | undefined;
  savedView?: string | undefined;
  returnTo?: string | undefined;
  servicesReturnTo?: string | undefined;
  dashboardReturnTo?: string | undefined;
  signal?: ExploreSignal | undefined;
  timeRange?: ExploreTimeRange | undefined;
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
  traceId?: string | undefined;
  logSort?: string | undefined;
  logRecordUid?: string | undefined;
  logView?: string | undefined;
  logAnalysis?: string | undefined;
  logAggregation?: string | undefined;
  logTransactions?: string | undefined;
  logCalculated?: string | undefined;
  logCalculatedV2?: string | undefined;
  traceReturnTo?: string | undefined;
  traceView?: string | undefined;
  traceStructure?: string | undefined;
  traceStructureView?: 'patterns' | 'flow' | undefined;
  endExclusive?: boolean | undefined;
  errorOnly?: boolean | undefined;
  sort?: string | undefined;
  live?: boolean | undefined;
  logGroupSelection?: string | undefined;
  logNumericRange?: string | undefined;
  searchSyntax?: string | undefined;
  severityText?: string | undefined;
  // Preserve untrusted route text so invalid categories fail validation instead of broadening the query.
  severityCategory?: string | undefined;
  spanId?: string | undefined;
  resourceFilter?: string | undefined;
  attributeFilter?: string | undefined;
  operationName?: string | undefined;
  metricPlan?: string | undefined;
  metricView?: string | undefined;
  metricFilter?: string | undefined;
  groupBy?: string | undefined;
  aggregation?: string | undefined;
  temporalAggregation?: MetricTemporalAggregation | MetricRollupControl | undefined;
  step?: string | undefined;
  minDurationMs?: number | undefined;
  maxDurationMs?: number | undefined;
  spanScope?: TraceSpanScope | undefined;
  hideInternal?: boolean | undefined;
  hideNoise?: boolean | undefined;
  pageIndex?: number | undefined;
};

export function exploreHandoffState(query: ExploreQuery): 'none' | 'scoped' | 'invalid' {
  if (query.signal === 'traces' && !validTraceStructureQuery(query)) return 'invalid';
  if (query.signal === 'logs') {
    if (!validLogExploreModes(query) || !validLogNumericRange(query.logNumericRange)) return 'invalid';
    if (!validLogSort(query.logSort, query.sort) || (query.sort != null && !['newest', 'oldest'].includes(query.sort)))
      return 'invalid';
  }
  const focused = focusedInvestigationHandoffState(query) ?? entityInvestigationHandoffState(query);
  if (focused) return focused;
  const entityOrMonitor = entityOrMonitorHandoffState(query);
  return entityOrMonitor ?? onboardingHandoffState(query);
}

function entityOrMonitorHandoffState(query: ExploreQuery): 'scoped' | 'invalid' | undefined {
  if ([query.entityId, query.monitorId].some(isPresent)) {
    if (query.windowMode === 'preset') {
      return [query.entityId, query.monitorId, query.serviceName].every(isPresent) && validEntityPreset(query)
        ? 'scoped'
        : 'invalid';
    }
    return [query.entityId, query.monitorId, query.serviceName, query.timeZone].every(isPresent) &&
      validExactWindow(query.start, query.end)
      ? 'scoped'
      : 'invalid';
  }
  return undefined;
}

function onboardingHandoffState(query: ExploreQuery): 'none' | 'scoped' | 'invalid' {
  // Ordinary Explore filters can include a namespace. Only onboarding-owned identity/window markers activate
  // the stricter handoff contract.
  if (![query.intakeProfileId, query.collectorId, query.windowMode].some(isPresent)) {
    return 'none';
  }
  if (
    ![query.serviceName, query.serviceNamespace, query.environment].every(isPresent) ||
    ![query.intakeProfileId, query.collectorId].some(isPresent)
  )
    return 'invalid';
  if (query.windowMode === 'preset') {
    return !isPresent(query.start) && !isPresent(query.end) ? 'scoped' : 'invalid';
  }
  return validExactWindow(query.start, query.end) ? 'scoped' : 'invalid';
}

function focusedInvestigationHandoffState(query: ExploreQuery): 'scoped' | 'invalid' | undefined {
  const selectedLog = query.signal === 'logs' && query.logRecordUid != null;
  const selectedTrace = query.signal === 'traces' && query.traceId != null;
  const hasTimeEvidence = query.start != null || query.end != null || query.timeZone != null;
  if (!selectedLog && !(selectedTrace && hasTimeEvidence)) return undefined;
  if (query.signal === 'logs' && query.live) return 'invalid';
  return validFocusedIdentity(query) && validFocusedWindow(query) ? 'scoped' : 'invalid';
}

function validFocusedIdentity(query: ExploreQuery) {
  return query.signal === 'logs'
    ? isLogRecordUid(query.logRecordUid) &&
        (query.traceId == null || validTraceId(query.traceId)) &&
        validOptionalSpanId(query.spanId)
    : query.signal === 'traces' && validTraceId(query.traceId) && validOptionalSpanId(query.spanId);
}

function validOptionalSpanId(value: string | undefined) {
  return value == null || (typeof value === 'string' && /^[0-9a-f]{16}$/u.test(value));
}

function validTraceId(value: string | undefined) {
  return typeof value === 'string' && TRACE_ID_PATTERN.test(value);
}

function validFocusedWindow(query: ExploreQuery) {
  return (
    validExactWindow(query.start, query.end) &&
    query.end! - query.start! <= 24 * 60 * 60_000 &&
    validExploreTimeZone(query.timeZone)
  );
}

function entityInvestigationHandoffState(query: ExploreQuery): 'scoped' | 'invalid' | undefined {
  if (!isPresent(query.entityId) || isPresent(query.monitorId)) return undefined;
  if (query.windowMode === 'preset') return validEntityPreset(query) ? 'scoped' : 'invalid';
  if (!isPresent(query.timeZone)) return undefined;
  return validExactWindow(query.start, query.end) ? 'scoped' : 'invalid';
}

function validEntityPreset(query: ExploreQuery) {
  if (isPresent(query.start) || isPresent(query.end)) return false;
  const hasIntake = [query.intakeProfileId, query.collectorId].some(isPresent);
  return !hasIntake || onboardingHandoffState(query) === 'scoped';
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
  return (
    start != null && end != null && Number.isSafeInteger(start) && Number.isSafeInteger(end) && start > 0 && start < end
  );
}

export const LOG_SEVERITY_CATEGORIES = ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'] as const;
