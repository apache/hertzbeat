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

import { monitorHistorySeries, type MonitorMetricWorkbenchController } from '../model/monitor-detail-model';
import { metricEvidence } from './monitor-metric-query-evidence';
import type { useMonitorHistorySelection } from './use-monitor-history-selection';
import type { useMonitorMetricData } from './use-monitor-metric-data';

export function buildHistoryChartEvidence(
  selection: ReturnType<typeof useMonitorHistorySelection>,
  queries: ReturnType<typeof useMonitorMetricData>
) {
  return selection.visible.map(item => buildHistoryChart(item.metric, item.history, item.interval, queries));
}

export function buildSelectedHistoryChart(
  metric: Parameters<typeof useMonitorMetricData>[0]['metric'],
  selection: ReturnType<typeof useMonitorHistorySelection>,
  queries: ReturnType<typeof useMonitorMetricData>
): MonitorMetricWorkbenchController['state']['selectedHistoryChart'] {
  if (!metric || metric.historySupported === false) return undefined;
  return buildHistoryChart(metric, selection.historyFor(metric.key), selection.intervalFor(metric.key), queries);
}

function buildHistoryChart(
  metric: NonNullable<Parameters<typeof useMonitorMetricData>[0]['metric']>,
  history: ReturnType<typeof useMonitorHistorySelection>['visible'][number]['history'],
  interval: boolean,
  queries: ReturnType<typeof useMonitorMetricData>
) {
  const query = queries.historyCharts.find(candidate => candidate.metric.key === metric.key)?.query;
  return {
    metric,
    history,
    interval,
    result: query
      ? metricEvidence(query, data => monitorHistorySeries(data, interval))
      : { kind: 'loading' as const, rows: [] }
  };
}
