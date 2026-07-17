/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

import { useSharedTimeOptional } from '@/shared/time';

import {
  classifyMonitorMetricReadError, loadFavoriteMetrics, loadHistoryMetric, loadMonitorMetricCatalog,
  loadRealtimeMetric, updateFavoriteMetric, type Monitor, type MonitorDetailMetric,
} from '../api/monitor-api';
import {
  monitorHistoryRows, monitorMetricHistoryRanges, monitorMetricOptions, monitorRealtimeRows,
  parseMonitorMetricHistory, type MonitorMetricCatalogEvidence, type MonitorMetricFavoriteEvidence, type MonitorMetricHistory,
  type MonitorMetricRowsEvidence, type MonitorMetricWorkbenchController
} from '../model/monitor-detail-model';

export function useMonitorMetricWorkbenchController(monitor: Monitor | undefined,
  embedded: MonitorDetailMetric[], notificationOverride?: Notifications): MonitorMetricWorkbenchController {
  const { t } = useTranslation();
  const { message: appMessage } = App.useApp();
  const message = notificationOverride ?? appMessage;
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const sharedTime = useSharedTimeOptional();
  const sharedTimeKey = monitorSharedTimeKey(sharedTime);
  const source = monitorSource(monitor);
  const catalogQuery = useQuery({
    queryKey: ['monitor-metric-catalog', source.id, source.app, source.scrape],
    queryFn: ({ signal }) => loadMonitorMetricCatalog(monitor!, signal),
    enabled: Boolean(monitor)
  });
  const catalog = catalogEvidence(catalogQuery, embedded);
  const requestedMetric = params.get('metric') ?? '';
  const requestedHistory = params.get('history');
  const history = parseMonitorMetricHistory(requestedHistory);
  const metricKey = selectedMetricKey(catalog, requestedMetric);
  const metric = catalog.options.find(option => option.key === metricKey);

  useCanonicalMetricParams({ monitor, catalog, requestedHistory, requestedMetric, metricKey, history, params, setParams });

  const favoritesQuery = useQuery({
    queryKey: ['monitor-favorites', source.id],
    queryFn: ({ signal }) => loadFavoriteMetrics(monitor!.id, signal),
    enabled: Boolean(monitor)
  });
  const favorite = favoriteEvidence(favoritesQuery, metricKey);
  const realtimeQuery = useQuery({
    queryKey: ['monitor-realtime', source.id, metric?.group, metric?.field, ...sharedTimeKey],
    queryFn: ({ signal }) => loadRealtimeMetric(monitor!.id, metric!, signal),
    enabled: Boolean(monitor && metric),
    refetchInterval: 10_000
  });
  const historicalQuery = useQuery({
    queryKey: ['monitor-history', source.id, metricKey, history, ...sharedTimeKey],
    queryFn: ({ signal }) => loadHistoryMetric(monitor!, metric!, history, signal),
    enabled: Boolean(monitor && metric)
  });
  const realtime = metricEvidence(realtimeQuery, data => monitorRealtimeRows(data, metric!));
  const historical = metricEvidence(historicalQuery, monitorHistoryRows);
  const favoriteMutation = useFavoriteMutation({ monitorId: source.id, metricKey, favorite, message, queryClient, t });
  const urlActions = useMetricUrlActions({ catalog, history, metricKey, params, setParams });
  return {
    state: { catalog, metricKey, history, favorite, favoriteBusy: favoriteMutation.busy, realtime, historical },
    actions: {
      setMetric: urlActions.setMetric,
      setHistory: urlActions.setHistory,
      toggleFavorite: favoriteMutation.toggle,
      refresh: () => { void realtimeQuery.refetch(); void historicalQuery.refetch(); }
    }
  };
}

function monitorSharedTimeKey(time: ReturnType<typeof useSharedTimeOptional>) {
  return time ? [time.window, time.refreshRevision] as const : [undefined, 0] as const;
}

type Notifications = { success: (text: string) => unknown; error: (text: string) => unknown };
type QueryEvidence<T> = { isPending: boolean; isError: boolean; error: unknown; data: T | undefined };

function monitorSource(monitor: Monitor | undefined) {
  return monitor ? { id: monitor.id, app: monitor.app, scrape: monitor.scrape } : {};
}

function selectedMetricKey(catalog: MonitorMetricCatalogEvidence, requested: string) {
  if (catalog.options.some(option => option.key === requested)) return requested;
  return catalog.options[0]?.key ?? '';
}

