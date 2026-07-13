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

export const monitorPageSizes = [10, 20, 50] as const;

export type MonitorQuery = {
  search: string;
  app: string;
  status: string;
  pageIndex: number;
  pageSize: number;
};

type MonitorAppItem = {
  category?: string | null;
  value?: string | null;
  label?: string | null;
};

export function monitorAppOptions(items: MonitorAppItem[]) {
  return items
    .filter(item => item.value && item.value !== 'prometheus' && item.category !== '__system__')
    .map(item => ({ value: item.value as string, label: item.label || item.value as string }));
}

export function readMonitorQuery(params: URLSearchParams): MonitorQuery {
  const pageIndex = Number.parseInt(params.get('pageIndex') ?? '', 10);
  const requestedSize = Number.parseInt(params.get('pageSize') ?? '', 10);
  const pageSize = monitorPageSizes.includes(requestedSize as typeof monitorPageSizes[number]) ? requestedSize : 10;
  return {
    search: params.get('search')?.trim() ?? '',
    app: params.get('app')?.trim() ?? '',
    status: params.get('status')?.trim() ?? '9',
    pageIndex: Number.isFinite(pageIndex) && pageIndex >= 0 ? pageIndex : 0,
    pageSize
  };
}

export function buildMonitorListPath(query: MonitorQuery) {
  return `/api/monitors?${writeMonitorQuery(query).toString()}`;
}

export function writeMonitorQuery(query: MonitorQuery) {
  const params = new URLSearchParams({ pageIndex: String(query.pageIndex), pageSize: String(query.pageSize) });
  if (query.search) params.set('search', query.search);
  if (query.app) params.set('app', query.app);
  if (query.status && query.status !== '9') params.set('status', query.status);
  return params;
}

export function monitorStatusKey(status: number) {
  if (status === 0) return 'monitor.status.paused';
  if (status === 1) return 'monitor.status.available';
  if (status === 2) return 'monitor.status.unavailable';
  return 'monitor.status.unknown';
}

export function monitorStatusColor(status: number) {
  if (status === 1) return 'green';
  if (status === 2) return 'red';
  return 'default';
}
