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

import { logSyntaxDiagnostic } from '../api/explore-log-syntax-diagnostic';
import { logFilterFailureReason } from '../api/explore-signal-api-model';

import { useMemo } from 'react';
import { useExploreSignalSources } from './use-explore-transaction-source';
import { useLocation, useNavigate } from 'react-router-dom';
import { isSavedViewReference } from '../model/explore-saved-query-model';

import { useQueryContextOptional } from '@/shared/query-context';
import { useSharedTimeOptional } from '@/shared/time';

import { classifyExploreSignalError } from '../api/explore-api';
import { useExploreSubmission } from './use-explore-submission';
import {
  buildExplorePath,
  exploreHandoffState,
  mergeExploreContextChanges,
  mergeManualExploreQuery,
  exploreQueryContext,
  mergeExploreQuery,
  querySubmissionTimePatch,
  timeRangeMilliseconds,
  type ExploreQuery,
  type ExploreQueryPatch
} from '../model/explore-model';
import type {
  ExploreCurrentResultState,
  ExploreFailureKind,
  ExplorePageResultState,
  HistoricalEvidence
} from '../model/explore-result-model';
import { metricResultState } from '../model/explore-signal-model';
import { isMetricConsole } from '../model/explore-signal-contract';
import { exploreInvestigationRoute } from '../model/explore-investigation-model';
import { useExploreLocationQuery } from './use-canonical-explore-location';
import { useExploreRouteTime } from './use-explore-route-time';
import { useExploreRefresh } from './use-explore-refresh';
import { traceBackgroundQuery } from '../model/explore-detail-workspace-model';
import { useTracePageCorrection } from './use-trace-page-correction';
import { useTraceReturnFocus } from './use-trace-return-focus';
import { updateExploreSearch } from './update-explore-search';

export function useExplorePageController() {
  const navigate = useNavigate();
  const location = useLocation();
  const openPath = useTraceReturnFocus(location.pathname + location.search, path => void navigate(path));
  const { query: parsedQuery, setSearchParams } = useExploreLocationQuery();
  const sharedContext = useQueryContextOptional();
  const sharedTime = useSharedTimeOptional();
  const query = useMemo(() => traceBackgroundQuery(parsedQuery), [parsedQuery]);
  const fixedWindow = exactWindow(query);
  const handoff = exploreHandoffState(query);
  const investigationRoute = exploreInvestigationRoute(parsedQuery);
  const context = sharedContext?.context ?? exploreQueryContext(query);
  const savedViewPending = isSavedViewReference(location.search);
  const historical = !savedViewPending && canLoadHistory(query, handoff);
  const { queryResult, evidence, transactions } = useExploreSignalSources(
    query,
    fixedWindow ?? relativeHistoryWindow(query, sharedTime?.window),
    sharedTime?.refreshRevision ?? 0,
    historical,
    investigationRoute.kind === 'trace'
  );
  const updateSearch = (path: string) => updateExploreSearch(path, query.signal, location, navigate, setSearchParams);
  const updateQuery = (changes: ExploreQueryPatch) => {
    const timePatch =
      changes.signal && changes.signal !== query.signal ? querySubmissionTimePatch(query, evidence?.window) : {};
    const next = mergeExploreQuery(query, mergeExploreContextChanges(context, { ...changes, ...timePatch }));
    updateSearch(buildExplorePath(next));
  };
  const updateManualQuery = (changes: ExploreQueryPatch) => {
    const next = mergeManualExploreQuery(query, context, changes);
    updateSearch(buildExplorePath(next));
  };
  const time = useExploreRouteTime(query, sharedTime, updateQuery);
  const submission = useWindowedSubmission(query, fixedWindow, updateManualQuery);
  const refresh = useExploreRefresh(
    query,
    historical,
    sharedTime,
    transactions.active ? transactions.refresh : queryResult.refetch
  );
  const canCorrectPage = historical && investigationRoute.kind === 'inactive';
  const correctingPage = useTracePageCorrection(query, queryResult, canCorrectPage);
  return {
    query,
    transactions,
    handoff,
    investigationRoute,
    focusedQuery: parsedQuery,
    submission,
    result:
      savedViewPending || correctingPage
        ? { kind: 'loading' as const }
        : resolveResult(query, handoff, queryResult.isPending, queryResult.isFetching, queryResult.error, evidence),
    time,
    updateQuery,
    updateManualQuery,
    refresh,
    openPath
  };
}

