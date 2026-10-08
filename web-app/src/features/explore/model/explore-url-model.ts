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
  logQueryFields,
  parseAliasedContext,
  readSignal,
  readPositiveInteger,
  readValue,
  readOpaqueRouteValue,
  parseUrlTime,
  readLiveMode,
  aliasedValue,
  setValue
} from './explore-url-values';
import { appendSignalParams } from './explore-url-append';
import { migrateVisibleLegacyLogFilters } from './explore-log-search-migration';
import { canonicalServicesReturnPath } from '@/shared/navigation/services-path';
import { applicationRoutePaths } from '@/shared/navigation/app-paths';
import { normalizeSavedQueryKey } from '@/shared/navigation/signal-route-paths';
import { canonicalSignalDashboardPath } from '@/shared/navigation/signal-dashboard-paths';
import { normalizeInvestigationTimeZone, writeQueryContext } from '@/shared/query-context';

import { parseExploreFilterParams, parseExploreAutoRefresh } from './explore-field-contract';
import { canonicalExploreReturnPath, isAnalysisReturnPath } from './explore-return-path';
import {
  metricQueryFields,
  enabledFilterValue,
  temporalAggregationValue,
  traceSortValue,
  traceSpanScopeValue
} from './explore-parity-filter-model';
import type { ExploreQuery, ExploreQueryPatch, ExploreSignal, ExploreTimeRange } from './explore-query';
import { encodeLogAnalysis, parseLogAnalysis } from '@/platform/perses';

export const EXPLORE_TIME_RANGES: ExploreTimeRange[] = ['last-15m', 'last-30m', 'last-1h', 'last-6h', 'last-24h'];

export function parseExploreQuery(params: URLSearchParams): ExploreQuery {
  const context = parseAliasedContext(params);
  const time = parseUrlTime(params);
  return normalizeExploreQuery({
    savedView: normalizeSavedQueryKey(params.get('savedView')),
    returnTo: normalizeExploreReturnTo(params.get('returnTo')),
    servicesReturnTo: canonicalServicesReturnPath(params.get('servicesReturnTo')),
    dashboardReturnTo: canonicalSignalDashboardPath(params.get('dashboardReturnTo')),
    signal: readSignal(params.get('signal')),
    timeRange: readTimeRange(aliasedValue(params, 'timeRange', 'range')),
    ...context,
    query: readValue(params.get('query')),
    windowMode: params.get('windowMode') === 'preset' ? 'preset' : undefined,
    traceId: readValue(params.get('traceId')),
    sort: params.has('sort')
      ? readSignal(params.get('signal')) === 'logs'
        ? params.get('sort')!
        : traceSortValue(params.get('sort'))
      : undefined,
    errorOnly: params.get('errorOnly') === 'true' ? true : undefined,
    hideInternal: enabledFilterValue(params.get('hideInternal')),
    hideNoise: enabledFilterValue(params.get('hideNoise')),
    autoRefreshMs: parseExploreAutoRefresh(params.get('autoRefresh')),
    start: time.start,
    end: time.end,
    timeZone: readValue(params.get('timeZone')),
    live: readLiveMode(params),
    logRecordUid: readOpaqueRouteValue(params, 'logRecordUid'),
    logSort: params.get('logSort') ?? undefined,
    logView: readValue(params.get('logView')),
    logAnalysis: readOpaqueRouteValue(params, 'logAnalysis'),
    logAggregation: readOpaqueRouteValue(params, 'logAggregation'),
    logTransactions: readOpaqueRouteValue(params, 'logTransactions'),
    logCalculated: readOpaqueRouteValue(params, 'logCalculated'),
    logCalculatedV2: readOpaqueRouteValue(params, 'logCalculatedV2'),
    ...readLogJoinParams(params),
    logGroupSelection: params.get('logGroupSelection') ?? undefined,
    logNumericRange: params.get('logNumericRange') ?? undefined,
    traceReturnTo: readValue(params.get('traceReturnTo')),
    traceView: readValue(params.get('traceView')),
    traceStructure: readOpaqueRouteValue(params, 'traceStructure'),
    traceStructureView: (params.get('traceStructureView') ?? undefined) as 'patterns' | 'flow' | undefined,
    endExclusive: params.get('endExclusive') === 'true' ? true : undefined,
    searchSyntax: readValue(params.get('searchSyntax')),
    severityText: readValue(params.get('severityText')),
    severityCategory: readValue(params.get('severityCategory')),
    spanId: readValue(params.get('spanId')),
    resourceFilter: readValue(params.get('resourceFilter')),
    attributeFilter: readValue(params.get('attributeFilter')),
    operationName: readValue(params.get('operationName')),
    metricPlan: readValue(params.get('metricPlan')),
    metricView: readValue(params.get('metricView')),
    metricFilter: readValue(params.get('metricFilter')),
    groupBy: readValue(params.get('groupBy')),
    temporalAggregation: temporalAggregationValue(params.get('temporalAggregation')),
    spanScope: traceSpanScopeValue(params.get('spanScope')),
    ...parseExploreFilterParams(params),
    pageIndex: readPositiveInteger(params.get('page'))
  });
}

