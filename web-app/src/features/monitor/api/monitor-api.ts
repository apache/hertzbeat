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

import { ApiMessageError, apiMessageDelete, apiMessageGet, apiMessagePost } from '@/core/http/api-message';
import {
  MonitorContractError, monitorPageSizes, type Monitor, type MonitorAction, type MonitorApp, type MonitorQuery
} from './monitor-contract';
import { parseMonitorApps } from './monitor-apps-schema';
import { parseMonitorDetail } from './monitor-detail-schema';
import { parseMonitorPage } from './monitor-page-schema';

export * from './monitor-contract';
export { detectMonitor, loadMonitorCollectors, loadMonitorParamDefines, saveMonitor } from './monitor-editor-api';
export { buildMonitorAppHierarchyPath, loadMonitorAppHierarchy } from './monitor-hierarchy-api';
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
  if (value === null || value === undefined) throw new MonitorMissingError();
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

function monitorDetailId(value: string | number) {
  if (typeof value === 'number') return Number.isSafeInteger(value) && value > 0 ? value : undefined;
  if (!/^[1-9]\d*$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}
