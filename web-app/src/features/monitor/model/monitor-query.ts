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

import { monitorPageSizes, monitorStatusFilters, type MonitorQuery } from './monitor-contract';

function validPageIndex(value: string | null) {
  if (!value || !/^(?:0|[1-9]\d*)$/.test(value)) return 0;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : 0;
}

function validPageSize(value: string | null) {
  if (!value || !/^\d+$/.test(value)) return 10;
  const parsed = Number(value);
  return monitorPageSizes.includes(parsed as (typeof monitorPageSizes)[number]) ? parsed : 10;
}

function validStatus(value: string | null) {
  return value !== null && Object.values(monitorStatusFilters).includes(value) ? value : monitorStatusFilters.all;
}

/** Reads the route-owned list filters without introducing backend paths into the domain model. */
export function readMonitorQuery(params: URLSearchParams): MonitorQuery {
  return {
    search: params.get('search')?.trim() ?? '',
    app: params.get('app')?.trim() ?? '',
    status: validStatus(params.get('status')?.trim() ?? null),
    labels: params.get('labels')?.trim() ?? '',
    pageIndex: validPageIndex(params.get('pageIndex')),
    pageSize: validPageSize(params.get('pageSize'))
  };
}

/** Serializes the stable list-query identity shared by routing and row selection. */
export function writeMonitorQuery(query: MonitorQuery) {
  const params = new URLSearchParams({ pageIndex: String(query.pageIndex), pageSize: String(query.pageSize) });
  if (query.search) params.set('search', query.search);
  if (query.app) params.set('app', query.app);
  if (query.status && query.status !== monitorStatusFilters.all) params.set('status', query.status);
  if (query.labels) params.set('labels', query.labels);
  return params;
}
