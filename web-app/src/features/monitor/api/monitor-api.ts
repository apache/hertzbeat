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

import {
  ApiMessageError, apiMessageDelete, apiMessageGet, apiMessagePost, apiMessagePut, type PageResult
} from '@/core/http/api-message';

export class MonitorContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MonitorContractError';
  }
}

export class MonitorMissingError extends Error {
  constructor() {
    super('Monitor detail is missing');
    this.name = 'MonitorMissingError';
  }
}

export function classifyMonitorReadError(error: unknown): 'unavailable' | 'error' {
  if (error instanceof MonitorContractError) return 'error';
  if (error instanceof ApiMessageError
    && (error.cause !== undefined || error.status === undefined || [0, 502, 503, 504].includes(error.status))) {
    return 'unavailable';
  }
  return 'error';
}

export function classifyMonitorDetailReadError(error: unknown): 'missing' | 'unavailable' | 'error' {
  if (error instanceof MonitorMissingError
    || error instanceof ApiMessageError && (error.status === 404 || error.status === 200 && error.code === 15)) {
    return 'missing';
  }
  return classifyMonitorReadError(error);
}

export function classifyMonitorMetricReadError(error: unknown): 'unavailable' | 'error' {
  if (error instanceof MonitorContractError) return 'error';
  if (error instanceof ApiMessageError && error.status === 200 && error.code === 15) return 'unavailable';
  return classifyMonitorReadError(error);
}

export type Monitor = {
  id: number;
  jobId?: number | null;
  name: string;
  app: string;
  instance: string;
  status: number;
  type?: number;
  intervals?: number | null;
  scheduleType?: string | null;
  cronExpression?: string | null;
  description?: string | null;
  scrape?: string | null;
  labels?: Record<string, string> | null;
  annotations?: Record<string, string> | null;
  creator?: string | null;
  modifier?: string | null;
  gmtCreate?: number | string | null;
  gmtUpdate?: number | string | null;
};

export type MonitorParam = {
  id?: number | null;
  monitorId?: number | null;
  field: string;
  type?: number;
  paramValue?: unknown;
  gmtCreate?: number | string | null;
  gmtUpdate?: number | string | null;
};
export type MonitorDetailMetric = {
  name: string;
  favorited?: boolean | null;
  visible?: boolean;
  fields?: Array<{ type?: number; field?: string; unit?: string; label?: boolean }>;
};
export type MonitorParamDefine = {
  field: string;
  name?: string | Record<string, string>;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  placeholder?: string | Record<string, string>;
  hide?: boolean;
};
export type MonitorDetail = {
  monitor: Monitor;
  params?: MonitorParam[];
  collector?: string | null;
  grafanaDashboard?: MonitorGrafanaDashboard | null;
  metrics?: MonitorDetailMetric[];
};

export type MonitorGrafanaDashboard = {
  monitorId: number | null;
  folderUid: string | null;
  slug: string | null;
  status: string | null;
  uid: string | null;
  url: string | null;
  version: number | null;
  enabled: boolean;
  template: string | null;
};

export type MonitorMetricOption = {
  key: string;
  group: string;
  field: string;
  unit?: string;
};

export type MonitorMetricValue = {
  origin: string | null;
  mean: string | null;
  median: string | null;
  min: string | null;
  max: string | null;
  time: number | null;
};

export type MonitorRealtimeMetric = {
  fields: Array<{ name: string; type: number; unit: string | null; label: boolean }>;
  valueRows: Array<{ labels: Record<string, string>; values: MonitorMetricValue[] }>;
};

export type MonitorHistoryMetric = { values: Record<string, MonitorMetricValue[]> };

export type MonitorApp = {
  category?: string | null;
  value?: string | null;
  label?: string | null;
  hide?: boolean | null;
};

export const monitorPageSizes = [10, 20, 50] as const;

export type MonitorQuery = {
  search: string;
  app: string;
  status: string;
  labels: string;
  pageIndex: number;
  pageSize: number;
};

