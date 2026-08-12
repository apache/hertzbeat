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
import { buildWorkbenchActions } from './monitor-metric-workbench-actions';
import { useMonitorMetricData } from './use-monitor-metric-data';
import { useMonitorMetricLayoutController } from './use-monitor-metric-layout-controller';
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
  return composeMonitorMetricWorkbench(useMonitorMetricContext(monitor, embedded, options), options.refreshControl);
}

function useMonitorMetricContext(
  monitor: Monitor | undefined,
  embedded: MonitorDetailMetric[],
  options: MonitorMetricWorkbenchOptions
) {
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
  const layout = useMonitorMetricLayoutController(monitorLayoutApplication(monitor), realtimeSelection.names);
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
  const sources = { catalog, history, metric, metricKey, urlActions, queries, realtimeSelection, historySelection };
  const evidence = { favorite, favoriteCollection, historical, historySupported, realtime };
  return {
    ...sources,
    ...evidence,
    monitor,
    favoriteMutation,
    realtimeGroups,
    layout,
    historyCharts,
    selectedHistoryChart,
    actions
  };
}

function composeMonitorMetricWorkbench(
  context: ReturnType<typeof useMonitorMetricContext>,
  refreshControl: MonitorDetailRefreshControl
) {
  return buildMonitorMetricWorkbenchResult({
    catalog: context.catalog,
    metricKey: context.metricKey,
    history: context.history,
    historySupported: context.historySupported,
    favorite: context.favorite,
    favoriteCollection: context.favoriteCollection,
    favoriteBusy: context.favoriteMutation.busyMetricKey === context.metric?.group,
    realtimeGroupNames: context.realtimeSelection.names,
    realtimeGroups: context.realtimeGroups,
    hasMoreRealtimeGroups: context.realtimeSelection.hasMore,
    historyAvailability: context.historySelection.availability,
    historyCharts: context.historyCharts,
    selectedHistoryChart: context.selectedHistoryChart,
    hasMoreHistoryCharts: context.historySelection.hasMore,
    realtime: context.realtime,
    historical: context.historical,
    layout: context.layout.state,
    layoutActions: context.layout.actions,
    refreshControl,
    urlActions: context.urlActions,
    ...context.actions
  });
}

function monitorLayoutApplication(monitor: Monitor | undefined) {
  return monitor?.scrape && monitor.scrape !== 'static' ? monitor.scrape : monitor?.app;
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