function readLogJoinParams(params: URLSearchParams) {
  return {
    logSubquery: readOpaqueRouteValue(params, 'logSubquery'),
    logReferenceJoin: readOpaqueRouteValue(params, 'logReferenceJoin')
  };
}

export function buildExplorePath(query: ExploreQuery) {
  const normalized = normalizeExploreQuery(query);
  const params = new URLSearchParams({ signal: normalized.signal, timeRange: normalized.timeRange });
  setValue(params, 'savedView', normalized.savedView);
  setValue(params, 'query', normalized.query);
  appendSignalParams(params, normalized);
  if (normalized.windowMode === 'preset') params.set('windowMode', 'preset');
  if (normalized.autoRefreshMs) params.set('autoRefresh', String(normalized.autoRefreshMs));
  if (normalized.start) params.set('start', String(normalized.start));
  if (normalized.end) params.set('end', String(normalized.end));
  if (normalized.timeZone) params.set('timeZone', normalized.timeZone);
  setValue(params, 'returnTo', normalized.returnTo);
  setValue(params, 'servicesReturnTo', normalized.servicesReturnTo);
  setValue(params, 'dashboardReturnTo', normalized.dashboardReturnTo);
  return `${applicationRoutePaths.explore}?${writeQueryContext(params, normalized).toString()}`;
}

export function normalizeExploreQuery(
  query: ExploreQueryPatch & { signal: ExploreSignal; timeRange: ExploreTimeRange }
): ExploreQuery {
  const shared = {
    timeRange: query.timeRange,
    entityId: query.entityId,
    monitorId: query.monitorId,
    intakeProfileId: query.intakeProfileId,
    serviceName: query.serviceName,
    serviceNamespace: query.serviceNamespace,
    environment: query.environment,
    collectorId: query.collectorId,
    instance: query.instance,
    endpoint: query.endpoint,
    query: query.query,
    windowMode: query.windowMode,
    ...normalizeExploreTimeEvidence(query)
  };
  if (query.signal === 'metrics')
    return {
      ...shared,
      signal: 'metrics',
      ...metricQueryFields(query)
    };
  const traceContext = {
    ...shared,
    returnTo: focusedReturnTo(query),
    traceId: query.traceId,
    spanId: query.spanId,
    hideInternal: enabledFilterValue(query.hideInternal),
    resourceFilter: query.resourceFilter,
    attributeFilter: query.attributeFilter,
    pageIndex: query.pageIndex
  };
  if (query.signal === 'logs')
    return {
      ...traceContext,
      signal: 'logs',
      ...logQueryFields({
        ...query,
        logAnalysis: normalizeLegacyLogRepresentation(query.logAnalysis),
        live: historyOnlyLogQuery(query) ? undefined : query.live
      }),
      ...migrateVisibleLegacyLogFilters(query)
    };
  return {
    ...traceContext,
    signal: 'traces',
    traceView: query.traceView,
    traceStructure: query.traceStructure,
    traceStructureView: query.traceStructureView,
    endExclusive: query.endExclusive,
    errorOnly: query.errorOnly,
    sort: query.sort == null ? undefined : traceSortValue(query.sort),
    spanScope: traceSpanScopeValue(query.spanScope),
    minDurationMs: query.minDurationMs,
    maxDurationMs: query.maxDurationMs
  };
}

