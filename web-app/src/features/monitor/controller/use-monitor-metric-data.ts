/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { skipToken, useQuery } from '@tanstack/react-query';

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
  metricKey: string;
  history: MonitorMetricHistory;
  refreshSeconds: MonitorDetailRefreshSeconds;
}) {
  const { monitor, metric, metricKey, history, refreshSeconds } = input;
  const refetchInterval = monitorDetailRefreshInterval(refreshSeconds);
  // Monitor metric endpoints accept the route-local history range, not the shell's exact time window.
  // Keeping query keys aligned with those request inputs avoids refetching an identical request.
  // `enabled: false` still permits manual refetch; skipToken removes the unsafe query function entirely.
  const favorites = useQuery({
    queryKey: monitorQueryKeys.favorites(monitor?.id),
    queryFn: monitor ? ({ signal }) => loadFavoriteMetrics(monitor.id, signal) : skipToken,
    refetchInterval: activeRefreshInterval(Boolean(monitor), refetchInterval)
  });
  const realtime = useQuery({
    queryKey: monitorQueryKeys.realtime(monitor?.id, metric?.group, metric?.field),
    queryFn: monitor && metric ? ({ signal }) => loadRealtimeMetric(monitor.id, metric, signal) : skipToken,
    refetchInterval: activeRefreshInterval(Boolean(monitor && metric), refetchInterval)
  });
  const historical = useQuery({
    queryKey: monitorQueryKeys.history(monitor, metricKey, history),
    queryFn: monitor && metric ? ({ signal }) => loadHistoryMetric(monitor, metric, history, signal) : skipToken,
    refetchInterval: activeRefreshInterval(Boolean(monitor && metric), refetchInterval)
  });
  return { favorites, realtime, historical };
}

function activeRefreshInterval(active: boolean, interval: number | false) {
  return active ? interval : false;
}
