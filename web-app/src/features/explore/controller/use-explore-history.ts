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

import { queryOptions, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { loadLogHistoryEvidence, loadMetricSignal, loadTraceSignal } from '../api/explore-api';
import { loadCalculatedPage, loadCalculatedTrend } from '../api/explore-log-calculated-v2-api';
import { loadSubqueryPage, loadSubqueryTrend } from '../api/explore-log-subquery-api';
import type { ExploreQuery, LogExploreQuery } from '../model/explore-model';
import { timeRangeMilliseconds } from '../model/explore-model';
import type { HistoricalEvidence } from '../model/explore-result-model';
import { projectedLogEvidence } from '../model/explore-projected-log-evidence';
import { exploreQueryKeys } from './explore-query-keys';

type ExactWindow = { from: number; to: number } | undefined;

export function useExploreHistory(
  query: ExploreQuery,
  window: ExactWindow,
  enabled: boolean,
  refreshRevision: number,
  focused = false
) {
  const evidenceOwner = useMemo(
    () => requireHistoryEvidenceOwner(exploreQueryKeys.history(query, window, 0)),
    [query, window]
  );
  const queryClient = useQueryClient();
  const queryResult = useQuery({
    ...historyQueryOptions(query, window, refreshRevision),
    enabled,
    // Query, Refresh and the explicit refresh interval own result changes during investigation.
    refetchOnWindowFocus: false,
    staleTime: focused ? 30_000 : 0,
    initialData: () =>
      focused && window
        ? equivalentWindowEvidence(queryClient, exploreQueryKeys.history(query, window, refreshRevision), window)
        : undefined,
    placeholderData: (previous, previousQuery) =>
      previousQuery && historyEvidenceOwnerFromKey(previousQuery.queryKey) === evidenceOwner ? previous : undefined
  });
  const retainedEvidence = latestHistoryEvidence(queryClient, evidenceOwner, query.signal);
  // A failed refresh generation drops placeholderData, so retention is explicitly bounded by the stable request owner.
  const evidence = queryResult.data ?? retainedEvidence;
  return { queryResult, evidence };
}

function historyQueryOptions(query: ExploreQuery, window: ExactWindow, refreshRevision: number) {
  return queryOptions({
    queryKey: exploreQueryKeys.history(query, window, refreshRevision),
    queryFn: ({ signal }) => loadHistorical(query, window, refreshRevision, signal),
    retry: false,
    staleTime: 0
  });
}

function requireHistoryEvidenceOwner(queryKey: readonly unknown[]) {
  const owner = historyEvidenceOwnerFromKey(queryKey);
  if (!owner) throw new Error('Explore history key does not carry an evidence owner');
  return owner;
}

function historyEvidenceOwnerFromKey(queryKey: readonly unknown[]) {
  const generation = queryKey[1];
  if (
    queryKey[0] !== 'explore-history' ||
    generation == null ||
    typeof generation !== 'object' ||
    !('refreshRevision' in generation)
  )
    return undefined;
  const request = queryKey.at(-1);
  const relative =
    request && typeof request === 'object' && 'relativeTimeRange' in request && request.relativeTimeRange;
  const scoped = generation as { context?: unknown; window?: unknown; refreshRevision: unknown };
  return JSON.stringify([
    queryKey[0],
    { ...scoped, window: relative ? 'none' : scoped.window, refreshRevision: 0 },
    ...retainedHistoryRequestParts(queryKey)
  ]);
}

function retainedHistoryRequestParts(queryKey: readonly unknown[]) {
  const parts = queryKey.slice(2);
  const request = parts.at(-1);
  if (queryKey[2] !== 'logs' || request == null || typeof request !== 'object' || Array.isArray(request)) return parts;
  return [...parts.slice(0, -1), { ...(request as Record<string, unknown>), pageIndex: undefined }];
}

function latestHistoryEvidence(queryClient: QueryClient, owner: string, signal: ExploreQuery['signal']) {
  const matches = queryClient.getQueriesData<HistoricalEvidence>({
    predicate: candidate => historyEvidenceOwnerFromKey(candidate.queryKey) === owner
  });
  return matches.reduce<{ revision: number; updatedAt: number; evidence?: HistoricalEvidence }>(
    (latest, [queryKey, evidence]) => {
      const revision = historyRefreshRevisionFromKey(queryKey);
      const updatedAt = queryClient.getQueryState(queryKey)?.dataUpdatedAt ?? 0;
      if (
        revision === undefined ||
        revision < latest.revision ||
        (revision === latest.revision && updatedAt <= latest.updatedAt) ||
        evidence?.signal !== signal
      )
        return latest;
      return { revision, updatedAt, evidence };
    },
    { revision: -1, updatedAt: -1 }
  ).evidence;
}

function historyRefreshRevisionFromKey(queryKey: readonly unknown[]) {
  const generation = queryKey[1];
  if (generation == null || typeof generation !== 'object' || !('refreshRevision' in generation)) return undefined;
  const revision = generation.refreshRevision;
  return Number.isSafeInteger(revision) && Number(revision) >= 0 ? Number(revision) : undefined;
}

async function loadHistorical(
  query: ExploreQuery,
  requestedWindow: ExactWindow,
  revision: number,
  signal: AbortSignal
): Promise<HistoricalEvidence> {
  const window = requestedWindow ?? captureWindow(query);
  const scopedQuery = { ...query, start: window.from, end: window.to, windowMode: undefined };
  if (scopedQuery.signal === 'metrics') {
    return { signal: 'metrics', data: await loadMetricSignal(scopedQuery, signal), window, revision };
  }
  if (scopedQuery.signal === 'logs') {
    if (scopedQuery.logSubquery !== undefined) {
      return loadSubqueryHistory(scopedQuery, window, revision, signal);
    }
    if (scopedQuery.logCalculatedV2 !== undefined) {
      const calculated = await loadCalculatedPage(scopedQuery, signal);
      const trend = await loadCalculatedTrend(scopedQuery, signal).catch(() => undefined);
      if (signal.aborted) throw signal.reason ?? new DOMException('Aborted', 'AbortError');
      const result = projectedLogEvidence(window, revision, scopedQuery.pageIndex ?? 0, calculated.result, trend);
      return { ...result, data: { ...result.data, calculated } };
    }
    return { signal: 'logs', data: await loadLogHistoryEvidence(scopedQuery, signal), window, revision };
  }
  return { signal: 'traces', data: await loadTraceSignal(scopedQuery, signal), window, revision };
}

async function loadSubqueryHistory(
  query: LogExploreQuery,
  window: NonNullable<ExactWindow>,
  revision: number,
  signal: AbortSignal
): Promise<HistoricalEvidence> {
  const page = await loadSubqueryPage(query, signal);
  const trend = await loadSubqueryTrend(query, signal).catch(() => undefined);
  if (signal.aborted) throw signal.reason ?? new DOMException('Aborted', 'AbortError');
  return projectedLogEvidence(window, revision, query.pageIndex ?? 0, page.result, trend);
}

function captureWindow(query: ExploreQuery) {
  if (query.start != null && query.end != null && query.start < query.end) return { from: query.start, to: query.end };
  const to = Date.now();
  return { from: to - timeRangeMilliseconds(query.timeRange), to };
}

function equivalentWindowEvidence(client: QueryClient, key: readonly unknown[], window: NonNullable<ExactWindow>) {
  const identity = exactRequestIdentity(key, window);
  return client
    .getQueryCache()
    .findAll()
    .find(candidate => {
      const data = candidate.state.data as HistoricalEvidence | undefined;
      return (
        candidate.queryKey[0] === 'explore-history' &&
        candidate.state.status === 'success' &&
        candidate.state.fetchStatus === 'idle' &&
        data?.signal === key[2] &&
        data?.window.from === window.from &&
        data.window.to === window.to &&
        exactRequestIdentity(candidate.queryKey, window) === identity
      );
    })?.state.data as HistoricalEvidence | undefined;
}

function exactRequestIdentity(key: readonly unknown[], window: NonNullable<ExactWindow>) {
  return JSON.stringify(key, (name, value: unknown) => {
    if (name === 'relativeTimeRange') return undefined;
    if (name === 'window') return window;
    return value;
  });
}
