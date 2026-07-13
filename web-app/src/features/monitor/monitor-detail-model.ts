/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { Monitor, MonitorDetailMetric } from './monitor-api';

export type MonitorMetricOption = {
  key: string;
  group: string;
  field: string;
  unit?: string;
};

export function monitorMetricOptions(metrics: MonitorDetailMetric[]) {
  return metrics.flatMap(metric => {
    if (metric.visible === false) return [];
    return (metric.fields ?? []).flatMap(field => field.type === 0 && field.field ? [{
      key: `${metric.name}.${field.field}`,
      group: metric.name,
      field: field.field,
      ...(field.unit ? { unit: field.unit } : {})
    }] : []);
  });
}

export function buildRealtimeMetricPath(monitorId: number, metricKey: string) {
  return `/api/monitor/${monitorId}/metrics/${encodeURIComponent(metricKey)}`;
}

export function buildMetricCatalogPath(monitor: Monitor) {
  const app = monitor.scrape && monitor.scrape !== 'static' ? monitor.scrape : monitor.app;
  if (app === 'push') return `/api/apps/${monitor.id}/pushdefine`;
  if (app === 'prometheus') return `/api/apps/${monitor.id}/define/dynamic`;
  return `/api/apps/${app}/define`;
}

export function buildFavoriteMetricPath(monitorId: number, metricKey?: string) {
  return metricKey == null
    ? `/api/metrics/favorite/${monitorId}`
    : `/api/metrics/favorite/${monitorId}/${encodeURIComponent(metricKey)}`;
}

export function buildHistoryMetricPath(monitor: Monitor, metric: MonitorMetricOption, history: string) {
  const sourceApp = monitor.scrape && monitor.scrape !== 'static' ? monitor.scrape : monitor.app;
  const app = sourceApp === 'prometheus' ? `_prometheus_${monitor.name}` : sourceApp;
  const fullMetric = `${app}.${metric.group}.${metric.field}`;
  const params = new URLSearchParams({ history, interval: 'false' });
  return `/api/monitor/${encodeURIComponent(monitor.instance)}/metric/${fullMetric}?${params.toString()}`;
}

type MetricValue = { origin?: string; mean?: string; median?: string; min?: string; max?: string; time?: number };

function displayMetricValue(value: MetricValue) {
  return value.origin ?? value.mean ?? value.median ?? value.max ?? value.min ?? '—';
}

export function monitorRealtimeRows(data: { valueRows?: Array<{ labels?: Record<string, string>; values?: MetricValue[] }> }) {
  return (data.valueRows ?? []).flatMap((row, rowIndex) => (row.values ?? []).map((value, valueIndex) => ({
    key: `${rowIndex}:${valueIndex}`,
    labels: row.labels ?? {},
    value: displayMetricValue(value),
    time: value.time
  })));
}

export function monitorHistoryRows(data: { values?: Record<string, MetricValue[]> }) {
  return Object.entries(data.values ?? {}).flatMap(([series, values]) => values.map((value, index) => ({
    key: `${series}:${index}`,
    series,
    value: displayMetricValue(value),
    time: value.time
  })));
}
