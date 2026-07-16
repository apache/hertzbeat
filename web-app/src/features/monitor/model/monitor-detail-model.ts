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

import type {
  MonitorDetail, MonitorDetailMetric, MonitorHistoryMetric, MonitorMetricOption, MonitorMetricValue,
  MonitorRealtimeMetric
} from '../api/monitor-api';

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

export const monitorMetricHistoryRanges = ['30m', '1h', '6h', '24h'] as const;
export type MonitorMetricHistory = typeof monitorMetricHistoryRanges[number];
export type MonitorMetricCatalogEvidence =
  | { kind: 'loading'; options: MonitorMetricOption[] }
  | { kind: 'fallback'; options: MonitorMetricOption[]; references: string[] }
  | { kind: 'empty'; options: MonitorMetricOption[] }
  | { kind: 'unavailable'; options: MonitorMetricOption[] }
  | { kind: 'error'; options: MonitorMetricOption[] }
  | { kind: 'ready'; options: MonitorMetricOption[] };
export type MonitorMetricFavoriteEvidence =
  | { kind: 'loading' }
  | { kind: 'unavailable' }
  | { kind: 'error' }
  | { kind: 'ready'; value: boolean };
export type MonitorMetricRowsEvidence<T> =
  | { kind: 'loading'; rows: T[] }
  | { kind: 'empty'; rows: T[] }
  | { kind: 'unavailable'; rows: T[] }
  | { kind: 'error'; rows: T[] }
  | { kind: 'ready'; rows: T[] };
export type MonitorMetricWorkbenchController = {
  state: {
    catalog: MonitorMetricCatalogEvidence;
    metricKey: string;
    history: MonitorMetricHistory;
    favorite: MonitorMetricFavoriteEvidence;
    favoriteBusy: boolean;
    realtime: MonitorMetricRowsEvidence<ReturnType<typeof monitorRealtimeRows>[number]>;
    historical: MonitorMetricRowsEvidence<ReturnType<typeof monitorHistoryRows>[number]>;
  };
  actions: {
    setMetric: (value: string) => void;
    setHistory: (value: MonitorMetricHistory) => void;
    toggleFavorite: () => Promise<void>;
    refresh: () => void;
  };
};

export function parseMonitorMetricHistory(value: string | null): MonitorMetricHistory {
  return monitorMetricHistoryRanges.includes(value as MonitorMetricHistory) ? value as MonitorMetricHistory : '30m';
}

export function monitorMetricOptions(metrics: MonitorDetailMetric[]) {
  return metrics.flatMap(metric => {
    if (metric.visible === false) return [];
    return (metric.fields ?? []).flatMap(field => field.type === 0 && field.label !== true && field.field ? [{
      key: `${metric.name}.${field.field}`,
      group: metric.name,
      field: field.field,
      ...(field.unit ? { unit: field.unit } : {})
    }] : []);
  });
}

function displayMetricValue(value: MonitorMetricValue) {
  return value.origin ?? value.mean ?? value.median ?? value.max ?? value.min ?? '—';
}

export function monitorRealtimeRows(data: MonitorRealtimeMetric, metric: MonitorMetricOption) {
  const fieldIndex = data.fields.findIndex(field => field.name === metric.field && !field.label);
  if (fieldIndex < 0) return [];
  return data.valueRows.flatMap((row, rowIndex) => {
    const value = row.values[fieldIndex];
    return value ? [{ key: String(rowIndex), labels: row.labels, value: displayMetricValue(value), time: value.time }] : [];
  });
}

export function monitorHistoryRows(data: MonitorHistoryMetric) {
  return Object.entries(data.values).flatMap(([series, values]) => values.map((value, index) => ({
    key: `${series}:${index}`,
    series,
    value: displayMetricValue(value),
    time: value.time
  })));
}
