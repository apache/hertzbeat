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
  favorite: MonitorMetricWorkbenchController['state']['favorite'];
  favoriteCollection: MonitorMetricWorkbenchController['state']['favoriteCollection'];
  favoriteBusy: boolean;
  realtime: MonitorMetricWorkbenchController['state']['realtime'];
  historical: MonitorMetricWorkbenchController['state']['historical'];
  refreshControl: MonitorDetailRefreshControl;
  urlActions: MetricUrlActions;
  toggleFavorite: MonitorMetricWorkbenchController['actions']['toggleFavorite'];
  refresh: () => void;
}): MonitorMetricWorkbenchController {
  return {
    state: {
      catalog: input.catalog,
      metricKey: input.metricKey,
      history: input.history,
      refreshSeconds: input.refreshControl.refreshSeconds,
      favorite: input.favorite,
      favoriteCollection: input.favoriteCollection,
      favoriteBusy: input.favoriteBusy,
      realtime: input.realtime,
      historical: input.historical
    },
    actions: {
      ...input.urlActions,
      setRefreshSeconds: input.refreshControl.setRefreshSeconds,
      toggleFavorite: input.toggleFavorite,
      refresh: input.refresh
    }
  };
}
