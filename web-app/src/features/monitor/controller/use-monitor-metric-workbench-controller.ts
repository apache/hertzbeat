/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import { useTranslation } from 'react-i18next';

import type { Monitor, MonitorDetailMetric } from '../model/monitor-contract';
import {
  monitorRealtimeRows,
  type MonitorDetailRefreshControl,
  type MonitorMetricWorkbenchController
} from '../model/monitor-detail-model';
import { metricEvidence, realtimeGroupFavoriteEvidence } from './monitor-metric-query-evidence';
import { buildHistoryChartEvidence, buildSelectedHistoryChart } from './monitor-history-workbench-evidence';
import { monitorMetricWorkbenchEvidence } from './monitor-metric-workbench-evidence';
import {
  useMonitorFavoriteMutation,
  type MonitorMetricNotifications as Notifications
} from './use-monitor-favorite-mutation';
import { buildMonitorMetricWorkbenchResult } from './monitor-metric-workbench-result';
import { useMonitorMetricData } from './use-monitor-metric-data';
import { useMonitorMetricSources } from './use-monitor-metric-sources';

type MonitorMetricWorkbenchOptions = {
  notifications?: Notifications;
  refreshDetail: () => void;
  refreshControl: MonitorDetailRefreshControl;
};

export function useMonitorMetricWorkbenchController(
  monitor: Monitor | undefined,
  embedded: MonitorDetailMetric[],
  options: MonitorMetricWorkbenchOptions
): MonitorMetricWorkbenchController {
  const { t } = useTranslation();
  const { message: appMessage } = App.useApp();
  const queryClient = useQueryClient();
  const { catalog, history, metric, metricKey, urlActions, realtimeSelection, historySelection, queries } =
    useMonitorMetricSources({ monitor, embedded, refreshSeconds: options.refreshControl.refreshSeconds });
  const { favorite, favoriteCollection, historical, historySupported, realtime } = monitorMetricWorkbenchEvidence(
    queries,
    metric,
    catalog
  );
  const favoriteMutation = useMonitorFavoriteMutation({
    monitorId: monitor?.id,
    canonicalFavorites: queries.favorites.data,
    message: options.notifications ?? appMessage,
    queryClient,
    t
  });
  const realtimeGroups = buildRealtimeGroupEvidence(queries, queries.favorites, favoriteMutation.busyMetricKey);
  const historyCharts = buildHistoryChartEvidence(historySelection, queries);
  const selectedHistoryChart = buildSelectedHistoryChart(metric, historySelection, queries);
  const actions = buildWorkbenchActions({
    monitor,
    metric,
    favorite,
    realtimeGroups,
    queries,
    favoriteMutation,
    realtimeSelection,
    historySelection,
    refreshDetail: options.refreshDetail
  });
  return buildMonitorMetricWorkbenchResult({
    catalog,
    metricKey,
    history,
    historySupported,
    favorite,
    favoriteCollection,
    favoriteBusy: favoriteMutation.busyMetricKey === (metric?.historySupported === false ? metric.group : metricKey),
    realtimeGroups,
    hasMoreRealtimeGroups: realtimeSelection.hasMore,
    historyAvailability: historySelection.availability,
    historyCharts,
    selectedHistoryChart,
    hasMoreHistoryCharts: historySelection.hasMore,
    realtime,
    historical,
    refreshControl: options.refreshControl,
    urlActions,
    ...actions
  });
}

function buildRealtimeGroupEvidence(
  queries: ReturnType<typeof useMonitorMetricData>,
  favorites: ReturnType<typeof useMonitorMetricData>['favorites'],
  busyMetricKey: string | undefined
) {
  return queries.realtimeGroups.map(({ group, query }) => ({
    group,
    favorite: realtimeGroupFavoriteEvidence(favorites, group),
    favoriteBusy: busyMetricKey === group,
    result: metricEvidence(query, data => monitorRealtimeRows(data))
  }));
}

function buildWorkbenchActions(input: {
  monitor: Monitor | undefined;
  metric: Parameters<typeof useMonitorMetricData>[0]['metric'];
  favorite: MonitorMetricWorkbenchController['state']['favorite'];
  realtimeGroups: MonitorMetricWorkbenchController['state']['realtimeGroups'];
  queries: ReturnType<typeof useMonitorMetricData>;
  favoriteMutation: ReturnType<typeof useMonitorFavoriteMutation>;
  realtimeSelection: ReturnType<typeof useMonitorMetricSources>['realtimeSelection'];
  historySelection: ReturnType<typeof useMonitorMetricSources>['historySelection'];
  refreshDetail: () => void;
}) {
  const selectedToken = input.metric?.historySupported === false ? input.metric.group : (input.metric?.key ?? '');
  return {
    toggleFavorite: () => input.favoriteMutation.toggle(selectedToken, input.favorite),
    toggleRealtimeFavorite: (group: string) => {
      const current = input.realtimeGroups.find(item => item.group === group);
      return current ? input.favoriteMutation.toggle(group, current.favorite) : Promise.resolve();
    },
    loadMoreRealtimeGroups: input.realtimeSelection.loadMore,
    activateHistoryChart: input.historySelection.activate,
    setHistoryChartRange: input.historySelection.setRange,
    refreshHistoryChart: (metricKey: string) => {
      const chart = input.queries.historyCharts.find(item => item.metric.key === metricKey);
      if (chart) void chart.query.refetch();
      else input.historySelection.activate(metricKey);
    },
    loadMoreHistoryCharts: input.historySelection.loadMore,
    refresh: () => {
      input.refreshDetail();
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
    | 'loadMoreRealtimeGroups'
    | 'activateHistoryChart'
    | 'setHistoryChartRange'
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
  // Refresh is one operator action, so do not issue a partial request set under incomplete context.
  if (!canRefresh) return;
  void queries.favorites.refetch();
  if (selectedGroup && !queries.realtimeGroups.some(item => item.group === selectedGroup)) {
    void queries.realtime.refetch();
  }
  for (const group of queries.realtimeGroups) void group.query.refetch();
  for (const chart of queries.historyCharts) void chart.query.refetch();
}
