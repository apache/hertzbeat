/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

import { useSharedTimeOptional } from '@/shared/time';

import { loadMonitorMetricCatalog } from '../api/monitor-api';
import type { Monitor, MonitorDetailMetric } from '../model/monitor-contract';
import {
  monitorHistoryRows,
  monitorMetricHistoryRanges,
  monitorRealtimeRows,
  parseMonitorMetricHistory,
  type MonitorMetricCatalogEvidence,
  type MonitorMetricHistory,
  type MonitorMetricWorkbenchController
} from '../model/monitor-detail-model';
import { catalogEvidence, favoriteEvidence, metricEvidence } from './monitor-metric-query-evidence';
import { monitorQueryKeys } from './monitor-query-keys';
import {
  useMonitorFavoriteMutation,
  type MonitorMetricNotifications as Notifications
} from './use-monitor-favorite-mutation';
import { useMonitorMetricData } from './use-monitor-metric-data';

export function useMonitorMetricWorkbenchController(
  monitor: Monitor | undefined,
  embedded: MonitorDetailMetric[],
  notificationOverride?: Notifications
): MonitorMetricWorkbenchController {
  const { t } = useTranslation();
  const { message: appMessage } = App.useApp();
  const message = notificationOverride ?? appMessage;
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const sharedTime = useSharedTimeOptional();
  const source = monitorSource(monitor);
  const catalog = useMonitorMetricCatalog(monitor, embedded, source);
  const requestedMetric = params.get('metric') ?? '';
  const requestedHistory = params.get('history');
  const history = parseMonitorMetricHistory(requestedHistory);
  const metricKey = selectedMetricKey(catalog, requestedMetric);
  const metric = catalog.options.find(option => option.key === metricKey);

  useCanonicalMetricParams({
    monitor,
    catalog,
    requestedHistory,
    requestedMetric,
    metricKey,
    history,
    params,
    setParams
  });

  const queries = useMonitorMetricData({ monitor, metric, metricKey, history, sharedTime });
  const favoritesQuery = queries.favorites;
  const favorite = favoriteEvidence(favoritesQuery, metricKey);
  const realtimeQuery = queries.realtime;
  const historicalQuery = queries.historical;
  const realtime = metricEvidence(realtimeQuery, data => monitorRealtimeRows(data, metric!));
  const historical = metricEvidence(historicalQuery, monitorHistoryRows);
  const favoriteMutation = useMonitorFavoriteMutation({
    monitorId: source.id,
    metricKey,
    favorite,
    canonicalFavorites: favoritesQuery.data,
    message,
    queryClient,
    t
  });
  const urlActions = useMetricUrlActions({ catalog, history, metricKey, params, setParams });
  return buildMetricWorkbenchController({
    catalog,
    metricKey,
    history,
    favorite,
    favoriteMutation,
    realtime,
    historical,
    urlActions,
    refresh: () => refreshMonitorMetricQueries(queries)
  });
}

function refreshMonitorMetricQueries(queries: ReturnType<typeof useMonitorMetricData>) {
  void queries.favorites.refetch();
  void queries.realtime.refetch();
  void queries.historical.refetch();
}

function useMonitorMetricCatalog(
  monitor: Monitor | undefined,
  embedded: MonitorDetailMetric[],
  source: ReturnType<typeof monitorSource>
) {
  const query = useQuery({
    queryKey: monitorQueryKeys.metricCatalog(source.id, source.app, source.scrape),
    queryFn: ({ signal }) => loadMonitorMetricCatalog(monitor!, signal),
    enabled: Boolean(monitor)
  });
  return catalogEvidence(query, embedded);
}

function buildMetricWorkbenchController(input: {
  catalog: MonitorMetricWorkbenchController['state']['catalog'];
  metricKey: string;
  history: MonitorMetricHistory;
  favorite: MonitorMetricWorkbenchController['state']['favorite'];
  favoriteMutation: ReturnType<typeof useMonitorFavoriteMutation>;
  realtime: MonitorMetricWorkbenchController['state']['realtime'];
  historical: MonitorMetricWorkbenchController['state']['historical'];
  urlActions: ReturnType<typeof useMetricUrlActions>;
  refresh: () => void;
}): MonitorMetricWorkbenchController {
  const { catalog, metricKey, history, favorite, favoriteMutation, realtime, historical, urlActions, refresh } = input;
  return {
    state: { catalog, metricKey, history, favorite, favoriteBusy: favoriteMutation.busy, realtime, historical },
    actions: { ...urlActions, toggleFavorite: favoriteMutation.toggle, refresh }
  };
}

function monitorSource(monitor: Monitor | undefined) {
  return monitor ? { id: monitor.id, app: monitor.app, scrape: monitor.scrape } : {};
}

function selectedMetricKey(catalog: MonitorMetricCatalogEvidence, requested: string) {
  if (catalog.options.some(option => option.key === requested)) return requested;
  return catalog.options[0]?.key ?? '';
}

function useCanonicalMetricParams(input: {
  monitor: Monitor | undefined;
  catalog: MonitorMetricCatalogEvidence;
  requestedHistory: string | null;
  requestedMetric: string;
  metricKey: string;
  history: MonitorMetricHistory;
  params: URLSearchParams;
  setParams: ReturnType<typeof useSearchParams>[1];
}) {
  const { monitor, catalog, requestedHistory, requestedMetric, metricKey, history, params, setParams } = input;
  useEffect(() => {
    const unavailable = ['loading', 'fallback', 'unavailable', 'error'].includes(catalog.kind);
    if (!monitor || unavailable) return;
    const validHistory = monitorMetricHistoryRanges.includes(requestedHistory as MonitorMetricHistory);
    if (requestedMetric === metricKey && validHistory) return;
    const next = new URLSearchParams(params);
    if (metricKey) next.set('metric', metricKey);
    else next.delete('metric');
    next.set('history', history);
    setParams(next, { replace: true });
  }, [catalog.kind, history, metricKey, monitor, params, requestedHistory, requestedMetric, setParams]);
}

function useMetricUrlActions(input: {
  catalog: MonitorMetricCatalogEvidence;
  history: MonitorMetricHistory;
  metricKey: string;
  params: URLSearchParams;
  setParams: ReturnType<typeof useSearchParams>[1];
}) {
  const { catalog, history, metricKey, params, setParams } = input;
  const setMetric = useCallback(
    (value: string) => {
      if (!catalog.options.some(option => option.key === value)) return;
      const next = new URLSearchParams(params);
      next.set('metric', value);
      next.set('history', history);
      setParams(next);
    },
    [catalog.options, history, params, setParams]
  );
  const setHistory = useCallback(
    (value: MonitorMetricHistory) => {
      const next = new URLSearchParams(params);
      next.set('history', value);
      if (metricKey) next.set('metric', metricKey);
      setParams(next);
    },
    [metricKey, params, setParams]
  );
  return { setMetric, setHistory };
}
