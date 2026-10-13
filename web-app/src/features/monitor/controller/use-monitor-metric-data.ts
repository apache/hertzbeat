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

import { skipToken, useQueries, useQuery, type QueryFunctionContext } from '@tanstack/react-query';

import { loadFavoriteMetrics, loadHistoryMetric, loadRealtimeMetric } from '../api/monitor-api';
import type { Monitor, MonitorMetricOption } from '../model/monitor-contract';
import {
  monitorDetailRefreshInterval,
  type MonitorDetailRefreshSeconds,
  type MonitorMetricHistory
} from '../model/monitor-detail-model';
import { monitorQueryKeys } from './monitor-query-keys';

export function useMonitorMetricData(input: {
  monitor: Monitor | undefined;
  metric: MonitorMetricOption | undefined;
  realtimeGroups: Array<{ group: string }>;
  historyRequests: Array<{ metric: MonitorMetricOption; history: MonitorMetricHistory; interval: boolean }>;
  metricKey: string;
  refreshSeconds: MonitorDetailRefreshSeconds;
}) {
  const { monitor, metric, realtimeGroups, historyRequests, metricKey, refreshSeconds } = input;
  const refetchInterval = monitorDetailRefreshInterval(refreshSeconds);
  // Monitor metric endpoints accept the route-local history range, not the shell's exact time window.
  // Keeping query keys aligned with those request inputs avoids refetching an identical request.
  // `enabled: false` still permits manual refetch; skipToken removes the unsafe query function entirely.
  const favorites = useQuery(favoriteMetricQueryOptions(monitor, refetchInterval));
  const realtime = useQuery(realtimeMetricQueryOptions(monitor, metric, refetchInterval));
  const realtimeGroupQueries = useQueries({
    queries: realtimeGroups.map(group =>
      realtimeMetricQueryOptions(monitor, realtimeGroupMetric(group.group), refetchInterval)
    )
  });
  const historyQueries = useQueries({
    queries: historyRequests.map(request =>
      historyMetricQueryOptions(
        monitor,
        request.metric,
        request.metric.key,
        request.history,
        request.interval,
        refetchInterval
      )
    )
  });
  const historyCharts = historyRequests.map((request, index) => ({ ...request, query: historyQueries[index]! }));
  return {
    favorites,
    realtime,
    realtimeGroups: realtimeGroups.map((group, index) => ({ group: group.group, query: realtimeGroupQueries[index]! })),
    historyCharts,
    historical: historyCharts.find(item => item.metric.key === metricKey)?.query
  };
}

function realtimeGroupMetric(group: string): MonitorMetricOption {
  return { key: group, group, field: group, historySupported: false };
}

function favoriteMetricQueryOptions(monitor: Monitor | undefined, refetchInterval: number | false) {
  return {
    queryKey: monitorQueryKeys.favorites(monitor?.id),
    queryFn: monitor ? ({ signal }: QueryFunctionContext) => loadFavoriteMetrics(monitor.id, signal) : skipToken,
    refetchInterval: activeRefreshInterval(Boolean(monitor), refetchInterval)
  } as const;
}

function realtimeMetricQueryOptions(
  monitor: Monitor | undefined,
  metric: MonitorMetricOption | undefined,
  refetchInterval: number | false
) {
  return {
    queryKey: monitorQueryKeys.realtime(monitor?.id, metric?.group),
    queryFn:
      monitor && metric
        ? ({ signal }: QueryFunctionContext) => loadRealtimeMetric(monitor.id, metric, signal)
        : skipToken,
    refetchInterval: activeRefreshInterval(Boolean(monitor && metric), refetchInterval)
  } as const;
}

function historyMetricQueryOptions(
  monitor: Monitor | undefined,
  metric: MonitorMetricOption | undefined,
  metricKey: string,
  history: MonitorMetricHistory,
  interval: boolean,
  refetchInterval: number | false
) {
  return {
    queryKey: monitorQueryKeys.history(monitor, metricKey, history, interval),
    queryFn:
      monitor && metric
        ? ({ signal }: QueryFunctionContext) => loadHistoryMetric(monitor, metric, history, interval, signal)
        : skipToken,
    refetchInterval: activeRefreshInterval(Boolean(monitor && metric), refetchInterval)
  } as const;
}

function activeRefreshInterval(active: boolean, interval: number | false) {
  return active ? interval : false;
}
