/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { Monitor, MonitorDetailMetric } from '../model/monitor-contract';
import {
  monitorRealtimeGroups,
  monitorRealtimeRows,
  type MonitorDetailRefreshControl,
  type MonitorMetricWorkbenchController
} from '../model/monitor-detail-model';
import { metricEvidence, realtimeGroupFavoriteEvidence } from './monitor-metric-query-evidence';
import { monitorMetricWorkbenchEvidence } from './monitor-metric-workbench-evidence';
import {
  useMonitorFavoriteMutation,
  type MonitorMetricNotifications as Notifications
} from './use-monitor-favorite-mutation';
import { buildMonitorMetricWorkbenchResult } from './monitor-metric-workbench-result';
import { useMonitorMetricData } from './use-monitor-metric-data';
import { useMonitorMetricSelection } from './use-monitor-metric-selection';

type MonitorMetricWorkbenchOptions = {
  notifications?: Notifications;
  refreshDetail: () => void;
  refreshControl: MonitorDetailRefreshControl;
};

const realtimeGroupPageSize = 10;

export function useMonitorMetricWorkbenchController(
  monitor: Monitor | undefined,
  embedded: MonitorDetailMetric[],
  options: MonitorMetricWorkbenchOptions
): MonitorMetricWorkbenchController {
  const { t } = useTranslation();
  const { message: appMessage } = App.useApp();
  const queryClient = useQueryClient();
  const { catalog, definitions, history, metric, metricKey, urlActions } = useMonitorMetricSelection(monitor, embedded);
  const realtimeSelection = useRealtimeGroupSelection(monitor?.id, definitions);
  const queries = useMonitorMetricData({
    monitor,
    metric,
    realtimeGroups: realtimeSelection.visible,
    metricKey,
    history,
    refreshSeconds: options.refreshControl.refreshSeconds
  });
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
  const actions = buildWorkbenchActions({
    monitor,
    metric,
    favorite,
    realtimeGroups,
    queries,
    favoriteMutation,
    realtimeSelection,
    historySupported,
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
  realtimeSelection: ReturnType<typeof useRealtimeGroupSelection>;
  historySupported: boolean;
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
    refresh: () => {
      input.refreshDetail();
      refreshMonitorMetricQueries(
        input.queries,
        Boolean(input.monitor && (input.metric || input.realtimeGroups.length > 0)),
        input.metric?.group,
        input.historySupported
      );
    }
  } satisfies Pick<
    MonitorMetricWorkbenchController['actions'],
    'toggleFavorite' | 'toggleRealtimeFavorite' | 'loadMoreRealtimeGroups' | 'refresh'
  >;
}

function refreshMonitorMetricQueries(
  queries: ReturnType<typeof useMonitorMetricData>,
  canRefresh: boolean,
  selectedGroup: string | undefined,
  historySupported: boolean
) {
  // Refresh is one operator action, so do not issue a partial request set under incomplete context.
  if (!canRefresh) return;
  void queries.favorites.refetch();
  if (selectedGroup && !queries.realtimeGroups.some(item => item.group === selectedGroup)) {
    void queries.realtime.refetch();
  }
  for (const group of queries.realtimeGroups) void group.query.refetch();
  if (selectedGroup && historySupported) void queries.historical.refetch();
}

function useRealtimeGroupSelection(monitorId: number | undefined, definitions: MonitorDetailMetric[]) {
  const [visibleCount, setVisibleCount] = useState(realtimeGroupPageSize);
  const groups = monitorRealtimeGroups(definitions);
  useEffect(() => setVisibleCount(realtimeGroupPageSize), [monitorId]);
  return {
    visible: groups.slice(0, visibleCount),
    hasMore: visibleCount < groups.length,
    loadMore: () => setVisibleCount(count => Math.min(count + realtimeGroupPageSize, groups.length))
  };
}
