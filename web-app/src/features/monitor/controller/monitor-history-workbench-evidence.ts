/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import {
  monitorHistorySeries,
  monitorMetricHistoryUsesInterval,
  type MonitorMetricWorkbenchController
} from '../model/monitor-detail-model';
import { metricEvidence } from './monitor-metric-query-evidence';
import type { useMonitorHistorySelection } from './use-monitor-history-selection';
import type { useMonitorMetricData } from './use-monitor-metric-data';

export function buildHistoryChartEvidence(
  selection: ReturnType<typeof useMonitorHistorySelection>,
  queries: ReturnType<typeof useMonitorMetricData>
) {
  return selection.visible.map(item => buildHistoryChart(item.metric, item.history, queries));
}

export function buildSelectedHistoryChart(
  metric: Parameters<typeof useMonitorMetricData>[0]['metric'],
  selection: ReturnType<typeof useMonitorHistorySelection>,
  queries: ReturnType<typeof useMonitorMetricData>
): MonitorMetricWorkbenchController['state']['selectedHistoryChart'] {
  if (!metric || metric.historySupported === false) return undefined;
  return buildHistoryChart(metric, selection.historyFor(metric.key), queries);
}

function buildHistoryChart(
  metric: NonNullable<Parameters<typeof useMonitorMetricData>[0]['metric']>,
  history: ReturnType<typeof useMonitorHistorySelection>['visible'][number]['history'],
  queries: ReturnType<typeof useMonitorMetricData>
) {
  const query = queries.historyCharts.find(candidate => candidate.metric.key === metric.key)?.query;
  return {
    metric,
    history,
    result: query
      ? metricEvidence(query, data => monitorHistorySeries(data, monitorMetricHistoryUsesInterval(history)))
      : { kind: 'loading' as const, rows: [] }
  };
}
