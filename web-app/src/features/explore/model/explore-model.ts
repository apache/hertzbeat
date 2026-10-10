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
  exploreHandoffState,
  exploreUsesExactWindow,
  type ExploreQuery,
  type ExploreQueryPatch,
  type ExploreSignal,
  type ExploreTimeRange,
  type LogExploreQuery
} from './explore-query';

import { normalizeInvestigationTimeZone, type ExactTimeWindow, type QueryContext } from '@/shared/query-context';
import { applicationRoutePaths } from '@/shared/navigation/app-paths';
import { buildExplorePath, normalizeExploreQuery, parseExploreQuery } from './explore-url-model';
import { mergeExploreContextChanges } from './explore-context-model';
import { sourceSelectionChanges } from './explore-source';

export { exploreQueryContext, mergeExploreContextChanges } from './explore-context-model';
export {
  exploreHandoffState,
  exploreUsesExactWindow,
  timeRangeMilliseconds,
  type ExploreQuery,
  type ExploreQueryPatch,
  type ExploreSignal,
  type ExploreTimeRange,
  type LogExploreQuery,
  type TraceExploreQuery
} from './explore-query';

export { buildExplorePath, parseExploreQuery, normalizeExploreReturnTo } from './explore-url-model';
export { EXPLORE_TIME_RANGES } from './explore-url-model';

/**
 * Transient evidence must be discarded whenever any route-owned query input
 * changes, otherwise a drawer can display data from the previous scope.
 */
export function exploreEvidenceScopeKey(query: ExploreQuery) {
  if (query.signal === 'metrics') return buildExplorePath({ ...query, metricView: undefined });
  return buildExplorePath(
    query.signal === 'logs'
      ? {
          ...query,
          logView: undefined,
          logAnalysis: undefined,
          ...(query.live ? { sort: undefined, logSort: undefined } : {})
        }
      : query.signal === 'traces'
        ? { ...query, traceView: undefined, traceStructureView: undefined }
        : query
  );
}

export function mergeExploreQuery(query: ExploreQuery, changes: ExploreQueryPatch): ExploreQuery {
  const sourceChanged =
    Object.hasOwn(changes, 'source') && (changes.source ?? 'external') !== (query.source ?? 'external');
  const cleaned = dependentFilterCleanup(query, sourceChanged ? sourceSelectionChanges(changes) : changes);
  return normalizeExploreQuery({
    ...query,
    ...cleaned,
    signal: cleaned.signal ?? query.signal,
    timeRange: cleaned.timeRange ?? query.timeRange
  });
}

export function retireInstrumentationHandoff(query: ExploreQuery): ExploreQuery {
  if (query.intakeProfileId == null && query.collectorId == null && query.windowMode == null) return query;
  return mergeExploreQuery(query, {
    intakeProfileId: undefined,
    collectorId: undefined,
    windowMode: undefined
  });
}

export function mergeManualExploreQuery(
  query: ExploreQuery,
  context: QueryContext,
  changes: ExploreQueryPatch
): ExploreQuery {
  const retireRequested = handoffMarkerFields.some(field => Object.hasOwn(changes, field));
  const ordinaryChanges = { ...changes };
  for (const field of handoffMarkerFields) delete ordinaryChanges[field];
  const next = mergeExploreQuery(query, mergeExploreContextChanges(context, ordinaryChanges));
  return !retireRequested && exploreHandoffState(query) === 'scoped' && exploreHandoffState(next) === 'scoped'
    ? next
    : retireInstrumentationHandoff(next);
}

export function buildCrossSignalPath(
  query: ExploreQuery,
  signal: ExploreSignal,
  context: { traceId?: string | undefined; spanId?: string | undefined }
) {
  return buildExplorePath(
    mergeExploreQuery(query, {
      ...signalSelectionPatch(signal),
      traceId: context.traceId,
      spanId: context.spanId
    })
  );
}

/** Build a sidebar destination from the applied URL, keeping exact time and investigation context. */
export function buildExploreSignalNavigationPath(search: string, signal: ExploreSignal) {
  const query = parseExploreQuery(new URLSearchParams(search));
  if (query.signal === signal) return `${applicationRoutePaths.explore}${search}`;
  return buildExplorePath(mergeExploreQuery(query, signalSelectionPatch(signal)));
}

/**
 * Keep investigation scope when changing signals, but drop the free-text
 * expression because it means a metric name, log search, or operation name
 * depending on the selected signal.
 */
export function signalSelectionPatch(signal: ExploreSignal): ExploreQueryPatch {
  return {
    savedView: undefined,
    returnTo: undefined,
    traceReturnTo: undefined,
    signal,
    query: undefined,
    operationName: undefined,
    live: undefined,
    pageIndex: undefined,
    traceId: undefined,
    spanId: undefined,
    logRecordUid: undefined,
    searchSyntax: undefined,
    severityText: undefined,
    severityCategory: undefined,
    errorOnly: undefined,
    traceStructure: undefined,
    traceStructureView: undefined,
    sort: undefined,
    spanScope: undefined,
    hideInternal: undefined,
    hideNoise: undefined,
    minDurationMs: undefined,
    maxDurationMs: undefined,
    metricFilter: undefined,
    groupBy: undefined,
    aggregation: undefined,
    temporalAggregation: undefined,
    step: undefined
  };
}