export type MonitorAction = 'copy' | 'enable' | 'pause' | 'delete';

function validPageIndex(value: string | null) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function validPageSize(value: string | null) {
  const parsed = Number.parseInt(value ?? '', 10);
  return monitorPageSizes.includes(parsed as typeof monitorPageSizes[number]) ? parsed : 10;
}

export function readMonitorQuery(params: URLSearchParams): MonitorQuery {
  return {
    search: params.get('search')?.trim() ?? '',
    app: params.get('app')?.trim() ?? '',
    status: params.get('status')?.trim() ?? '9',
    labels: params.get('labels')?.trim() ?? '',
    pageIndex: validPageIndex(params.get('pageIndex')),
    pageSize: validPageSize(params.get('pageSize'))
  };
}

export function writeMonitorQuery(query: MonitorQuery) {
  const params = new URLSearchParams({ pageIndex: String(query.pageIndex), pageSize: String(query.pageSize) });
  if (query.search) params.set('search', query.search);
  if (query.app) params.set('app', query.app);
  if (query.status && query.status !== '9') params.set('status', query.status);
  if (query.labels) params.set('labels', query.labels);
  return params;
}

export function buildMonitorListPath(query: MonitorQuery) {
  return `/api/monitors?${writeMonitorQuery(query).toString()}`;
}