function catalogEvidence(query: QueryEvidence<{ metrics: MonitorDetailMetric[] }>,
  embedded: MonitorDetailMetric[]): MonitorMetricCatalogEvidence {
  if (query.isPending) return { kind: 'loading', options: [] };
  if (query.isError) {
    const references = embedded.map(item => item.name);
    return references.length > 0 ? { kind: 'fallback', options: [], references }
      : { kind: classifyMonitorMetricReadError(query.error), options: [] };
  }
  const options = monitorMetricOptions(query.data!.metrics);
  return options.length > 0 ? { kind: 'ready', options } : { kind: 'empty', options: [] };
}

function favoriteEvidence(query: QueryEvidence<string[]>, metricKey: string): MonitorMetricFavoriteEvidence {
  if (query.isPending) return { kind: 'loading' };
  if (query.isError) return { kind: classifyMonitorMetricReadError(query.error) };
  return { kind: 'ready', value: Boolean(metricKey && query.data!.includes(metricKey)) };
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
  const setMetric = useCallback((value: string) => {
    if (!catalog.options.some(option => option.key === value)) return;
    const next = new URLSearchParams(params);
    next.set('metric', value);
    next.set('history', history);
    setParams(next);
  }, [catalog.options, history, params, setParams]);
  const setHistory = useCallback((value: MonitorMetricHistory) => {
    const next = new URLSearchParams(params);
    next.set('history', value);
    if (metricKey) next.set('metric', metricKey);
    setParams(next);
  }, [metricKey, params, setParams]);
  return { setMetric, setHistory };
}

function useFavoriteMutation(input: {
  monitorId: number | undefined;
  metricKey: string;
  favorite: MonitorMetricFavoriteEvidence;
  message: Notifications;
  queryClient: ReturnType<typeof useQueryClient>;
  t: (key: string) => string;
}) {
  const { monitorId, metricKey, favorite, message, queryClient, t } = input;
  const [busyOperation, setBusyOperation] = useState<{ monitorId: number; token: number }>();
  const lockedOperation = useRef<{ monitorId: number; token: number } | undefined>(undefined);
  const operationCounter = useRef(0);
  const currentSource = useRef(monitorId);
  const reread = useRef<AbortController | undefined>(undefined);
  useEffect(() => {
    currentSource.current = monitorId;
    reread.current?.abort();
  }, [monitorId]);
  const toggle = useCallback(async () => {
    if (!monitorId || !metricKey || favorite.kind !== 'ready'
      || operationIsLocked(lockedOperation.current, monitorId)) return;
    const operation = { monitorId, token: ++operationCounter.current };
    lockedOperation.current = operation;
    setBusyOperation(operation);
    const desired = !favorite.value;
    try {
      await updateFavoriteMetric(monitorId, metricKey, desired);
      if (currentSource.current !== monitorId) return;
      reread.current = new AbortController();
      const canonical = await loadFavoriteMetrics(monitorId, reread.current.signal);
      if (currentSource.current !== monitorId) return;
      if (canonical.includes(metricKey) !== desired) throw new Error('Favorite metrics did not converge');
      queryClient.setQueryData(['monitor-favorites', monitorId], canonical);
      void message.success(t('monitorMetrics.favoriteSaved'));
    } catch (error) {
      if (currentSource.current !== monitorId) return;
      void message.error(t('monitorMetrics.favoriteFailed'));
      throw error;
    } finally {
      if (lockedOperation.current?.token === operation.token) {
        lockedOperation.current = undefined;
        reread.current = undefined;
      }
      setBusyOperation(current => current?.token === operation.token ? undefined : current);
    }
  }, [favorite, message, metricKey, monitorId, queryClient, t]);
  return { busy: busyOperation?.monitorId === monitorId, toggle };
}

function operationIsLocked(operation: { monitorId: number } | undefined, monitorId: number) {
  return operation?.monitorId === monitorId;
}

function metricEvidence<T, R>(query: {
  isPending: boolean; isError: boolean; error: unknown; data: T | undefined;
}, rows: (data: T) => R[]): MonitorMetricRowsEvidence<R> {
  if (query.isPending) return { kind: 'loading', rows: [] };
  if (query.isError) return { kind: classifyMonitorMetricReadError(query.error), rows: [] };
  if (query.data === undefined) return { kind: 'empty', rows: [] };
  const result = rows(query.data);
  return result.length > 0 ? { kind: 'ready', rows: result } : { kind: 'empty', rows: [] };
}
