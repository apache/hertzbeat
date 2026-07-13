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

export const alertPageSizes = [8, 15, 25] as const;

export type AlertQuery = {
  search: string;
  status: string;
  severity: string;
  pageIndex: number;
  pageSize: number;
};

export function readAlertQuery(params: URLSearchParams): AlertQuery {
  const requestedIndex = Number.parseInt(params.get('pageIndex') ?? '', 10);
  const requestedSize = Number.parseInt(params.get('pageSize') ?? '', 10);
  return {
    search: params.get('search')?.trim() ?? '',
    status: params.get('status')?.trim().toLowerCase() ?? '',
    severity: params.get('severity')?.trim().toLowerCase() ?? '',
    pageIndex: Number.isFinite(requestedIndex) && requestedIndex >= 0 ? requestedIndex : 0,
    pageSize: alertPageSizes.includes(requestedSize as typeof alertPageSizes[number]) ? requestedSize : 8
  };
}

export function writeAlertQuery(query: AlertQuery) {
  const params = new URLSearchParams({ pageIndex: String(query.pageIndex), pageSize: String(query.pageSize) });
  if (query.search) params.set('search', query.search);
  if (query.status) params.set('status', query.status);
  if (query.severity) params.set('severity', query.severity);
  return params;
}

export function buildAlertListPath(query: AlertQuery) {
  const params = writeAlertQuery(query);
  params.set('sort', 'gmtUpdate');
  params.set('order', 'desc');
  return `/api/alerts/group?${params.toString()}`;
}

export function alertStatusColor(status?: string) {
  if (status === 'firing') return 'red';
  if (status === 'acknowledged') return 'gold';
  if (status === 'resolved') return 'green';
  return 'default';
}
