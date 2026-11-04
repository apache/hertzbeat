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
  selectedGroups: string[] | null;
  collapsedGroups: string[];
};

export function useMonitorHistorySelection(input: {
  monitorId: number | undefined;
  definitions: MonitorDetailMetric[];
  defaultHistory: MonitorMetricHistory;
  runtimeStatus: RuntimeStatusViewModel;
  focusedMetricKey?: string | undefined;
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
  const evidence = historyEvidence(metrics, current, defaultHistory, defaultInterval, enabled, input.focusedMetricKey);
  const names = [...new Set(metrics.map(metric => metric.group))];
  const selected = current.selectedGroups ?? names;
  const visibleMetrics = metrics.filter(
    metric => selected.includes(metric.group) && !current.collapsedGroups.includes(metric.group)
  );
  const update = useCallback(
    (change: (state: HistorySelectionState) => HistorySelectionState) => {
      setSelection(state => change(state.sourceKey === sourceKey ? state : createSelection(sourceKey)));
    },
    [sourceKey]
  );
  return {
    availability,
    ...evidence,
    visible: enabled ? evidence.visible : [],
    groupSelection: { sourceKey, names, selected, collapsed: current.collapsedGroups },
    historyFor: (metricKey: string) => current.ranges[metricKey] ?? defaultHistory,
    intervalFor: (metricKey: string) => current.intervals[metricKey] ?? defaultInterval,
    hasMore: enabled && current.visibleCount < visibleMetrics.length,
    selectGroups: (groups: string[]) =>
      update(state => ({
        ...state,
        selectedGroups: names.filter(name => groups.includes(name)),
        visibleCount: historyChartPageSize
      })),
    collapseGroups: (groups: string[]) =>
      update(state => ({
        ...state,
        collapsedGroups: names.filter(name => groups.includes(name)),
        visibleCount: historyChartPageSize
      })),
    ...historyActions(metrics, enabled, update)
  };
}

function historyEvidence(
  metrics: MonitorMetricOption[],
  state: HistorySelectionState,
  defaultHistory: MonitorMetricHistory,
  defaultInterval: boolean,
  enabled: boolean,
  focusedMetricKey?: string
) {
  const project = (metric: MonitorMetricOption) => ({
    metric,
    history: state.ranges[metric.key] ?? defaultHistory,
    interval: state.intervals[metric.key] ?? defaultInterval
  });
  const selected = state.selectedGroups;
  const available = metrics.filter(
    metric => (!selected || selected.includes(metric.group)) && !state.collapsedGroups.includes(metric.group)
  );
  return {
    visible: enabled ? available.slice(0, state.visibleCount).map(project) : [],
    requests: enabled
      ? metrics
          .filter(
            metric =>
              state.activeKeys.has(metric.key) &&
              (metric.key === focusedMetricKey || available.some(item => item.key === metric.key))
          )
          .map(project)
      : []
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
      if (accepts(metricKey))
        update(state =>
          state.activeKeys.has(metricKey) ? state : { ...state, activeKeys: new Set(state.activeKeys).add(metricKey) }
        );
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
  return {
    sourceKey,
    visibleCount: historyChartPageSize,
    activeKeys: new Set(),
    ranges: {},
    intervals: {},
    selectedGroups: null,
    collapsedGroups: []
  };
}
