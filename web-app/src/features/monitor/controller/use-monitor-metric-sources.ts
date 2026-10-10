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
    names: groups.map(group => group.group),
    visible: groups.slice(0, visibleCount),
    hasMore: visibleCount < groups.length,
    reveal: (group: string) => {
      const index = groups.findIndex(candidate => candidate.group === group);
      if (index < 0) return;
      setSelection(current => ({
        sourceKey,
        visibleCount: Math.max(
          current.sourceKey === sourceKey ? current.visibleCount : realtimeGroupPageSize,
          index + 1
        )
      }));
    },
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
