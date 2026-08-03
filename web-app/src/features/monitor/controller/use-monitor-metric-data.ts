/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

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
  historyRequests: Array<{ metric: MonitorMetricOption; history: MonitorMetricHistory }>;
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
      historyMetricQueryOptions(monitor, request.metric, request.metric.key, request.history, refetchInterval)
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
  refetchInterval: number | false
) {
  return {
    queryKey: monitorQueryKeys.history(monitor, metricKey, history),
    queryFn:
      monitor && metric
        ? ({ signal }: QueryFunctionContext) => loadHistoryMetric(monitor, metric, history, signal)
        : skipToken,
    refetchInterval: activeRefreshInterval(Boolean(monitor && metric), refetchInterval)
  } as const;
}

function activeRefreshInterval(active: boolean, interval: number | false) {
  return active ? interval : false;
}
