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
  ApiMessageError, apiMessageDelete, apiMessageGet, apiMessagePost, type PageResult
} from '@/core/http/api-message';
import {
  array, byte, MonitorContractError, nonemptyString, nonnegativeInteger, nullableNonnegativeInteger,
  nullablePositiveInteger, nullableString, nullableStringMap, nullableTimestamp, optionalTimestamp, positiveInteger, record
} from './monitor-contract-parser';
import {
  monitorPageSizes, monitorScheduleTypes, monitorScrapeValues, type Monitor, type MonitorAction, type MonitorApp,
  type MonitorDetail, type MonitorDetailMetric,
  type MonitorGrafanaDashboard, type MonitorParam, type MonitorQuery
} from './monitor-contract';

export { MonitorContractError } from './monitor-contract-parser';
export * from './monitor-contract';
export { detectMonitor, loadMonitorCollectors, loadMonitorParamDefines, saveMonitor } from './monitor-editor-api';
export {
  buildFavoriteMetricPath, buildHistoryMetricPath, buildMetricCatalogPath, buildRealtimeMetricPath,
  loadFavoriteMetrics, loadHistoryMetric, loadMonitorMetricCatalog, loadRealtimeMetric, updateFavoriteMetric
} from './monitor-metric-api';

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

export async function loadNewMonitorEvidence(name: string, app: string, signal?: AbortSignal) {
  const normalizedName = name.trim();
  const normalizedApp = app.trim();
  if (!normalizedName || !normalizedApp) throw new MonitorContractError('New monitor identity is incomplete');
  const matches: Monitor[] = [];
  let pageIndex = 0;
  let totalPages = 1;
  do {
    const page = await loadMonitors({ search: normalizedName, app: normalizedApp, status: '9', labels: '',
      pageIndex, pageSize: 50 }, signal);
    if (page.totalPages > 20) throw new MonitorContractError('New monitor evidence exceeds the supported safety bound');
    matches.push(...page.content.filter(item => item.name === normalizedName && item.app === normalizedApp));
    totalPages = page.totalPages;
    pageIndex += 1;
  } while (pageIndex < totalPages);
  if (matches.length !== 1) {
    throw new MonitorContractError(`Expected one exact saved monitor, received ${matches.length}`);
  }
  return loadMonitorDetail(matches[0]!.id, signal);
}

export function mutateMonitors(action: MonitorAction, ids: number[]) {
  const path = buildMonitorActionPath(action, ids);
  if (action === 'copy') return apiMessagePost<unknown>(path, null);
  if (action === 'enable') return apiMessageGet<unknown>(path);
  return apiMessageDelete<unknown>(path);
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
  const scrape = nullableString(item.scrape, 'monitor scrape');
  const scheduleType = nullableString(item.scheduleType, 'monitor scheduleType');
  if (scrape !== null && !monitorScrapeValues.includes(scrape as typeof monitorScrapeValues[number])) {
    throw new MonitorContractError('monitor scrape is unsupported');
  }
  if (scheduleType !== null && !monitorScheduleTypes.includes(scheduleType as typeof monitorScheduleTypes[number])) {
    throw new MonitorContractError('monitor scheduleType is unsupported');
  }
  return {
    id: positiveInteger(item.id, 'monitor id'),
    jobId: nullablePositiveInteger(item.jobId, 'monitor jobId'),
    name: nonemptyString(item.name, 'monitor name'),
    app: nonemptyString(item.app, 'monitor app'),
    scrape: scrape as typeof monitorScrapeValues[number] | null,
    instance: nonemptyString(item.instance, 'monitor instance'),
    intervals: nullableNonnegativeInteger(item.intervals, 'monitor intervals'),
    scheduleType: scheduleType as typeof monitorScheduleTypes[number] | null,
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
