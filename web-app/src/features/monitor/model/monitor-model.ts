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

export { monitorPageSizes, type MonitorAction, type MonitorQuery } from './monitor-contract';
export { readMonitorQuery, writeMonitorQuery } from './monitor-query';

import { monitorStatusCodes, type MonitorQuery } from './monitor-contract';
import { writeMonitorQuery } from './monitor-query';

export type MonitorScopedSelection = { scope: string; ids: number[] };

export function monitorSelectionScope(query: MonitorQuery) {
  return writeMonitorQuery(query).toString();
}

export function reconcileMonitorSelection(
  selection: MonitorScopedSelection,
  scope: string,
  visibleIds: readonly number[]
) {
  if (selection.scope !== scope) return [];
  const visible = new Set(visibleIds);
  const reconciled = [...new Set(selection.ids)].filter(id => visible.has(id));
  return reconciled.length === selection.ids.length && reconciled.every((id, index) => id === selection.ids[index])
    ? selection.ids
    : reconciled;
}

type MonitorAppItem = {
  category?: string | null;
  value?: string | null;
  label?: string | null;
  hide?: boolean | null;
};

export function monitorAppOptions(items: MonitorAppItem[]) {
  return items
    .filter(isSelectableMonitorApp)
    .map(item => ({ value: item.value as string, label: item.label || (item.value as string) }));
}

export function isSelectableMonitorApp(item: MonitorAppItem) {
  return Boolean(item.value) && item.hide !== true && item.category !== '__system__';
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

export function parseMonitorTimestamp(value?: number | string | null) {
  if (value == null || value === '') return undefined;
  const timestamp = typeof value === 'number' ? value : Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : undefined;
}

export function safeMonitorReturnTo(value?: string | null) {
  return value && /^\/monitors(?:[?#]|$)/.test(value) ? value : '/monitors';
}

export function buildMonitorRoutePath(monitorId: number, mode: 'view' | 'edit', returnTo: string) {
  const suffix = mode === 'edit' ? '/edit' : '';
  return `/monitors/${monitorId}${suffix}?returnTo=${encodeURIComponent(safeMonitorReturnTo(returnTo))}`;
}
