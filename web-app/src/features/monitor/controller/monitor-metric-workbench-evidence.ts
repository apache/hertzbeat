/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import type { MonitorMetricOption } from '../model/monitor-contract';
import {
  monitorHistoryRows,
  monitorRealtimeRows,
  type MonitorMetricCatalogEvidence,
  type MonitorMetricWorkbenchController
} from '../model/monitor-detail-model';
import { favoriteCollectionEvidence, favoriteEvidence, metricEvidence } from './monitor-metric-query-evidence';
import type { useMonitorMetricData } from './use-monitor-metric-data';

export function monitorMetricWorkbenchEvidence(
  queries: ReturnType<typeof useMonitorMetricData>,
  metric: MonitorMetricOption | undefined,
  catalog: MonitorMetricCatalogEvidence
) {
  const historySupported = metric?.historySupported !== false;
  const favorite = favoriteEvidence(queries.favorites, metric);
  const favoriteCollection = favoriteCollectionEvidence(queries.favorites, catalog.options);
  const realtime = metricEvidence(queries.realtime, data => (metric ? monitorRealtimeRows(data) : []));
  const historical: MonitorMetricWorkbenchController['state']['historical'] = historySupported
    ? metricEvidence(queries.historical, monitorHistoryRows)
    : { kind: 'unsupported', rows: [] };
  return { favorite, favoriteCollection, historical, historySupported, realtime };
}
