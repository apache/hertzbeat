/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import type {
  MonitorDetailRefreshControl,
  MonitorMetricHistory,
  MonitorMetricWorkbenchController
} from '../model/monitor-detail-model';

type MetricUrlActions = Pick<MonitorMetricWorkbenchController['actions'], 'setMetric' | 'setHistory'>;

export function buildMonitorMetricWorkbenchResult(input: {
  catalog: MonitorMetricWorkbenchController['state']['catalog'];
  metricKey: string;
  history: MonitorMetricHistory;
  historySupported: boolean;
  favorite: MonitorMetricWorkbenchController['state']['favorite'];
  favoriteCollection: MonitorMetricWorkbenchController['state']['favoriteCollection'];
  favoriteBusy: boolean;
  realtimeGroups: MonitorMetricWorkbenchController['state']['realtimeGroups'];
  hasMoreRealtimeGroups: boolean;
  historyAvailability: MonitorMetricWorkbenchController['state']['historyAvailability'];
  historyCharts: MonitorMetricWorkbenchController['state']['historyCharts'];
  selectedHistoryChart?: MonitorMetricWorkbenchController['state']['selectedHistoryChart'];
  hasMoreHistoryCharts: boolean;
  realtime: MonitorMetricWorkbenchController['state']['realtime'];
  historical: MonitorMetricWorkbenchController['state']['historical'];
  refreshControl: MonitorDetailRefreshControl;
  urlActions: MetricUrlActions;
  toggleFavorite: MonitorMetricWorkbenchController['actions']['toggleFavorite'];
  toggleRealtimeFavorite: MonitorMetricWorkbenchController['actions']['toggleRealtimeFavorite'];
  loadMoreRealtimeGroups: MonitorMetricWorkbenchController['actions']['loadMoreRealtimeGroups'];
  activateHistoryChart: MonitorMetricWorkbenchController['actions']['activateHistoryChart'];
  setHistoryChartRange: MonitorMetricWorkbenchController['actions']['setHistoryChartRange'];
  refreshHistoryChart: MonitorMetricWorkbenchController['actions']['refreshHistoryChart'];
  loadMoreHistoryCharts: MonitorMetricWorkbenchController['actions']['loadMoreHistoryCharts'];
  refresh: () => void;
}): MonitorMetricWorkbenchController {
  return {
    state: {
      catalog: input.catalog,
      metricKey: input.metricKey,
      history: input.history,
      historySupported: input.historySupported,
      refreshSeconds: input.refreshControl.refreshSeconds,
      favorite: input.favorite,
      favoriteCollection: input.favoriteCollection,
      favoriteBusy: input.favoriteBusy,
      realtimeGroups: input.realtimeGroups,
      hasMoreRealtimeGroups: input.hasMoreRealtimeGroups,
      historyAvailability: input.historyAvailability,
      historyCharts: input.historyCharts,
      selectedHistoryChart: input.selectedHistoryChart,
      hasMoreHistoryCharts: input.hasMoreHistoryCharts,
      realtime: input.realtime,
      historical: input.historical
    },
    actions: {
      ...input.urlActions,
      setRefreshSeconds: input.refreshControl.setRefreshSeconds,
      toggleFavorite: input.toggleFavorite,
      toggleRealtimeFavorite: input.toggleRealtimeFavorite,
      loadMoreRealtimeGroups: input.loadMoreRealtimeGroups,
      activateHistoryChart: input.activateHistoryChart,
      setHistoryChartRange: input.setHistoryChartRange,
      refreshHistoryChart: input.refreshHistoryChart,
      loadMoreHistoryCharts: input.loadMoreHistoryCharts,
      refresh: input.refresh
    }
  };
}
