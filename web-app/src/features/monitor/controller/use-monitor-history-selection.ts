/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useCallback, useMemo, useState } from 'react';

import type { RuntimeStatusViewModel } from '@/features/runtime-status';
import type { MonitorDetailMetric } from '../model/monitor-contract';
import {
  monitorHistoryMetrics,
  type MonitorHistoryAvailability,
  type MonitorMetricHistory
} from '../model/monitor-detail-model';

const historyChartPageSize = 6;

type HistorySelectionState = {
  sourceKey: string;
  visibleCount: number;
  activeKeys: Set<string>;
  ranges: Record<string, MonitorMetricHistory>;
};

export function useMonitorHistorySelection(input: {
  monitorId: number | undefined;
  definitions: MonitorDetailMetric[];
  defaultHistory: MonitorMetricHistory;
  runtimeStatus: RuntimeStatusViewModel;
}) {
  const { monitorId, definitions, defaultHistory, runtimeStatus } = input;
  const metrics = useMemo(() => monitorHistoryMetrics(definitions), [definitions]);
  const sourceKey = `${monitorId ?? 'none'}|${defaultHistory}|${metrics.map(metric => metric.key).join('|')}`;
  const [selection, setSelection] = useState(() => createSelection(sourceKey));
  let current = selection;
  if (selection.sourceKey !== sourceKey) {
    // React permits this guarded adjustment during render. It prevents an A-B-A route change
    // from reviving a former monitor's viewport, range, or activation state.
    current = createSelection(sourceKey);
    setSelection(current);
  }
  const availability = historyAvailability(runtimeStatus);
  const enabled = availability.kind === 'available' || availability.kind === 'degraded';
  const visible = enabled
    ? metrics.slice(0, current.visibleCount).map(metric => ({
        metric,
        history: current.ranges[metric.key] ?? defaultHistory
      }))
    : [];
  const requests = enabled
    ? metrics
        .filter(metric => current.activeKeys.has(metric.key))
        .map(metric => ({ metric, history: current.ranges[metric.key] ?? defaultHistory }))
    : [];
  const update = useCallback(
    (change: (state: HistorySelectionState) => HistorySelectionState) => {
      setSelection(state => change(state.sourceKey === sourceKey ? state : createSelection(sourceKey)));
    },
    [sourceKey]
  );
  return {
    availability,
    visible,
    requests,
    historyFor: (metricKey: string) => current.ranges[metricKey] ?? defaultHistory,
    hasMore: enabled && current.visibleCount < metrics.length,
    activate: (metricKey: string) => {
      if (!enabled || !metrics.some(metric => metric.key === metricKey)) return;
      update(state => ({ ...state, activeKeys: new Set(state.activeKeys).add(metricKey) }));
    },
    setRange: (metricKey: string, history: MonitorMetricHistory) => {
      if (!enabled || !metrics.some(metric => metric.key === metricKey)) return;
      update(state => ({
        ...state,
        activeKeys: new Set(state.activeKeys).add(metricKey),
        ranges: { ...state.ranges, [metricKey]: history }
      }));
    },
    loadMore: () =>
      update(state => ({ ...state, visibleCount: Math.min(state.visibleCount + historyChartPageSize, metrics.length) }))
  };
}

function historyAvailability(runtimeStatus: RuntimeStatusViewModel): MonitorHistoryAvailability {
  if (runtimeStatus.state === 'loading') return { kind: 'loading' };
  if (runtimeStatus.state === 'request-failed') {
    return { kind: runtimeStatus.failure === 'unavailable' ? 'unavailable' : 'error' };
  }
  const storage = runtimeStatus.snapshot.storage;
  return { kind: storage.status, errorCode: storage.errorCode };
}

function createSelection(sourceKey: string): HistorySelectionState {
  return { sourceKey, visibleCount: historyChartPageSize, activeKeys: new Set(), ranges: {} };
}