function exactWindow(query: ExploreQuery) {
  return query.start != null && query.end != null && query.start < query.end
    ? { from: query.start, to: query.end }
    : undefined;
}

function resolveResult(
  query: ExploreQuery,
  handoff: ReturnType<typeof exploreHandoffState>,
  pending: boolean,
  fetching: boolean,
  error: Error | null,
  evidence: HistoricalEvidence | undefined
): ExplorePageResultState {
  const immediate = immediateResult(query, handoff, pending, evidence);
  if (immediate) return immediate;
  const current = evidence ? resolveDataResult(query, evidence) : undefined;
  if (error) {
    const errorKind = pageFailureKind(error);
    const invalidFilterReason = logFilterFailureReason(error);
    const syntaxDiagnostic =
      query.signal === 'logs' ? logSyntaxDiagnostic(error, query.query, query.searchSyntax) : undefined;
    return current
      ? { kind: 'stale_error', errorKind, invalidFilterReason, syntaxDiagnostic, evidence: current }
      : { kind: errorKind, invalidFilterReason, syntaxDiagnostic };
  }
  if (fetching && current) return { kind: 'refreshing', evidence: current };
  if (!evidence) return { kind: 'error' };
  return current ?? { kind: 'error' };
}

function immediateResult(
  query: ExploreQuery,
  handoff: ReturnType<typeof exploreHandoffState>,
  pending: boolean,
  evidence: HistoricalEvidence | undefined
): ExplorePageResultState | undefined {
  if (handoff === 'invalid') return { kind: 'invalid' };
  if (query.signal === 'logs' && query.live) return { kind: 'live' };
  return pending && !evidence ? { kind: 'loading' } : undefined;
}

function pageFailureKind(error: Error): ExploreFailureKind {
  const kind = classifyExploreSignalError(error);
  return kind === 'missing' ? 'error' : kind;
}

function resolveDataResult(query: ExploreQuery, evidence: HistoricalEvidence): ExploreCurrentResultState | undefined {
  if (query.signal !== evidence.signal) return undefined;
  if (evidence.signal === 'metrics') {
    if (!isMetricConsole(evidence.data)) {
      return {
        kind: 'metric',
        state: { kind: 'selection_required' },
        window: evidence.window,
        revision: evidence.revision
      };
    }
    return {
      kind: 'metric',
      state: metricResultState(evidence.data),
      data: evidence.data,
      window: evidence.window,
      revision: evidence.revision
    };
  }
  if (evidence.signal === 'logs') {
    return {
      kind: evidence.data.page.totalElements === 0 ? 'empty' : 'ready',
      signal: 'logs',
      data: evidence.data.page,
      statistics: { overview: evidence.data.overview, trend: evidence.data.trend },
      calculated: evidence.data.calculated,
      window: evidence.window,
      revision: evidence.revision
    };
  }
  const page = evidence.data;
  return {
    kind: page.totalElements === 0 ? 'empty' : 'ready',
    signal: 'traces',
    data: page,
    window: evidence.window,
    revision: evidence.revision
  };
}

function relativeHistoryWindow(query: ExploreQuery, sharedWindow: { from: number; to: number } | undefined) {
  if (!sharedWindow) return undefined;
  return { from: sharedWindow.to - timeRangeMilliseconds(query.timeRange), to: sharedWindow.to };
}

function useWindowedSubmission(
  query: ExploreQuery,
  window: ReturnType<typeof exactWindow>,
  update: (patch: ExploreQueryPatch) => void
) {
  return useExploreSubmission(query, patch =>
    update({ ...patch, ...querySubmissionTimePatch(query, window), pageIndex: undefined })
  );
}

function canLoadHistory(query: ExploreQuery, handoff: ReturnType<typeof exploreHandoffState>) {
  return (
    handoff !== 'invalid' &&
    exploreInvestigationRoute(query).kind === 'inactive' &&
    !(query.signal === 'logs' && query.live)
  );
}
