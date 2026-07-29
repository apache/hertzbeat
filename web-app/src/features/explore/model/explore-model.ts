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
  type ExploreTimeRange
} from './explore-query';

import type { ExactTimeWindow } from '@/shared/query-context';
import { buildExplorePath, normalizeExploreQuery, parseExploreQuery } from './explore-url-model';

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

export { buildExplorePath, parseExploreQuery } from './explore-url-model';
export { EXPLORE_TIME_RANGES } from './explore-url-model';

/**
 * Transient evidence must be discarded whenever any route-owned query input
 * changes, otherwise a drawer can display data from the previous scope.
 */
export function exploreEvidenceScopeKey(query: ExploreQuery) {
  return buildExplorePath(query);
}

export function mergeExploreQuery(query: ExploreQuery, changes: ExploreQueryPatch): ExploreQuery {
  const cleaned = dependentFilterCleanup(query, changes);
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

export function buildCrossSignalPath(
  query: ExploreQuery,
  signal: ExploreSignal,
  context: { traceId?: string | undefined }
) {
  return buildExplorePath(
    mergeExploreQuery(query, {
      ...signalSelectionPatch(signal),
      traceId: context.traceId
    })
  );
}

/**
 * Keep investigation scope when changing signals, but drop the free-text
 * expression because it means a metric name, log search, or operation name
 * depending on the selected signal.
 */
export function signalSelectionPatch(signal: ExploreSignal): ExploreQueryPatch {
  return {
    signal,
    query: undefined,
    operationName: undefined,
    live: undefined,
    pageIndex: undefined,
    traceId: undefined,
    spanId: undefined,
    severityText: undefined,
    resourceFilter: undefined,
    attributeFilter: undefined,
    errorOnly: undefined,
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
    windowMode: exploreHandoffState(query) === 'scoped' ? 'preset' : undefined,
    start: undefined,
    end: undefined
  };
}

function dependentFilterCleanup(query: ExploreQuery, changes: ExploreQueryPatch) {
  const currentTraceId = 'traceId' in query ? query.traceId : undefined;
  const traceChanged = Object.hasOwn(changes, 'traceId') && changes.traceId !== currentTraceId;
  const timeChanged = (['timeRange', 'start', 'end'] as const).some(
    field => Object.hasOwn(changes, field) && changes[field] !== query[field]
  );
  if (!traceChanged && !timeChanged) return changes;
  return {
    ...changes,
    traceId: timeChanged && !Object.hasOwn(changes, 'traceId') ? undefined : changes.traceId,
    spanId: Object.hasOwn(changes, 'spanId') ? changes.spanId : undefined,
    pageIndex: Object.hasOwn(changes, 'pageIndex') ? changes.pageIndex : undefined
  };
}
