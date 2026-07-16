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

export function classifyMonitorReadError(error: unknown): 'unavailable' | 'error' {
  if (error instanceof MonitorContractError) return 'error';
  if (error instanceof ApiMessageError
    && (error.cause !== undefined || error.status === undefined || [0, 502, 503, 504].includes(error.status))) {
    return 'unavailable';
  }
  return 'error';
}

export type Monitor = {
  id: number;
  name: string;
  app: string;
  instance: string;
  status: number;
  intervals?: number;
  scheduleType?: string;
  cronExpression?: string;
  description?: string;
  scrape?: string;
  labels?: Record<string, string>;
  gmtCreate?: number | string;
  gmtUpdate?: number | string;
};

export type MonitorParam = { field: string; type?: number; paramValue?: unknown; display?: boolean };
export type MonitorDetailMetric = { name: string; visible?: boolean; fields?: Array<{ type?: number; field?: string; unit?: string }> };
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
  grafanaDashboard?: Record<string, unknown>;
  metrics?: MonitorDetailMetric[];
};

export type MonitorMetricOption = {
  key: string;
  group: string;
  field: string;
  unit?: string;
};

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

export function loadMonitorDetail(id: string) {
  return apiMessageGet<MonitorDetail>(`/api/monitor/${encodeURIComponent(id)}`);
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

export function loadFavoriteMetrics(monitorId: number) {
  return apiMessageGet<string[]>(buildFavoriteMetricPath(monitorId));
}

export function loadMonitorMetricCatalog(monitor: Monitor) {
  return apiMessageGet<{ metrics?: MonitorDetailMetric[] }>(buildMetricCatalogPath(monitor));
}

export function updateFavoriteMetric(monitorId: number, metricKey: string, favorite: boolean) {
  const path = buildFavoriteMetricPath(monitorId, metricKey);
  return favorite ? apiMessagePost<unknown>(path, null) : apiMessageDelete<unknown>(path);
}

export function loadRealtimeMetric(monitorId: number, metricKey: string) {
  return apiMessageGet<{ valueRows?: Array<{ labels?: Record<string, string>; values?: Array<{ origin?: string; mean?: string; time?: number }> }> }>(buildRealtimeMetricPath(monitorId, metricKey));
}

export function loadHistoryMetric(monitor: Monitor, metric: MonitorMetricOption, history: string) {
  return apiMessageGet<{ values?: Record<string, Array<{ origin?: string; mean?: string; time?: number }>> }>(buildHistoryMetricPath(monitor, metric, history));
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

function nonnegativeInteger(value: unknown, label: string) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new MonitorContractError(`${label} must be a nonnegative safe integer`);
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

function optionalTimestamp(item: Record<string, unknown>, key: 'gmtCreate' | 'gmtUpdate') {
  const value = item[key];
  if (value === undefined || value === null) return {};
  if ((typeof value !== 'number' || !Number.isFinite(value)) && typeof value !== 'string') {
    throw new MonitorContractError(`${key} must be a finite number, string, or null`);
  }
  return { [key]: value };
}
