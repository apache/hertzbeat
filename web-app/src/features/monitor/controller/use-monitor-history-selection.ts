/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useCallback, useMemo, useState } from 'react';

import type { RuntimeStatusViewModel } from '@/features/runtime-status';
import type { MonitorDetailMetric, MonitorMetricOption } from '../model/monitor-contract';
import {
  monitorHistoryMetrics,
  monitorMetricHistoryUsesInterval,
  type MonitorHistoryAvailability,
  type MonitorMetricHistory
} from '../model/monitor-detail-model';

const historyChartPageSize = 6;

type HistorySelectionState = {
  sourceKey: string;
  visibleCount: number;
  activeKeys: Set<string>;
  ranges: Record<string, MonitorMetricHistory>;
  intervals: Record<string, boolean>;
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
  const defaultInterval = monitorMetricHistoryUsesInterval(defaultHistory);
  const evidence = historyEvidence(metrics, current, defaultHistory, defaultInterval, enabled);
  const update = useCallback(
    (change: (state: HistorySelectionState) => HistorySelectionState) => {
      setSelection(state => change(state.sourceKey === sourceKey ? state : createSelection(sourceKey)));
    },
    [sourceKey]
  );
  return {
    availability,
    ...evidence,
    historyFor: (metricKey: string) => current.ranges[metricKey] ?? defaultHistory,
    intervalFor: (metricKey: string) => current.intervals[metricKey] ?? defaultInterval,
    hasMore: enabled && current.visibleCount < metrics.length,
    ...historyActions(metrics, enabled, update)
  };
}

function historyEvidence(
  metrics: MonitorMetricOption[],
  state: HistorySelectionState,
  defaultHistory: MonitorMetricHistory,
  defaultInterval: boolean,
  enabled: boolean
) {
  const project = (metric: MonitorMetricOption) => ({
    metric,
    history: state.ranges[metric.key] ?? defaultHistory,
    interval: state.intervals[metric.key] ?? defaultInterval
  });
  return {
    visible: enabled ? metrics.slice(0, state.visibleCount).map(project) : [],
    requests: enabled ? metrics.filter(metric => state.activeKeys.has(metric.key)).map(project) : []
  };
}

function historyActions(
  metrics: MonitorMetricOption[],
  enabled: boolean,
  update: (change: (state: HistorySelectionState) => HistorySelectionState) => void
) {
  const accepts = (metricKey: string) => enabled && metrics.some(metric => metric.key === metricKey);
  return {
    activate: (metricKey: string) => {
      if (accepts(metricKey)) update(state => ({ ...state, activeKeys: new Set(state.activeKeys).add(metricKey) }));
    },
    setRange: (metricKey: string, history: MonitorMetricHistory) => {
      if (!accepts(metricKey)) return;
      update(state => ({
        ...state,
        activeKeys: new Set(state.activeKeys).add(metricKey),
        ranges: { ...state.ranges, [metricKey]: history }
      }));
    },
    setMode: (metricKey: string, interval: boolean) => {
      if (!accepts(metricKey)) return;
      update(state => ({
        ...state,
        activeKeys: new Set(state.activeKeys).add(metricKey),
        intervals: { ...state.intervals, [metricKey]: interval }
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
  return { sourceKey, visibleCount: historyChartPageSize, activeKeys: new Set(), ranges: {}, intervals: {} };
}
