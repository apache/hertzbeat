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

import type { MonitorDetail, MonitorDetailMetric } from '../api/monitor-api';

export type MonitorDetailEvidence =
  | { kind: 'loading' }
  | { kind: 'missing' }
  | { kind: 'unavailable' }
  | { kind: 'error' }
  | { kind: 'ready'; detail: MonitorDetail };

export type MonitorDetailViewState = { detail: MonitorDetailEvidence; returnTo: string };
export type MonitorDetailViewActions = { back: () => void; edit: () => void };

export function parseMonitorRouteId(value: string | undefined) {
  if (!value || !/^[1-9]\d*$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

export {
  buildFavoriteMetricPath,
  buildHistoryMetricPath,
  buildMetricCatalogPath,
  buildRealtimeMetricPath,
  type MonitorMetricOption
} from '../api/monitor-api';

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
