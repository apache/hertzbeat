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

import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useQueryContextOptional } from '@/shared/query-context';
import { useSharedTimeOptional } from '@/shared/time';

import { classifyExploreSignalError } from '../api/explore-api';
import { useExploreSubmission } from './use-explore-submission';
import {
  buildExplorePath,
  exploreHandoffState,
  mergeExploreContextChanges,
  exploreQueryContext,
  mergeExploreQuery,
  parseExploreQuery,
  querySubmissionTimePatch,
  retireInstrumentationHandoff,
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
import { useExploreHistory } from './use-explore-history';

export function useExplorePageController() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const locationSearch = searchParams.toString();
  const parsedQuery = useMemo(() => parseExploreQuery(new URLSearchParams(locationSearch)), [locationSearch]);
  const sharedContext = useQueryContextOptional();
  const sharedTime = useSharedTimeOptional();
  const fixedWindow = exactWindow(parsedQuery);
  const query = parsedQuery;
  const handoff = exploreHandoffState(query);
  const context = sharedContext?.context ?? exploreQueryContext(query);
  const historical = handoff !== 'invalid' && !(query.signal === 'logs' && query.live);
  const { queryResult, evidence } = useExploreHistory(query, fixedWindow, historical, sharedTime?.refreshRevision ?? 0);
  const updateQuery = (changes: ExploreQueryPatch) => {
    const next = mergeExploreQuery(query, mergeExploreContextChanges(context, changes));
    setSearchParams(searchFromPath(buildExplorePath(next)));
  };
  const updateManualQuery = (changes: ExploreQueryPatch) => {
    const contextual = mergeExploreContextChanges(context, withoutHandoffMarkerChanges(changes));
    const next = retireInstrumentationHandoff(mergeExploreQuery(query, contextual));
    setSearchParams(searchFromPath(buildExplorePath(next)));
  };
  const submission = useExploreSubmission(query, patch =>
    updateManualQuery({
      ...patch,
      ...querySubmissionTimePatch(query, fixedWindow),
      pageIndex: undefined
    })
  );
  const refresh = () => refreshHistory(historical, sharedTime, queryResult.refetch);
  return {
    query,
    handoff,
    submission,
    result: resolveResult(query, handoff, queryResult.isPending, queryResult.isFetching, queryResult.error, evidence),
    time: sharedTime,
    updateQuery,
    updateManualQuery,
    refresh,
    openPath: (path: string) => {
      void navigate(path);
    }
  };
}

function refreshHistory(
  historical: boolean,
  sharedTime: ReturnType<typeof useSharedTimeOptional>,
  refetch: () => Promise<unknown>
) {
  if (!historical) return Promise.resolve();
  if (sharedTime?.manualRefreshOwner === 'time_revision') {
    // Time-owned queries refresh by changing their scoped key. Refetching here too would duplicate one operator action.
    sharedTime.requestRefresh();
    return Promise.resolve();
  }
  return refetch().then(() => undefined);
}

function withoutHandoffMarkerChanges(changes: ExploreQueryPatch): ExploreQueryPatch {
  const ordinaryChanges = { ...changes };
  delete ordinaryChanges.intakeProfileId;
  delete ordinaryChanges.collectorId;
  delete ordinaryChanges.windowMode;
  return ordinaryChanges;
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
  if (handoff === 'invalid') return { kind: 'invalid' };
  if (query.signal === 'logs' && query.live) return { kind: 'live' };
  if (pending) return { kind: 'loading' };
  const current = evidence ? resolveDataResult(query, evidence) : undefined;
  if (error) {
    const errorKind = pageFailureKind(error);
    return current ? { kind: 'stale_error', errorKind, evidence: current } : { kind: errorKind };
  }
  if (fetching && current) return { kind: 'refreshing', evidence: current };
  if (!evidence) return { kind: 'error' };
  return current ?? { kind: 'error' };
}

function pageFailureKind(error: Error): ExploreFailureKind {
  const kind = classifyExploreSignalError(error);
  return kind === 'permission' || kind === 'transport_error' || kind === 'contract_error' ? kind : 'error';
}

function resolveDataResult(query: ExploreQuery, evidence: HistoricalEvidence): ExploreCurrentResultState | undefined {
  if (query.signal !== evidence.signal) return undefined;
  if (evidence.signal === 'metrics') {
    return { kind: 'metric', state: metricResultState(evidence.data), data: evidence.data };
  }
  if (evidence.signal === 'logs') {
    const page = evidence.data;
    return { kind: page.totalElements === 0 ? 'empty' : 'ready', signal: 'logs', data: page };
  }
  const page = evidence.data;
  return { kind: page.totalElements === 0 ? 'empty' : 'ready', signal: 'traces', data: page };
}

function searchFromPath(path: string) {
  const marker = path.indexOf('?');
  return marker < 0 ? new URLSearchParams() : new URLSearchParams(path.slice(marker + 1));
}
