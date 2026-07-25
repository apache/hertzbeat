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
  MonitorContractError,
  monitorStatusFilters,
  type Monitor,
  type MonitorAction,
  type MonitorApp,
  type MonitorPage,
  type MonitorQuery
} from '../model/monitor-contract';
import { writeMonitorQuery } from '../model/monitor-query';
import { parseMonitorApps } from './monitor-apps-schema';
import { parseMonitorDetail } from './monitor-detail-schema';
import { parseMonitorPage } from './monitor-page-schema';

export { detectMonitor, loadMonitorCollectors, loadMonitorParamDefines, saveMonitor } from './monitor-editor-api';
export { loadMonitorAppHierarchy } from './monitor-hierarchy-api';
export {
  buildFavoriteMetricPath,
  buildHistoryMetricPath,
  buildMetricCatalogPath,
  buildRealtimeMetricPath,
  loadFavoriteMetrics,
  loadHistoryMetric,
  loadMonitorMetricCatalog,
  loadRealtimeMetric,
  updateFavoriteMetric
} from './monitor-metric-api';

export class MonitorMissingError extends Error {
  constructor() {
    super('Monitor detail is missing');
    this.name = 'MonitorMissingError';
  }
}

const monitorNotExistApiCode = 3;
const legacyMonitorMissingApiCode = 15;

// HertzBeat returns a successful HTTP envelope for domain-level missing data.
// Older deployments used the generic failure code for the same detail lookup,
// so both codes remain at this transport boundary during rolling upgrades.
const monitorMissingResponseCodes = new Set([monitorNotExistApiCode, legacyMonitorMissingApiCode]);

export function classifyMonitorReadError(error: unknown): 'unavailable' | 'error' {
  if (error instanceof MonitorContractError) return 'error';
  if (
    error instanceof ApiMessageError &&
    (error.cause !== undefined || error.status === undefined || [0, 502, 503, 504].includes(error.status))
  ) {
    return 'unavailable';
  }
  return 'error';
}

export function classifyMonitorDetailReadError(error: unknown): 'missing' | 'unavailable' | 'error' {
  if (
    error instanceof MonitorMissingError ||
    (error instanceof ApiMessageError &&
      (error.status === 404 ||
        (error.status === 200 && error.code !== undefined && monitorMissingResponseCodes.has(error.code))))
  ) {
    return 'missing';
  }
  return classifyMonitorReadError(error);
}

export function classifyMonitorMetricReadError(error: unknown): 'unavailable' | 'error' {
  if (error instanceof MonitorContractError) return 'error';
  if (error instanceof ApiMessageError && error.status === 200 && error.code === 15) return 'unavailable';
  return classifyMonitorReadError(error);
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
  const value = await apiMessageGet(buildMonitorListPath(query), signal ? { signal } : undefined);
  return parseMonitorPage(value, query);
}

export function loadMonitorApps(): Promise<MonitorApp[]>;
export function loadMonitorApps(signal: AbortSignal): Promise<MonitorApp[]>;
export async function loadMonitorApps(signal?: AbortSignal) {
  const value = await apiMessageGet('/api/apps/hierarchy', signal ? { signal } : undefined);
  return parseMonitorApps(value);
}

export async function loadMonitorDetail(id: string | number, signal?: AbortSignal) {
  const requestedId = monitorDetailId(id);
  if (requestedId === undefined) throw new MonitorMissingError();
  const path = `/api/monitor/${requestedId}`;
  const value = signal ? await apiMessageGet(path, { signal }) : await apiMessageGet(path);
  if (value === null || value === undefined) throw new MonitorMissingError();
  return parseMonitorDetail(value, requestedId);
}

export async function loadNewMonitorEvidence(name: string, app: string, signal?: AbortSignal) {
  const normalizedName = name.trim();
  const normalizedApp = app.trim();
  if (!normalizedName || !normalizedApp) throw new MonitorContractError('New monitor identity is incomplete');
  const matches: Monitor[] = [];
  const seenIds = new Set<number>();
  const firstPage = await loadMonitors(
    {
      search: normalizedName,
      app: normalizedApp,
      status: monitorStatusFilters.all,
      labels: '',
      sort: null,
      order: null,
      pageIndex: 0,
      pageSize: 50
    },
    signal
  );
  if (firstPage.totalPages > 20) {
    throw new MonitorContractError('New monitor evidence exceeds the supported safety bound');
  }
  // Freeze the first response before following pages so later totals cannot shorten or extend save evidence.
  const snapshot = { totalElements: firstPage.totalElements, totalPages: firstPage.totalPages };
  collectNewMonitorEvidence(firstPage, snapshot, seenIds, matches, normalizedName, normalizedApp);

  for (let pageIndex = 1; pageIndex < snapshot.totalPages; pageIndex += 1) {
    const page = await loadMonitors(
      {
        search: normalizedName,
        app: normalizedApp,
        status: monitorStatusFilters.all,
        labels: '',
        sort: null,
        order: null,
        pageIndex,
        pageSize: 50
      },
      signal
    );
    collectNewMonitorEvidence(page, snapshot, seenIds, matches, normalizedName, normalizedApp);
  }
  if (seenIds.size !== snapshot.totalElements) {
    throw new MonitorContractError('New monitor evidence does not contain the complete page snapshot');
  }
  const [match] = matches;
  if (matches.length !== 1 || !match) {
    throw new MonitorContractError(`Expected one exact saved monitor, received ${matches.length}`);
  }
  return loadMonitorDetail(match.id, signal);
}

function collectNewMonitorEvidence(
  page: MonitorPage,
  snapshot: { totalElements: number; totalPages: number },
  seenIds: Set<number>,
  matches: Monitor[],
  normalizedName: string,
  normalizedApp: string
) {
  if (page.totalElements !== snapshot.totalElements || page.totalPages !== snapshot.totalPages) {
    throw new MonitorContractError('New monitor evidence changed while scanning pages');
  }
  for (const monitor of page.content) {
    if (seenIds.has(monitor.id)) throw new MonitorContractError('New monitor evidence contains duplicate monitor ids');
    seenIds.add(monitor.id);
    if (monitor.name === normalizedName && monitor.app === normalizedApp) matches.push(monitor);
  }
}

export function mutateMonitors(action: MonitorAction, ids: number[]) {
  const path = buildMonitorActionPath(action, ids);
  if (action === 'copy' || action === 'enable') return apiMessagePost(path, null);
  return apiMessageDelete(path);
}

function monitorDetailId(value: string | number) {
  if (typeof value === 'number') return Number.isSafeInteger(value) && value > 0 ? value : undefined;
  if (!/^[1-9]\d*$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}