export function querySubmissionTimePatch(query: ExploreQuery, routeWindow?: ExactTimeWindow): ExploreQueryPatch {
  if (exploreUsesExactWindow(query)) return {};
  return routeWindow
    ? { start: routeWindow.from, end: routeWindow.to, windowMode: undefined }
    : { start: undefined, end: undefined };
}

export function presetTimeRangePatch(query: ExploreQuery, timeRange: ExploreTimeRange): ExploreQueryPatch {
  return {
    timeRange,
    pageIndex: undefined,
    windowMode: exploreHandoffState(query) === 'scoped' ? 'preset' : undefined,
    start: undefined,
    end: undefined
  };
}

export function exactTimeRangePatch(window: ExactTimeWindow, timeZone: string): ExploreQueryPatch | undefined {
  const zone = normalizeInvestigationTimeZone(timeZone);
  if (
    !zone ||
    ![window.from, window.to].every(isPositiveSafeInteger) ||
    window.from >= window.to ||
    window.to - window.from > 24 * 60 * 60_000
  )
    return undefined;
  return {
    start: window.from,
    end: window.to,
    timeZone: zone,
    windowMode: undefined,
    autoRefreshMs: undefined,
    pageIndex: undefined
  };
}

export function logTrendZoomPatch(
  query: LogExploreQuery,
  evidenceWindow: ExactTimeWindow,
  requestedWindow: ExactTimeWindow
): ExploreQueryPatch | undefined {
  if (!validTrendZoomWindow(evidenceWindow, requestedWindow)) return undefined;
  return {
    start: requestedWindow.from,
    end: requestedWindow.to,
    windowMode: undefined,
    pageIndex: undefined,
    logRecordUid: undefined,
    // In historical Logs these identities are active filters, so an exact zoom must preserve them explicitly.
    traceId: query.traceId,
    spanId: query.spanId
  };
}

export function metricTrendZoomPatch(
  evidenceWindow: ExactTimeWindow,
  requestedWindow: ExactTimeWindow
): ExploreQueryPatch | undefined {
  if (!validTrendZoomWindow(evidenceWindow, requestedWindow)) return undefined;
  return {
    start: requestedWindow.from,
    end: requestedWindow.to,
    windowMode: undefined,
    autoRefreshMs: undefined,
    pageIndex: undefined
  };
}

function validTrendZoomWindow(evidence: ExactTimeWindow, requested: ExactTimeWindow) {
  if (![evidence.from, evidence.to, requested.from, requested.to].every(isPositiveSafeInteger)) return false;
  if (evidence.from >= evidence.to || requested.from >= requested.to) return false;
  if (requested.from < evidence.from || requested.to > evidence.to) return false;
  if (requested.to - requested.from > 24 * 60 * 60_000) return false;
  return requested.from !== evidence.from || requested.to !== evidence.to;
}

function isPositiveSafeInteger(value: number) {
  return Number.isSafeInteger(value) && value > 0;
}

function dependentFilterCleanup(query: ExploreQuery, changes: ExploreQueryPatch) {
  const currentTraceId = 'traceId' in query ? query.traceId : undefined;
  const currentLogRecordUid = query.signal === 'logs' ? query.logRecordUid : undefined;
  if (query.signal === 'traces' && Object.hasOwn(changes, 'sort') && changes.sort !== query.sort) {
    changes = { ...changes, pageIndex: undefined };
  }
  const traceChanged = Object.hasOwn(changes, 'traceId') && changes.traceId !== currentTraceId;
  const selectedLogChanged = Object.hasOwn(changes, 'logRecordUid') && changes.logRecordUid !== currentLogRecordUid;
  const timeChanged = (['timeRange', 'start', 'end'] as const).some(
    field => Object.hasOwn(changes, field) && changes[field] !== query[field]
  );
  if (!traceChanged && !selectedLogChanged && !timeChanged) return changes;
  return { ...changes, ...selectionCleanup(changes, timeChanged) };
}

function selectionCleanup(changes: ExploreQueryPatch, timeChanged: boolean): ExploreQueryPatch {
  return {
    traceId: timeChanged && !Object.hasOwn(changes, 'traceId') ? undefined : changes.traceId,
    spanId: Object.hasOwn(changes, 'spanId') ? changes.spanId : undefined,
    logRecordUid: timeChanged && !Object.hasOwn(changes, 'logRecordUid') ? undefined : changes.logRecordUid,
    pageIndex: Object.hasOwn(changes, 'pageIndex') ? changes.pageIndex : undefined
  };
}

const handoffMarkerFields = ['intakeProfileId', 'collectorId', 'windowMode'] as const;
