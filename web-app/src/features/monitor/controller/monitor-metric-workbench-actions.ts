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

import type { Monitor } from '../model/monitor-contract';
import type { MonitorMetricWorkbenchController } from '../model/monitor-detail-model';
import type { useMonitorFavoriteMutation } from './use-monitor-favorite-mutation';
import type { useMonitorInvestigation } from './use-monitor-investigation';
import type { useMonitorMetricData } from './use-monitor-metric-data';
import type { useMonitorMetricSources } from './use-monitor-metric-sources';

export function buildWorkbenchActions(input: {
  monitor: Monitor | undefined;
  metric: Parameters<typeof useMonitorMetricData>[0]['metric'];
  favorite: MonitorMetricWorkbenchController['state']['favorite'];
  realtimeGroups: MonitorMetricWorkbenchController['state']['realtimeGroups'];
  queries: ReturnType<typeof useMonitorMetricData>;
  favoriteMutation: ReturnType<typeof useMonitorFavoriteMutation>;
  realtimeSelection: ReturnType<typeof useMonitorMetricSources>['realtimeSelection'];
  historySelection: ReturnType<typeof useMonitorMetricSources>['historySelection'];
  refreshDetail: () => void;
  investigation: ReturnType<typeof useMonitorInvestigation>;
}) {
  const selectedGroup = input.metric?.group ?? '';
  return {
    toggleFavorite: () => input.favoriteMutation.toggle(selectedGroup, input.favorite),
    toggleRealtimeFavorite: (group: string) => {
      const current = input.realtimeGroups.find(item => item.group === group);
      return current ? input.favoriteMutation.toggle(group, current.favorite) : Promise.resolve();
    },
    loadMoreRealtimeGroups: input.realtimeSelection.loadMore,
    revealRealtimeGroup: input.realtimeSelection.reveal,
    activateHistoryChart: input.historySelection.activate,
    setHistoryChartRange: input.historySelection.setRange,
    setHistoryChartMode: input.historySelection.setMode,
    refreshHistoryChart: (metricKey: string) => {
      const chart = input.queries.historyCharts.find(item => item.metric.key === metricKey);
      if (chart) void chart.query.refetch();
      else input.historySelection.activate(metricKey);
    },
    loadMoreHistoryCharts: input.historySelection.loadMore,
    refresh: () => {
      input.refreshDetail();
      void input.investigation.refetch();
      refreshMonitorMetricQueries(
        input.queries,
        Boolean(input.monitor && (input.metric || input.realtimeGroups.length > 0)),
        input.metric?.group
      );
    }
  } satisfies Pick<
    MonitorMetricWorkbenchController['actions'],
    | 'toggleFavorite'
    | 'toggleRealtimeFavorite'
    | 'revealRealtimeGroup'
    | 'loadMoreRealtimeGroups'
    | 'activateHistoryChart'
    | 'setHistoryChartRange'
    | 'setHistoryChartMode'
    | 'refreshHistoryChart'
    | 'loadMoreHistoryCharts'
    | 'refresh'
  >;
}

function refreshMonitorMetricQueries(
  queries: ReturnType<typeof useMonitorMetricData>,
  canRefresh: boolean,
  selectedGroup: string | undefined
) {
  if (!canRefresh) return;
  void queries.favorites.refetch();
  if (selectedGroup && !queries.realtimeGroups.some(item => item.group === selectedGroup)) {
    void queries.realtime.refetch();
  }
  for (const group of queries.realtimeGroups) void group.query.refetch();
  for (const chart of queries.historyCharts) void chart.query.refetch();
}
