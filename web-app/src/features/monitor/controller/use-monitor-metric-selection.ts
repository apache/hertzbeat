/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { skipToken, useQuery } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

import { loadMonitorMetricCatalog } from '../api/monitor-api';
import type { Monitor, MonitorDetailMetric } from '../model/monitor-contract';
import {
  monitorMetricHistoryRanges,
  parseMonitorMetricHistory,
  type MonitorMetricCatalogEvidence,
  type MonitorMetricHistory,
  type MonitorMetricWorkbenchController
} from '../model/monitor-detail-model';
import { catalogEvidence } from './monitor-metric-query-evidence';
import { monitorQueryKeys } from './monitor-query-keys';

export function useMonitorMetricSelection(monitor: Monitor | undefined, embedded: MonitorDetailMetric[]) {
  const [params, setParams] = useSearchParams();
  const { catalog, definitions } = useMonitorMetricCatalog(monitor, embedded);
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
  const urlActions = useMetricUrlActions({ catalog, history, metricKey, params, setParams });
  return { catalog, definitions, history, metric, metricKey, urlActions };
}

function useMonitorMetricCatalog(monitor: Monitor | undefined, embedded: MonitorDetailMetric[]) {
  const query = useQuery({
    queryKey: monitorQueryKeys.metricCatalog(monitor?.id, monitor?.app, monitor?.scrape),
    queryFn: monitor ? ({ signal }) => loadMonitorMetricCatalog(monitor, signal) : skipToken
  });
  return {
    catalog: catalogEvidence(query, embedded),
    definitions: query.data?.metrics ?? embedded
  };
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
  return {
    setMetric,
    setHistory
  } satisfies Pick<MonitorMetricWorkbenchController['actions'], 'setMetric' | 'setHistory'>;
}
