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

import type { RemotePayloadState } from '@/shared/remote-state';

import type {
  MonitorDetail,
  MonitorDetailMetric,
  MonitorHistoryMetric,
  MonitorMetricOption,
  MonitorMetricValue,
  MonitorRealtimeMetric,
  MonitorGrafanaDashboard
} from './monitor-contract';

export type MonitorDetailEvidence = RemotePayloadState<{ detail: MonitorDetail }, 'missing' | 'unavailable' | 'error'>;

/** Angular established 90 seconds initially; operators may choose a listed value or disable refresh. */
export const defaultMonitorDetailRefreshSeconds = 90;
export const monitorDetailRefreshChoices = [10, 30, 60, 300, 0] as const;
const monitorDetailRefreshValues = [defaultMonitorDetailRefreshSeconds, ...monitorDetailRefreshChoices] as const;
export type MonitorDetailRefreshChoice = (typeof monitorDetailRefreshChoices)[number];
export type MonitorDetailRefreshSeconds = (typeof monitorDetailRefreshValues)[number];

export type MonitorDetailViewState = {
  detail: MonitorDetailEvidence;
  returnTo: string;
  grafanaDeleting: boolean;
  grafanaDeleteError: boolean;
};
export type MonitorDetailViewActions = {
  back: () => void;
  edit: () => void;
  deleteGrafanaDashboard: () => Promise<void>;
};
export type MonitorDetailRefreshControl = {
  refreshSeconds: MonitorDetailRefreshSeconds;
  setRefreshSeconds: (value: MonitorDetailRefreshChoice) => void;
};

export function parseMonitorRouteId(value: string | undefined) {
  if (!value || !/^[1-9]\d*$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

export function parseMonitorDetailRefresh(value: string | null): MonitorDetailRefreshSeconds {
  const parsed = value === null ? Number.NaN : Number(value);
  return monitorDetailRefreshValues.includes(parsed as MonitorDetailRefreshSeconds)
    ? (parsed as MonitorDetailRefreshSeconds)
    : defaultMonitorDetailRefreshSeconds;
}

export function monitorDetailRefreshInterval(value: MonitorDetailRefreshSeconds) {
  return value === 0 ? false : value * 1000;
}

/**
 * Dashboard URLs cross an iframe trust boundary. Keep admission centralized
 * and fail closed without rejecting the rest of an otherwise valid detail.
 */
export function safeMonitorGrafanaUrl(dashboard: Pick<MonitorGrafanaDashboard, 'enabled' | 'url'> | null | undefined) {
  if (!dashboard?.enabled || !dashboard.url) return undefined;
  try {
    const parsed = new URL(dashboard.url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return undefined;
    if (parsed.username || parsed.password) return undefined;
    return parsed.href;
  } catch {
    return undefined;
  }
}

export type { MonitorMetricOption } from './monitor-contract';

export const monitorMetricHistoryRanges = ['30m', '1h', '6h', '24h', '1W', '4W', '12W'] as const;
export type MonitorMetricHistory = (typeof monitorMetricHistoryRanges)[number];
const monitorMetricIntervalRanges = new Set<MonitorMetricHistory>(['1W', '4W', '12W']);
export type MonitorMetricCatalogEvidence =
  | { kind: 'loading'; options: MonitorMetricOption[] }
  | { kind: 'fallback'; options: MonitorMetricOption[]; references: string[] }
  | { kind: 'empty'; options: MonitorMetricOption[] }
  | { kind: 'unavailable'; options: MonitorMetricOption[] }
  | { kind: 'error'; options: MonitorMetricOption[] }
  | { kind: 'ready'; options: MonitorMetricOption[] };
export type MonitorMetricFavoriteEvidence = RemotePayloadState<
  { value: boolean; token?: string },
  'unavailable' | 'error'
>;
type MonitorMetricFavoriteItem = { key: string; available: boolean };
export type MonitorMetricFavoriteCollectionEvidence =
  | { kind: 'loading' }
  | { kind: 'empty'; items: MonitorMetricFavoriteItem[] }
  | { kind: 'unavailable' }
  | { kind: 'error' }
  | { kind: 'ready'; items: MonitorMetricFavoriteItem[] };
export type MonitorMetricRowsEvidence<T> =
  | { kind: 'loading'; rows: T[] }
  | { kind: 'empty'; rows: T[] }
  | { kind: 'unsupported'; rows: T[] }
  | { kind: 'unavailable'; rows: T[] }
  | { kind: 'error'; rows: T[] }
  | { kind: 'ready'; rows: T[] };
export type MonitorMetricWorkbenchController = {
  state: {
    catalog: MonitorMetricCatalogEvidence;
    metricKey: string;
    history: MonitorMetricHistory;
    historySupported: boolean;
    refreshSeconds: MonitorDetailRefreshSeconds;
    favorite: MonitorMetricFavoriteEvidence;
    favoriteCollection: MonitorMetricFavoriteCollectionEvidence;
    favoriteBusy: boolean;
    realtime: MonitorMetricRowsEvidence<ReturnType<typeof monitorRealtimeRows>[number]>;
    historical: MonitorMetricRowsEvidence<ReturnType<typeof monitorHistoryRows>[number]>;
  };
  actions: {
    setMetric: (value: string) => void;
    setHistory: (value: MonitorMetricHistory) => void;
    setRefreshSeconds: (value: MonitorDetailRefreshChoice) => void;
    toggleFavorite: () => Promise<void>;
    refresh: () => void;
  };
};

export function parseMonitorMetricHistory(value: string | null): MonitorMetricHistory {
  return monitorMetricHistoryRanges.includes(value as MonitorMetricHistory) ? (value as MonitorMetricHistory) : '30m';
}

export function monitorMetricHistoryUsesInterval(value: MonitorMetricHistory) {
  return monitorMetricIntervalRanges.has(value);
}

export function monitorMetricOptions(metrics: MonitorDetailMetric[]) {
  return metrics.flatMap(metric => {
    if (metric.visible === false) return [];
    const fields = (metric.fields ?? []).filter(field => field.label !== true && field.field);
    const numeric = fields
      .filter(field => field.type === 0)
      .map(field => ({
        key: `${metric.name}.${field.field}`,
        group: metric.name,
        field: field.field!,
        ...(field.unit ? { unit: field.unit } : {})
      }));
    if (numeric.length > 0) return numeric;
    const representative = fields[0];
    return representative?.field
      ? [
          {
            key: `${metric.name}.${representative.field}`,
            group: metric.name,
            field: representative.field,
            ...(representative.unit ? { unit: representative.unit } : {}),
            historySupported: false as const
          }
        ]
      : [];
  });
}

function displayMetricValue(value: MonitorMetricValue) {
  return value.origin ?? value.mean ?? value.median ?? value.max ?? value.min ?? '—';
}

export function monitorRealtimeRows(data: MonitorRealtimeMetric) {
  return data.valueRows.flatMap((row, rowIndex) =>
    data.fields.flatMap((field, fieldIndex) => {
      if (field.label) return [];
      const value = row.values[fieldIndex];
      return value
        ? [
            {
              key: `${rowIndex}:${field.name}`,
              labels: row.labels,
              field: field.name,
              unit: field.unit,
              value: displayMetricValue(value),
              time: value.time ?? data.time ?? null
            }
          ]
        : [];
    })
  );
}

export function monitorHistoryRows(data: MonitorHistoryMetric) {
  return Object.entries(data.values).flatMap(([series, values]) =>
    values.map((value, index) => ({
      key: `${series}:${index}`,
      series,
      value: displayMetricValue(value),
      time: value.time
    }))
  );
}
