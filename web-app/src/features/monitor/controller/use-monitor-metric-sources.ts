/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useState } from 'react';

import { useRuntimeStatusController } from '@/features/runtime-status';
import type { Monitor, MonitorDetailMetric } from '../model/monitor-contract';
import { monitorRealtimeGroups, type MonitorDetailRefreshSeconds } from '../model/monitor-detail-model';
import { useMonitorHistorySelection } from './use-monitor-history-selection';
import { useMonitorMetricData } from './use-monitor-metric-data';
import { useMonitorMetricSelection } from './use-monitor-metric-selection';

const realtimeGroupPageSize = 10;

export function useMonitorMetricSources(input: {
  monitor: Monitor | undefined;
  embedded: MonitorDetailMetric[];
  refreshSeconds: MonitorDetailRefreshSeconds;
}) {
  const { monitor, embedded, refreshSeconds } = input;
  const runtimeStatus = useRuntimeStatusController();
  const selection = useMonitorMetricSelection(monitor, embedded);
  const realtimeSelection = useRealtimeGroupSelection(monitor?.id, selection.definitions);
  const historySelection = useMonitorHistorySelection({
    monitorId: monitor?.id,
    definitions: selection.definitions,
    defaultHistory: selection.history,
    runtimeStatus
  });
  const queries = useMonitorMetricData({
    monitor,
    metric: selection.metric,
    realtimeGroups: realtimeSelection.visible,
    historyRequests: historySelection.requests,
    metricKey: selection.metricKey,
    refreshSeconds
  });
  return { ...selection, realtimeSelection, historySelection, queries };
}

function useRealtimeGroupSelection(monitorId: number | undefined, definitions: MonitorDetailMetric[]) {
  const sourceKey = `${monitorId ?? 'none'}|${definitions.map(definition => definition.name).join('|')}`;
  const [selection, setSelection] = useState(() => ({ sourceKey, visibleCount: realtimeGroupPageSize }));
  const groups = monitorRealtimeGroups(definitions);
  let visibleCount = selection.visibleCount;
  if (selection.sourceKey !== sourceKey) {
    // Reset immediately for route transitions so returning to a prior monitor cannot revive
    // an old lazy-loading window.
    visibleCount = realtimeGroupPageSize;
    setSelection({ sourceKey, visibleCount });
  }
  return {
    visible: groups.slice(0, visibleCount),
    hasMore: visibleCount < groups.length,
    loadMore: () =>
      setSelection(current => ({
        sourceKey,
        visibleCount: Math.min(
          (current.sourceKey === sourceKey ? current.visibleCount : realtimeGroupPageSize) + realtimeGroupPageSize,
          groups.length
        )
      }))
  };
}
