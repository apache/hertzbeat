/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { skipToken, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import type { SignalKind } from '@/shared/query-context';
import { loadMonitorInvestigationBinding } from '../api/monitor-api';
import type { Monitor } from '../model/monitor-contract';
import {
  monitorDetailRefreshInterval,
  type MonitorDetailRefreshSeconds,
  type MonitorHistoryChart
} from '../model/monitor-detail-model';
import {
  buildMonitorInvestigationSignalPath,
  createMonitorInvestigation,
  monitorInvestigationWindow
} from '../model/monitor-investigation-model';
import { monitorQueryKeys } from './monitor-query-keys';

export function useMonitorInvestigation(
  monitor: Monitor | undefined,
  chart: MonitorHistoryChart | undefined,
  refreshSeconds: MonitorDetailRefreshSeconds
) {
  const navigate = useNavigate();
  const query = useQuery({
    queryKey: monitorQueryKeys.investigation(monitor?.id),
    queryFn: monitor ? ({ signal }) => loadMonitorInvestigationBinding(monitor.id, signal) : skipToken,
    refetchInterval: monitor ? monitorDetailRefreshInterval(refreshSeconds) : false,
    retry: false
  });
  const binding = query.data?.monitorId === monitor?.id ? query.data : undefined;
  return {
    signals: binding ? [...binding.signals] : [],
    open: (signal: SignalKind) => {
      if (!monitor || !binding || !chart || !binding.signals.includes(signal)) return;
      try {
        const window = monitorInvestigationWindow(
          chart.history,
          Date.now(),
          Intl.DateTimeFormat().resolvedOptions().timeZone
        );
        const investigation = createMonitorInvestigation(monitor, binding, window);
        const path = buildMonitorInvestigationSignalPath(investigation, signal);
        if (path) void navigate(path);
      } catch {
        // Invalid local time or stale identity must not create a partial handoff.
      }
    },
    refetch: query.refetch
  };
}
