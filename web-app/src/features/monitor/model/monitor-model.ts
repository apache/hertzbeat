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

import { buildMonitorDetailPath, buildMonitorEditPath, monitorRoutePaths } from '@/shared/navigation/app-paths';
import { authoritativePageIndexCorrection } from '@/shared/pagination';

import { monitorStatusCodes, type MonitorPage, type MonitorQuery, type MonitorScrape } from './monitor-contract';
import { readMonitorQuery, writeMonitorQuery } from './monitor-query';

export { monitorPageSizes, type MonitorQuery } from './monitor-contract';
export { readMonitorQuery, writeMonitorQuery } from './monitor-query';

export const monitorHelpUrl = 'https://hertzbeat.apache.org/docs/help/guide/';

export type MonitorScopedSelection = { scope: string; ids: number[] };

export function monitorSelectionScope(query: MonitorQuery) {
  return new URLSearchParams({
    search: query.search,
    app: query.app,
    status: query.status,
    labels: query.labels
  }).toString();
}

export function reconcileMonitorSelection(selection: MonitorScopedSelection, scope: string) {
  if (selection.scope !== scope) return [];
  const reconciled = [...new Set(selection.ids)].filter(id => Number.isSafeInteger(id) && id > 0);
  return reconciled.length === selection.ids.length && reconciled.every((id, index) => id === selection.ids[index])
    ? selection.ids
    : reconciled;
}

export function monitorPageIndexCorrection(query: MonitorQuery, page?: MonitorPage) {
  if (!page || page.number !== query.pageIndex || query.pageIndex === 0) return undefined;
  return authoritativePageIndexCorrection(query.pageIndex, page.totalPages);
}

type MonitorAppItem = {
  category?: string | null;
  value?: string | null;
  label?: string | null;
  hide?: boolean | null;
};

export type MonitorNavigationApp = {
  category?: string;
  label: string | null;
  value: string;
};

export function monitorAppOptions(items: MonitorAppItem[]) {
  return items
    .filter(isSelectableMonitorApp)
    .map(item => ({ value: item.value as string, label: item.label || (item.value as string) }));
}

/** Applies the backend menu contract without changing which apps remain creatable. */
export function monitorNavigationApps(items: readonly MonitorAppItem[]) {
  const visible = new Map<string, MonitorNavigationApp>();
  items.forEach(item => {
    const value = item.value?.trim();
    const category = item.category?.trim();
    if (!value || item.hide || category === '__system__' || visible.has(value)) return;
    visible.set(value, {
      ...(category ? { category } : {}),
      label: item.label?.trim() || null,
      value
    });
  });
  return [...visible.values()].sort((left, right) => {
    const categoryOrder = (left.category ?? '').localeCompare(right.category ?? '');
    return categoryOrder || (left.label ?? left.value).localeCompare(right.label ?? right.value);
  });
}

// Backend `hide` controls main-menu layout only; it does not disable Monitor creation.
export function isSelectableMonitorApp(item: MonitorAppItem) {
  return Boolean(item.value) && item.category !== '__system__';
}

export function monitorStatusKey(status: number) {
  if (status === monitorStatusCodes.paused) return 'monitor.status.paused';
  if (status === monitorStatusCodes.available) return 'monitor.status.available';
  if (status === monitorStatusCodes.unavailable) return 'monitor.status.unavailable';
  return 'monitor.status.unknown';
}

export function monitorStatusColor(status: number) {
  if (status === monitorStatusCodes.available) return 'green';
  if (status === monitorStatusCodes.unavailable) return 'red';
  return 'default';
}

export function monitorDiscoveryTypeKey(scrape?: MonitorScrape | null) {
  return scrape && scrape !== 'static' ? `monitor.editor.scrapeTypes.${scrape}` : null;
}

export function parseMonitorTimestamp(value?: number | string | null) {
  if (value == null || value === '') return undefined;
  const timestamp = typeof value === 'number' ? value : Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : undefined;
}

export function safeMonitorReturnTo(value?: string | null) {
  if (!value) return monitorRoutePaths.list;

  const withoutHash = value.split('#', 1)[0] ?? '';
  const querySeparator = withoutHash.indexOf('?');
  const pathname = querySeparator < 0 ? withoutHash : withoutHash.slice(0, querySeparator);
  if (pathname !== monitorRoutePaths.list) return monitorRoutePaths.list;

  const input = new URLSearchParams(querySeparator < 0 ? '' : withoutHash.slice(querySeparator + 1));
  const query = readMonitorQuery(input);
  const normalized = writeMonitorQuery(query);
  const safe = new URLSearchParams();

  // A return URL is a security boundary: retain only the list model's public filters,
  // while reusing its normalization rules instead of maintaining a second parser.
  for (const key of Object.keys(query)) {
    const normalizedValue = normalized.get(key);
    if (input.has(key) && normalizedValue !== null) safe.set(key, normalizedValue);
  }

  const search = safe.toString();
  return search ? `${monitorRoutePaths.list}?${search}` : monitorRoutePaths.list;
}

export function buildMonitorRoutePath(monitorId: number, mode: 'view' | 'edit', returnTo: string) {
  const pathname = mode === 'edit' ? buildMonitorEditPath(monitorId) : buildMonitorDetailPath(monitorId);
  return `${pathname}?returnTo=${encodeURIComponent(safeMonitorReturnTo(returnTo))}`;
}

export function buildMonitorCreatePath(app: string, returnTo: string) {
  const normalizedApp = app.trim();
  const params = new URLSearchParams();
  if (normalizedApp) params.set('app', normalizedApp);
  params.set('returnTo', safeMonitorReturnTo(returnTo));
  return `${monitorRoutePaths.create}?${params.toString()}`;
}
