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
  let historical: MonitorMetricWorkbenchController['state']['historical'];
  if (!historySupported) historical = { kind: 'unsupported', rows: [] };
  else if (queries.historical) historical = metricEvidence(queries.historical, monitorHistoryRows);
  else historical = { kind: 'loading', rows: [] };
  return { favorite, favoriteCollection, historical, historySupported, realtime };
}
