/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { skipToken, useQuery } from '@tanstack/react-query';

import type { SharedTimeValue } from '@/shared/time';

import { loadFavoriteMetrics, loadHistoryMetric, loadRealtimeMetric } from '../api/monitor-api';
import type { Monitor, MonitorMetricOption } from '../model/monitor-contract';
import type { MonitorMetricHistory } from '../model/monitor-detail-model';
import { monitorQueryKeys } from './monitor-query-keys';

const realtimeRefreshIntervalMs = 10_000;

export function useMonitorMetricData(input: {
  monitor: Monitor | undefined;
  metric: MonitorMetricOption | undefined;
  metricKey: string;
  history: MonitorMetricHistory;
  sharedTime: SharedTimeValue | null;
}) {
  const { monitor, metric, metricKey, history, sharedTime } = input;
  // `enabled: false` still permits manual refetch; skipToken removes the unsafe query function entirely.
  const favorites = useQuery({
    queryKey: monitorQueryKeys.favorites(monitor?.id),
    queryFn: monitor ? ({ signal }) => loadFavoriteMetrics(monitor.id, signal) : skipToken
  });
  const realtime = useQuery({
    queryKey: monitorQueryKeys.realtime(monitor?.id, metric?.group, metric?.field, sharedTime),
    queryFn: monitor && metric ? ({ signal }) => loadRealtimeMetric(monitor.id, metric, signal) : skipToken,
    refetchInterval: realtimeRefreshIntervalMs
  });
  const historical = useQuery({
    queryKey: monitorQueryKeys.history(monitor, metricKey, history, sharedTime),
    queryFn: monitor && metric ? ({ signal }) => loadHistoryMetric(monitor, metric, history, signal) : skipToken
  });
  return { favorites, realtime, historical };
}