export function buildMonitorActionPath(action: MonitorAction, ids: number[]) {
  if (action === 'copy') {
    if (ids.length !== 1) throw new Error('Copy requires one monitor id');
    return `/api/monitor/copy/${ids[0]}`;
  }
  const params = new URLSearchParams();
  ids.forEach(id => params.append('ids', String(id)));
  if (action === 'pause') params.set('type', 'JSON');
  return action === 'delete' ? `/api/monitors?${params.toString()}` : `/api/monitors/manage?${params.toString()}`;
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

export async function loadMonitors(query: MonitorQuery, signal?: AbortSignal) {
  const value = await apiMessageGet<unknown>(buildMonitorListPath(query), signal ? { signal } : undefined);
  return parseMonitorPage(value, query);
}

export function loadMonitorApps(): Promise<MonitorApp[]>;
export function loadMonitorApps(signal: AbortSignal): Promise<MonitorApp[]>;
export async function loadMonitorApps(signal?: AbortSignal) {
  const value = await apiMessageGet<unknown>('/api/apps/hierarchy', signal ? { signal } : undefined);
  return parseMonitorApps(value);
}

export async function loadMonitorDetail(id: string | number, signal?: AbortSignal) {
  const requestedId = monitorDetailId(id);
  if (requestedId === undefined) throw new MonitorMissingError();
  const path = `/api/monitor/${requestedId}`;
  const value = signal
    ? await apiMessageGet<unknown>(path, { signal })
    : await apiMessageGet<unknown>(path);
  return parseMonitorDetail(value, requestedId);
}

export function loadMonitorParamDefines(app: string) {
  return apiMessageGet<MonitorParamDefine[]>(`/api/apps/${encodeURIComponent(app)}/params`);
}

export function detectMonitor(payload: unknown) {
  return apiMessagePost<unknown>('/api/monitor/detect', payload, { signal: AbortSignal.timeout(15_000) });
}

export function saveMonitor(mode: 'new' | 'edit', payload: unknown) {
  return mode === 'new' ? apiMessagePost<unknown>('/api/monitor', payload) : apiMessagePut<unknown>('/api/monitor', payload);
}

export function mutateMonitors(action: MonitorAction, ids: number[]) {
  const path = buildMonitorActionPath(action, ids);
  if (action === 'copy') return apiMessagePost<unknown>(path, null);
  if (action === 'enable') return apiMessageGet<unknown>(path);
  return apiMessageDelete<unknown>(path);
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

export async function loadRealtimeMetric(monitorId: number, metric: MonitorMetricOption, signal?: AbortSignal): Promise<MonitorRealtimeMetric> {
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
  if (byte(field.type, 'history metric field type') !== 0) {
    throw new MonitorContractError('History metric field must be numeric');
  }
  nullableString(field.unit, 'history metric field unit');
  if (field.label !== null && typeof field.label !== 'boolean') {
    throw new MonitorContractError('history metric field label must be boolean or null');
  }
  const values = record(data.values, 'history metric values');
  return { values: Object.fromEntries(Object.entries(values).map(([series, entries]) => [series,
    array(entries, `history series ${series}`).map((entry, index) => parseMetricValue(entry, `history value ${series}[${index}]`))
  ])) };
}

function parseMonitorPage(value: unknown, query: MonitorQuery): PageResult<Monitor> {
  const page = record(value, 'monitor page');
  const content = array(page.content, 'monitor content').map((item, index) => parseMonitor(item, index));
  const totalElements = nonnegativeInteger(page.totalElements, 'totalElements');
  const totalPages = nonnegativeInteger(page.totalPages, 'totalPages');
  const number = nonnegativeInteger(page.number, 'number');
  const size = positiveInteger(page.size, 'size');
  if (number !== query.pageIndex || size !== query.pageSize || content.length > size
    || totalPages !== Math.ceil(totalElements / size)) {
    throw new MonitorContractError('Monitor page identity is inconsistent with the request');
  }
  return { content, totalElements, totalPages, number, size };
}

function parseMonitor(value: unknown, index: number): Monitor {
  const item = record(value, `monitor[${index}]`);
  return {
    id: positiveInteger(item.id, 'monitor id'),
    name: nonemptyString(item.name, 'monitor name'),
    app: nonemptyString(item.app, 'monitor app'),
    instance: nonemptyString(item.instance, 'monitor instance'),
    status: byte(item.status, 'monitor status'),
    ...optionalTimestamp(item, 'gmtCreate'),
    ...optionalTimestamp(item, 'gmtUpdate')
  };
}

function parseMonitorDetail(value: unknown, requestedId: number): MonitorDetail {
  if (value === null || value === undefined) throw new MonitorMissingError();
  const detail = record(value, 'monitor detail');
  const monitor = parseDetailMonitor(detail.monitor);
  if (monitor.id !== requestedId) throw new MonitorContractError('Monitor detail identity does not match request');
  const params = array(detail.params, 'monitor params')
    .map((item, index) => parseMonitorParam(item, index, requestedId));
  const metrics = array(detail.metrics, 'monitor metrics').map((item, index) => parseEmbeddedMetric(item, index));
  const collector = nullableString(detail.collector, 'monitor collector');
  const grafanaDashboard = detail.grafanaDashboard === null
    ? null
    : parseGrafanaDashboard(detail.grafanaDashboard, requestedId);
  return { monitor, params, metrics, collector, grafanaDashboard };
}

function parseDetailMonitor(value: unknown): Monitor {
  const item = record(value, 'monitor detail monitor');
  return {
    id: positiveInteger(item.id, 'monitor id'),
    jobId: nullablePositiveInteger(item.jobId, 'monitor jobId'),
    name: nonemptyString(item.name, 'monitor name'),
    app: nonemptyString(item.app, 'monitor app'),
    scrape: nullableString(item.scrape, 'monitor scrape'),
    instance: nonemptyString(item.instance, 'monitor instance'),
    intervals: nullableNonnegativeInteger(item.intervals, 'monitor intervals'),
    scheduleType: nullableString(item.scheduleType, 'monitor scheduleType'),
    cronExpression: nullableString(item.cronExpression, 'monitor cronExpression'),
    status: byte(item.status, 'monitor status'),
    type: byte(item.type, 'monitor type'),
    labels: nullableStringMap(item.labels, 'monitor labels'),
    annotations: nullableStringMap(item.annotations, 'monitor annotations'),
    description: nullableString(item.description, 'monitor description'),
    creator: nullableString(item.creator, 'monitor creator'),
    modifier: nullableString(item.modifier, 'monitor modifier'),
    gmtCreate: nullableTimestamp(item.gmtCreate, 'monitor gmtCreate'),
    gmtUpdate: nullableTimestamp(item.gmtUpdate, 'monitor gmtUpdate')
  };
}

function parseMonitorParam(value: unknown, index: number, requestedMonitorId: number): MonitorParam {
  const item = record(value, `monitor param[${index}]`);
  const result: MonitorParam = {
    field: nonemptyString(item.field, 'monitor param field'),
    type: byte(item.type, 'monitor param type')
  };
  if (item.paramValue !== null && typeof item.paramValue !== 'string') {
    throw new MonitorContractError('monitor param value must be a string or null');
  }
  result.paramValue = item.paramValue;
  result.id = nullablePositiveInteger(item.id, 'monitor param id');
  result.monitorId = nullablePositiveInteger(item.monitorId, 'monitor param monitorId');
  if (result.monitorId !== null && result.monitorId !== requestedMonitorId) {
    throw new MonitorContractError('Monitor param identity does not match request');
  }
  result.gmtCreate = nullableTimestamp(item.gmtCreate, 'monitor param gmtCreate');
  result.gmtUpdate = nullableTimestamp(item.gmtUpdate, 'monitor param gmtUpdate');
  return result;
}

function parseGrafanaDashboard(value: unknown, requestedMonitorId: number): MonitorGrafanaDashboard {
  const item = record(value, 'monitor grafana dashboard');
  if (typeof item.enabled !== 'boolean') throw new MonitorContractError('grafana enabled must be boolean');
  const monitorId = nullablePositiveInteger(item.monitorId, 'grafana monitorId');
  if (monitorId !== null && monitorId !== requestedMonitorId) {
    throw new MonitorContractError('Grafana dashboard identity does not match request');
  }
  return {
    monitorId,
    folderUid: nullableString(item.folderUid, 'grafana folderUid'),
    slug: nullableString(item.slug, 'grafana slug'),
    status: nullableString(item.status, 'grafana status'),
    uid: nullableString(item.uid, 'grafana uid'),
    url: nullableString(item.url, 'grafana url'),
    version: nullableNonnegativeInteger(item.version, 'grafana version'),
    enabled: item.enabled,
    template: nullableString(item.template, 'grafana template')
  };
}

function parseEmbeddedMetric(value: unknown, index: number): MonitorDetailMetric {
  const item = record(value, `monitor metric[${index}]`);
  const result: MonitorDetailMetric = { name: nonemptyString(item.name, 'monitor metric name') };
  if (!Object.hasOwn(item, 'favorited') || item.favorited !== null && typeof item.favorited !== 'boolean') {
    throw new MonitorContractError('monitor metric favorited must be boolean or null');
  }
  result.favorited = item.favorited;
  return result;
}

function parseCatalogMetric(value: unknown, index: number): MonitorDetailMetric {
  const item = record(value, `catalog metric[${index}]`);
  if (typeof item.visible !== 'boolean') throw new MonitorContractError('catalog metric visible must be boolean');
  return {
    name: nonemptyString(item.name, 'catalog metric name'),
    visible: item.visible,
    fields: array(item.fields, 'catalog metric fields').map((entry, fieldIndex) => {
      const field = record(entry, `catalog metric field[${fieldIndex}]`);
      const unit = nullableString(field.unit, 'catalog metric field unit');
      return {
        type: byte(field.type, 'catalog metric field type'),
        field: nonemptyString(field.field, 'catalog metric field name'),
        label: boolean(field.label, 'catalog metric field label'),
        ...(unit === null ? {} : { unit })
      };
    })
  };
}

function parseRealtimeField(value: unknown, index: number) {
  const field = record(value, `realtime field[${index}]`);
  if (typeof field.label !== 'boolean') throw new MonitorContractError('metric field label must be boolean');
  return {
    name: nonemptyString(field.name, 'metric field name'),
    type: byte(field.type, 'metric field type'),
    unit: nullableString(field.unit, 'metric field unit'),
    label: field.label
  };
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
  return {
    labels: labels as Record<string, string>,
    values
  };
}

function parseMetricValue(value: unknown, label: string): MonitorMetricValue {
  const item = record(value, label);
  return {
    origin: nullableString(item.origin, `${label} origin`),
    mean: nullableString(item.mean, `${label} mean`),
    median: nullableString(item.median, `${label} median`),
    min: nullableString(item.min, `${label} min`),
    max: nullableString(item.max, `${label} max`),
    time: nullableNonnegativeInteger(item.time, `${label} time`)
  };
}

function monitorDetailId(value: string | number) {
  if (typeof value === 'number') return Number.isSafeInteger(value) && value > 0 ? value : undefined;
  if (!/^[1-9]\d*$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

function parseMonitorApps(value: unknown): MonitorApp[] {
  return array(value, 'monitor apps').map((entry, index) => {
    const item = record(entry, `monitor app[${index}]`);
    const hide = item.hide;
    if (hide !== undefined && hide !== null && typeof hide !== 'boolean') {
      throw new MonitorContractError('Monitor app hide must be boolean or null');
    }
    return {
      category: nullableString(item.category, 'monitor app category'),
      value: nonemptyString(item.value, 'monitor app value'),
      label: nullableString(item.label, 'monitor app label'),
      ...(hide === undefined ? {} : { hide })
    };
  });
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new MonitorContractError(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function array(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new MonitorContractError(`${label} must be an array`);
  return value;
}

function nonemptyString(value: unknown, label: string) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new MonitorContractError(`${label} must be a nonempty string`);
  }
  return value;
}

function nullableString(value: unknown, label: string) {
  if (value === null) return null;
  if (typeof value !== 'string') throw new MonitorContractError(`${label} must be a string or null`);
  return value;
}

function nullableStringMap(value: unknown, label: string) {
  if (value === null) return null;
  const values = record(value, label);
  for (const [entryKey, entryValue] of Object.entries(values)) {
    if (typeof entryValue !== 'string') {
      throw new MonitorContractError(`${label} ${entryKey} must be a string`);
    }
  }
  return values as Record<string, string>;
}

function nonnegativeInteger(value: unknown, label: string) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new MonitorContractError(`${label} must be a nonnegative safe integer`);
  }
  return value;
}

function nullableNonnegativeInteger(value: unknown, label: string) {
  return value === null ? null : nonnegativeInteger(value, label);
}

function nullablePositiveInteger(value: unknown, label: string) {
  return value === null ? null : positiveInteger(value, label);
}

function nullableTimestamp(value: unknown, label: string) {
  if (value === null) return null;
  if ((typeof value !== 'number' || !Number.isFinite(value)) && typeof value !== 'string') {
    throw new MonitorContractError(`${label} must be a finite number, string, or null`);
  }
  return value;
}

function positiveInteger(value: unknown, label: string) {
  const parsed = nonnegativeInteger(value, label);
  if (parsed === 0) throw new MonitorContractError(`${label} must be positive`);
  return parsed;
}

function byte(value: unknown, label: string) {
  const parsed = nonnegativeInteger(value, label);
  if (parsed > 255) throw new MonitorContractError(`${label} must fit a byte`);
  return parsed;
}

function boolean(value: unknown, label: string) {
  if (typeof value !== 'boolean') throw new MonitorContractError(`${label} must be a boolean`);
  return value;
}

function optionalTimestamp(item: Record<string, unknown>, key: 'gmtCreate' | 'gmtUpdate') {
  const value = item[key];
  if (value === undefined || value === null) return {};
  if ((typeof value !== 'number' || !Number.isFinite(value)) && typeof value !== 'string') {
    throw new MonitorContractError(`${key} must be a finite number, string, or null`);
  }
  return { [key]: value };
}