function historyOnlyLogAnalysis(raw: string | undefined) {
  if (!raw) return false;
  try {
    const analysis = parseLogAnalysis(raw);
    return Boolean(analysis.comparison || analysis.querySet);
  } catch {
    return false;
  }
}

function historyOnlyLogQuery(query: ExploreQueryPatch) {
  return (
    historyOnlyLogAnalysis(query.logAnalysis) ||
    query.logCalculatedV2 !== undefined ||
    query.logSubquery !== undefined ||
    query.logReferenceJoin !== undefined
  );
}

function normalizeLegacyLogRepresentation(raw: string | undefined) {
  if (!raw) return raw;
  try {
    const state = parseLogAnalysis(raw);
    if (state.representation !== 'table' && state.representation !== 'toplist') return raw;
    // Extra table measures cannot be represented by either remaining view.
    if (state.additionalMeasures?.length) return raw;
    const compatible = { ...state, representation: state.comparison ? ('timeseries' as const) : ('logs' as const) };
    return encodeLogAnalysis(compatible);
  } catch {
    return raw;
  }
}

export function normalizeExploreReturnTo(value: string | null | undefined): string | undefined {
  return canonicalExploreReturnPath(value, params => buildExplorePath(parseExploreQuery(params)));
}

function focusedReturnTo(query: ExploreQueryPatch) {
  const identity = query.signal === 'traces' ? query.traceId : query.logRecordUid;
  const path = normalizeExploreReturnTo(query.returnTo);
  return identity || (query.signal === 'logs' && isAnalysisReturnPath(path)) ? path : undefined;
}

function normalizeExploreTimeEvidence(query: ExploreQueryPatch) {
  const exactWindow = hasNormalizedExactWindow(query);
  const focusedEvidence = query.traceId != null || query.logRecordUid != null;
  const retainWindow = shouldRetainTimeEvidence(query, exactWindow, focusedEvidence);
  return {
    savedView: normalizeSavedQueryKey(query.savedView),
    servicesReturnTo: canonicalServicesReturnPath(query.servicesReturnTo),
    dashboardReturnTo: canonicalSignalDashboardPath(query.dashboardReturnTo),
    autoRefreshMs: exactWindow ? undefined : query.autoRefreshMs,
    start: retainWindow ? query.start : undefined,
    end: retainWindow ? query.end : undefined,
    timeZone: normalizedRouteTimeZone(query, exactWindow, focusedEvidence)
  };
}

function hasNormalizedExactWindow(query: ExploreQueryPatch) {
  return (
    Number.isSafeInteger(query.start) &&
    Number.isSafeInteger(query.end) &&
    query.start! > 0 &&
    query.start! < query.end!
  );
}

function shouldRetainTimeEvidence(query: ExploreQueryPatch, exactWindow: boolean, focusedEvidence: boolean) {
  const hasPartialTime = query.start != null || query.end != null || query.timeZone != null;
  const invalidFocusedEvidence = focusedEvidence && hasPartialTime && !exactWindow;
  // A preset with residual timestamps is invalid handoff evidence. Preserve it so URL repair cannot widen scope.
  const invalidPresetEvidence = query.windowMode === 'preset' && (query.start != null || query.end != null);
  return exactWindow || invalidPresetEvidence || invalidFocusedEvidence;
}

function normalizedRouteTimeZone(query: ExploreQueryPatch, exactWindow: boolean, focusedEvidence: boolean) {
  if (focusedEvidence && query.timeZone != null) return readValue(query.timeZone);
  return exactWindow ? normalizeInvestigationTimeZone(query.timeZone) : undefined;
}

function readTimeRange(value: string | null): ExploreTimeRange {
  return EXPLORE_TIME_RANGES.includes(value as ExploreTimeRange) ? (value as ExploreTimeRange) : 'last-30m';
}
