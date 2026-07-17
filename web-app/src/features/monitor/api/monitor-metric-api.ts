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

import { apiMessageDelete, apiMessageGet, apiMessagePost } from '@/core/http/api-message';
import type {
  Monitor, MonitorDetailMetric, MonitorHistoryMetric, MonitorMetricOption, MonitorMetricValue, MonitorRealtimeMetric
} from './monitor-contract';
import {
  array, boolean, byte, MonitorContractError, nonemptyString, nullableNonnegativeInteger, nullableString,
  positiveInteger, record
} from './monitor-contract-parser';

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
  return metricKey == null ? `/api/metrics/favorite/${monitorId}`
    : `/api/metrics/favorite/${monitorId}/${encodeURIComponent(metricKey)}`;
}

export function buildHistoryMetricPath(monitor: Monitor, metric: MonitorMetricOption, history: string) {
  const sourceApp = monitor.scrape && monitor.scrape !== 'static' ? monitor.scrape : monitor.app;
  const app = sourceApp === 'prometheus' ? `_prometheus_${monitor.name}` : sourceApp;
  const fullMetric = `${app}.${metric.group}.${metric.field}`;
  const params = new URLSearchParams({ history, interval: 'false' });
  return `/api/monitor/${encodeURIComponent(monitor.instance)}/metric/${fullMetric}?${params.toString()}`;
}

export async function loadFavoriteMetrics(monitorId: number, signal?: AbortSignal) {
  const value = await apiMessageGet<unknown>(buildFavoriteMetricPath(monitorId), signal ? { signal } : undefined);
  return array(value, 'favorite metrics').map((item, index) => nonemptyString(item, `favorite metric[${index}]`));
}

export async function loadMonitorMetricCatalog(monitor: Monitor, signal?: AbortSignal) {
  const value = await apiMessageGet<unknown>(buildMetricCatalogPath(monitor), signal ? { signal } : undefined);
  const catalog = record(value, 'monitor metric catalog');
  return { metrics: array(catalog.metrics, 'monitor metric catalog metrics').map(parseCatalogMetric) };
}

export function updateFavoriteMetric(monitorId: number, metricKey: string, favorite: boolean) {
  const path = buildFavoriteMetricPath(monitorId, metricKey);
  return favorite ? apiMessagePost<unknown>(path, null) : apiMessageDelete<unknown>(path);
}

export async function loadRealtimeMetric(monitorId: number, metric: MonitorMetricOption,
  signal?: AbortSignal): Promise<MonitorRealtimeMetric> {
  const value = await apiMessageGet<unknown>(buildRealtimeMetricPath(monitorId, metric.group), signal ? { signal } : undefined);
  if (value === null || value === undefined) return { fields: [], valueRows: [] };
  const data = record(value, 'realtime metric');
  if (positiveInteger(data.id, 'realtime monitor id') !== monitorId
    || nonemptyString(data.metrics, 'realtime metric group') !== metric.group) {
    throw new MonitorContractError('Realtime metric identity does not match request');
  }
  nullableString(data.app, 'realtime app');
  nullableNonnegativeInteger(data.time, 'realtime time');
  const fields = array(data.fields, 'realtime fields').map(parseRealtimeField);
  if (new Set(fields.map(field => field.name)).size !== fields.length) {
    throw new MonitorContractError('Realtime metric field names must be unique');
  }
  const valueRows = data.valueRows === null ? []
    : array(data.valueRows, 'realtime value rows').map((item, index) => parseRealtimeRow(item, index, fields.length));
  return { fields, valueRows };
}

export async function loadHistoryMetric(monitor: Monitor, metric: MonitorMetricOption, history: string,
  signal?: AbortSignal): Promise<MonitorHistoryMetric> {
  const value = await apiMessageGet<unknown>(buildHistoryMetricPath(monitor, metric, history), signal ? { signal } : undefined);
  const data = record(value, 'history metric');
  const field = record(data.field, 'history metric field');
  if (nonemptyString(data.instance, 'history instance') !== monitor.instance
    || nonemptyString(data.metrics, 'history metric group') !== metric.group
    || nonemptyString(field.name, 'history metric field name') !== metric.field) {
    throw new MonitorContractError('History metric identity does not match request');
  }
  nullableString(data.app, 'history app');
  if (byte(field.type, 'history metric field type') !== 0) throw new MonitorContractError('History metric field must be numeric');
  nullableString(field.unit, 'history metric field unit');
  if (field.label !== null && typeof field.label !== 'boolean') {
    throw new MonitorContractError('history metric field label must be boolean or null');
  }
  const values = record(data.values, 'history metric values');
  return { values: Object.fromEntries(Object.entries(values).map(([series, entries]) => [series,
    array(entries, `history series ${series}`).map((entry, index) => parseMetricValue(entry, `history value ${series}[${index}]`))
  ])) };
}

function parseCatalogMetric(value: unknown, index: number): MonitorDetailMetric {
  const item = record(value, `catalog metric[${index}]`);
  if (typeof item.visible !== 'boolean') throw new MonitorContractError('catalog metric visible must be boolean');
  return { name: nonemptyString(item.name, 'catalog metric name'), visible: item.visible,
    fields: array(item.fields, 'catalog metric fields').map((entry, fieldIndex) => {
      const field = record(entry, `catalog metric field[${fieldIndex}]`);
      const unit = nullableString(field.unit, 'catalog metric field unit');
      return { type: byte(field.type, 'catalog metric field type'), field: nonemptyString(field.field, 'catalog metric field name'),
        label: boolean(field.label, 'catalog metric field label'), ...(unit === null ? {} : { unit }) };
    }) };
}

function parseRealtimeField(value: unknown, index: number) {
  const field = record(value, `realtime field[${index}]`);
  if (typeof field.label !== 'boolean') throw new MonitorContractError('metric field label must be boolean');
  return { name: nonemptyString(field.name, 'metric field name'), type: byte(field.type, 'metric field type'),
    unit: nullableString(field.unit, 'metric field unit'), label: field.label };
}

function parseRealtimeRow(value: unknown, index: number, fieldCount: number) {
  const row = record(value, `realtime row[${index}]`);
  const labels = record(row.labels, 'realtime labels');
  for (const [key, entry] of Object.entries(labels)) {
    if (typeof entry !== 'string') throw new MonitorContractError(`realtime label ${key} must be a string`);
  }
  const values = array(row.values, 'realtime values').map((entry, valueIndex) =>
    parseMetricValue(entry, `realtime value[${valueIndex}]`));
  if (values.length !== fieldCount) throw new MonitorContractError('Realtime row values must align with fields');
  return { labels: labels as Record<string, string>, values };
}

function parseMetricValue(value: unknown, label: string): MonitorMetricValue {
  const item = record(value, label);
  return { origin: nullableString(item.origin, `${label} origin`), mean: nullableString(item.mean, `${label} mean`),
    median: nullableString(item.median, `${label} median`), min: nullableString(item.min, `${label} min`),
    max: nullableString(item.max, `${label} max`), time: nullableNonnegativeInteger(item.time, `${label} time`) };
}
