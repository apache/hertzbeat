/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useQueries, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useSession } from '@/core/auth/session-context';
import {
  loadMetricSignal,
  loadLogStatistics,
  loadTraceAnalytics,
  loadErrorTraceSamples,
  buildTraceAnalyticsPath,
  readSavedQuery,
  type SavedQueryRecord,
  type MetricExploreQuery,
  type LogExploreQuery,
  type TraceExploreQuery
} from '@/features/explore';
import { loadEntities, readEntityQuery } from '@/features/entity/queries';
import {
  loadRepeatedErrors,
  loadRepeatedErrorRecords,
  type RepeatedErrorGroup
} from '../api/dashboard-repeated-errors-api';
import type { DashboardSignals } from '../model/dashboard-signals';
import { dashboardReadState } from '../model/dashboard-overview';
import { dashboardQueryKeys } from './dashboard-query-keys';
import { useDashboardMetricRotation } from './use-dashboard-metric-rotation';
import { useDashboardRepeatedErrorWindow } from './use-dashboard-repeated-error-window';
import { useDashboardPreviewClock } from './use-dashboard-preview-clock';
import { useDashboardVisitState } from './use-dashboard-visit-state';

export function useDashboardSignals(favorites: SavedQueryRecord[], favoriteState: string): DashboardSignals {
  const context = useDashboardSignalContext();
  const metricRotation = useDashboardMetricRotation(
    favorites.length,
    context.clock.hidden,
    context.clock.reducedMotion
  );
  const metric = useDashboardMetricQueries(favorites, context, metricRotation.metricIndex);
  const reads = useDashboardSignalReads(context);
  const repeated = useDashboardRepeatedErrors(context);
  return {
    ...context,
    ...metricRotation,
    ...metric,
    ...reads,
    ...repeated,
    favoriteState,
    metricCount: favorites.length,
    refresh: () => {
      context.clock.refresh();
      repeated.refresh();
    }
  };
}
function useDashboardSignalContext() {
  const session = useSession().session;
  const visit = useDashboardVisitState(session);
  const clock = useDashboardPreviewClock(visit.end, visit.refresh);
  const { serviceName, environment, setService, setEnvironment } = visit;
  const identity = [session?.workspaceId, session?.username];
  const scopeKey = JSON.stringify([session?.authenticated, ...identity, serviceName, environment]);
  const queryWindow = {
    start: clock.start,
    end: clock.end,
    timeRange: 'last-15m' as const,
    timeZone: 'UTC',
    serviceName: serviceName || undefined,
    environment: environment || undefined
  };
  const services = useQuery({
    queryKey: dashboardQueryKeys.catalog(identity),
    queryFn: ({ signal }) => loadEntities(readEntityQuery(new URLSearchParams({ type: 'service' })), signal),
    retry: false
  });
  const options = useMemo(() => services.data?.content ?? [], [services.data]);
  return {
    clock,
    serviceName,
    environment,
    setService,
    setEnvironment,
    identity,
    scopeKey,
    queryWindow,
    options,
    catalogState: dashboardReadState(services),
    workspaceId: session?.workspaceId ?? ''
  };
}
type SignalContext = ReturnType<typeof useDashboardSignalContext>;
function useDashboardMetricQueries(favorites: SavedQueryRecord[], context: SignalContext, metricIndex: number) {
  const { identity, scopeKey, clock } = context;
  const activeIndex = metricIndex % Math.max(favorites.length, 1);
  const indices = favorites.length ? [activeIndex] : [];
  if (favorites.length > 1) indices.push((activeIndex + 1) % favorites.length);
  const metricQueries = useQueries({
    queries: indices.map(index => {
      const record = favorites[index]!;
      return {
        queryKey: dashboardQueryKeys.metric(identity, record.viewKey, record.revision, scopeKey, clock.end),
        queryFn: ({ signal }: { signal: AbortSignal }) => loadFavoriteMetric(record, context, signal),
        enabled: index === activeIndex || !clock.hidden,
        retry: false,
        staleTime: 60_000,
        gcTime: 120_000
      };
    })
  });
  return { metric: metricQueries[0], active: favorites[activeIndex], activeIndex };
}
async function loadFavoriteMetric(record: SavedQueryRecord, context: SignalContext, signal: AbortSignal) {
  const { serviceName, environment, queryWindow } = context;
  const read = readSavedQuery(record);
  if (read.kind !== 'ready' || read.query.signal !== 'metrics') throw new Error('Unavailable saved metric');
  const query: MetricExploreQuery = {
    ...read.query,
    ...queryWindow,
    windowMode: undefined,
    serviceName: serviceName || read.query.serviceName,
    environment: environment || read.query.environment
  };
  if (read.query.entityId && serviceName && read.query.serviceName !== serviceName)
    throw new Error('Incompatible saved scope');
  return loadMetricSignal(query, signal);
}
function useDashboardSignalReads(context: SignalContext) {
  const { identity, scopeKey, clock, queryWindow } = context;
  const logs = useQuery({
    queryKey: dashboardQueryKeys.logTrend(identity, scopeKey, clock.end),
    queryFn: ({ signal }) =>
      loadLogStatistics(
        { signal: 'logs', ...queryWindow, searchSyntax: 'structured-v1' } satisfies LogExploreQuery,
        signal
      ),
    retry: false
  });
  const traces = useQuery({
    queryKey: dashboardQueryKeys.traceTrend(identity, scopeKey, clock.end),
    queryFn: ({ signal }) => {
      const query: TraceExploreQuery = { signal: 'traces', ...queryWindow };
      const request = { kind: 'histogram' as const, population: 'matched_traces' as const };
      return loadTraceAnalytics(
        buildTraceAnalyticsPath(query, { from: clock.start, to: clock.end }, request),
        request,
        signal
      );
    },
    retry: false
  });
  const traceSamples = useQuery({
    queryKey: dashboardQueryKeys.traceSamples(identity, scopeKey, clock.end),
    queryFn: ({ signal }) => loadErrorTraceSamples({ signal: 'traces', ...queryWindow }, signal),
    retry: false
  });
  return { logs, traces, traceSamples };
}
function useDashboardRepeatedErrors(context: SignalContext) {
  const { identity, scopeKey, clock, serviceName, environment } = context;
  const window = useDashboardRepeatedErrorWindow(clock.end, scopeKey);
  const { rankEnd, selected } = window;
  const rankScope = {
    workspaceId: context.workspaceId,
    start: rankEnd - 900_000,
    end: rankEnd,
    serviceName,
    environment
  };
  const reads = useDashboardRepeatedErrorReads(identity, scopeKey, rankScope, selected);
  return {
    ...reads,
    rankScope,
    ...window
  };
}
function useDashboardRepeatedErrorReads(
  identity: ReadonlyArray<string | null | undefined>,
  scopeKey: string,
  rankScope: import('../model/dashboard-repeated-errors').RepeatedErrorScope,
  selected: RepeatedErrorGroup | null
) {
  const rank = useQuery({
    queryKey: dashboardQueryKeys.errors(identity, scopeKey, rankScope.end),
    queryFn: ({ signal }) => loadRepeatedErrors(rankScope, signal),
    enabled: !!rankScope.workspaceId,
    retry: false
  });
  const records = useQuery({
    queryKey: dashboardQueryKeys.errorRecords(identity, scopeKey, rankScope.end, selected?.groupKey),
    queryFn: ({ signal }) => loadRepeatedErrorRecords(rankScope, selected!, signal),
    enabled: !!selected,
    retry: false
  });
  return { rank, records };
}
