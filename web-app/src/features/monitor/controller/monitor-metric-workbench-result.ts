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

import type {
  MonitorDetailRefreshControl,
  MonitorMetricHistory,
  MonitorMetricWorkbenchController
} from '../model/monitor-detail-model';
import type { SignalKind } from '@/shared/query-context';

type MetricUrlActions = Pick<MonitorMetricWorkbenchController['actions'], 'setMetric' | 'setHistory'>;

type MonitorMetricWorkbenchResultInput = {
  catalog: MonitorMetricWorkbenchController['state']['catalog'];
  metricKey: string;
  history: MonitorMetricHistory;
  historySupported: boolean;
  favorite: MonitorMetricWorkbenchController['state']['favorite'];
  favoriteCollection: MonitorMetricWorkbenchController['state']['favoriteCollection'];
  favoriteBusy: boolean;
  realtimeGroupNames: string[];
  realtimeGroups: MonitorMetricWorkbenchController['state']['realtimeGroups'];
  hasMoreRealtimeGroups: boolean;
  historyAvailability: MonitorMetricWorkbenchController['state']['historyAvailability'];
  historyCharts: MonitorMetricWorkbenchController['state']['historyCharts'];
  selectedHistoryChart?: MonitorMetricWorkbenchController['state']['selectedHistoryChart'];
  investigation: MonitorMetricWorkbenchController['state']['investigation'];
  investigationSignals: SignalKind[];
  hasMoreHistoryCharts: boolean;
  realtime: MonitorMetricWorkbenchController['state']['realtime'];
  historical: MonitorMetricWorkbenchController['state']['historical'];
  layout: MonitorMetricWorkbenchController['state']['layout'];
  layoutActions: MonitorMetricWorkbenchController['actions']['layout'];
  refreshControl: MonitorDetailRefreshControl;
  urlActions: MetricUrlActions;
  toggleFavorite: MonitorMetricWorkbenchController['actions']['toggleFavorite'];
  toggleRealtimeFavorite: MonitorMetricWorkbenchController['actions']['toggleRealtimeFavorite'];
  revealRealtimeGroup: MonitorMetricWorkbenchController['actions']['revealRealtimeGroup'];
  loadMoreRealtimeGroups: MonitorMetricWorkbenchController['actions']['loadMoreRealtimeGroups'];
  activateHistoryChart: MonitorMetricWorkbenchController['actions']['activateHistoryChart'];
  setHistoryChartRange: MonitorMetricWorkbenchController['actions']['setHistoryChartRange'];
  setHistoryChartMode: MonitorMetricWorkbenchController['actions']['setHistoryChartMode'];
  refreshHistoryChart: MonitorMetricWorkbenchController['actions']['refreshHistoryChart'];
  loadMoreHistoryCharts: MonitorMetricWorkbenchController['actions']['loadMoreHistoryCharts'];
  openInvestigationSignal: MonitorMetricWorkbenchController['actions']['openInvestigationSignal'];
  refresh: () => void;
};

export function buildMonitorMetricWorkbenchResult(
  input: MonitorMetricWorkbenchResultInput
): MonitorMetricWorkbenchController {
  return { state: buildWorkbenchState(input), actions: buildWorkbenchActions(input) };
}

function buildWorkbenchState(input: MonitorMetricWorkbenchResultInput): MonitorMetricWorkbenchController['state'] {
  return {
    catalog: input.catalog,
    metricKey: input.metricKey,
    history: input.history,
    historySupported: input.historySupported,
    refreshSeconds: input.refreshControl.refreshSeconds,
    favorite: input.favorite,
    favoriteCollection: input.favoriteCollection,
    favoriteBusy: input.favoriteBusy,
    realtimeGroupNames: input.realtimeGroupNames,
    realtimeGroups: input.realtimeGroups,
    hasMoreRealtimeGroups: input.hasMoreRealtimeGroups,
    historyAvailability: input.historyAvailability,
    historyCharts: input.historyCharts,
    selectedHistoryChart: input.selectedHistoryChart,
    investigation: input.investigation,
    investigationSignals: input.investigationSignals,
    hasMoreHistoryCharts: input.hasMoreHistoryCharts,
    realtime: input.realtime,
    historical: input.historical,
    layout: input.layout
  };
}

function buildWorkbenchActions(input: MonitorMetricWorkbenchResultInput): MonitorMetricWorkbenchController['actions'] {
  return {
    ...input.urlActions,
    setRefreshSeconds: input.refreshControl.setRefreshSeconds,
    toggleFavorite: input.toggleFavorite,
    toggleRealtimeFavorite: input.toggleRealtimeFavorite,
    revealRealtimeGroup: input.revealRealtimeGroup,
    loadMoreRealtimeGroups: input.loadMoreRealtimeGroups,
    activateHistoryChart: input.activateHistoryChart,
    setHistoryChartRange: input.setHistoryChartRange,
    setHistoryChartMode: input.setHistoryChartMode,
    refreshHistoryChart: input.refreshHistoryChart,
    loadMoreHistoryCharts: input.loadMoreHistoryCharts,
    openInvestigationSignal: input.openInvestigationSignal,
    refresh: input.refresh,
    layout: input.layoutActions
  };
}
