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
  apiMessageDelete,
  apiMessageGet,
  apiMessagePost,
  apiMessagePut,
  type PageResult
} from '@/core/http/api-message';

export type StatusOrg = {
  id?: number;
  name: string;
  description: string;
  home: string;
  logo: string;
  feedback?: string;
  color?: string;
  state: number;
  creator?: string;
  modifier?: string;
  gmtCreate?: string;
  gmtUpdate?: string;
};

export type StatusComponent = {
  id?: number;
  orgId: number;
  name: string;
  description?: string;
  labels?: Record<string, string>;
  method: number;
  configState: number;
  state: number;
  creator?: string;
  modifier?: string;
  gmtCreate?: string;
  gmtUpdate?: string;
};

export type StatusIncidentContent = {
  id?: number;
  incidentId?: number;
  message: string;
  state: number;
  timestamp: number;
  creator?: string;
  modifier?: string;
  gmtCreate?: string;
  gmtUpdate?: string;
};

export type StatusIncident = {
  id?: number;
  orgId: number;
  name: string;
  state: number;
  startTime?: number;
  endTime?: number;
  creator?: string;
  modifier?: string;
  gmtCreate?: string;
  gmtUpdate?: string;
  components?: StatusComponent[];
  contents?: StatusIncidentContent[];
};

export type StatusIncidentQuery = { search: string; pageIndex: number; pageSize: number };
export const statusIncidentPageSizes = [8, 20, 50] as const;

const orgPath = '/api/status/page/org';
const componentPath = '/api/status/page/component';
const incidentPath = '/api/status/page/incident';

export const loadStatusOrg = () => apiMessageGet<StatusOrg>(orgPath);
export const saveStatusOrg = (org: StatusOrg) => apiMessagePost<StatusOrg>(orgPath, org);
export const loadStatusComponents = () => apiMessageGet<StatusComponent[]>(componentPath);
export const saveStatusComponent = (component: StatusComponent, isNew: boolean) =>
  isNew ? apiMessagePost<void>(componentPath, component) : apiMessagePut<void>(componentPath, component);
export const deleteStatusComponent = (id: number) => apiMessageDelete<void>(`${componentPath}/${id}`);
export const loadStatusIncidents = (query: StatusIncidentQuery) =>
  apiMessageGet<PageResult<StatusIncident>>(buildStatusIncidentPath(query));
export const loadStatusIncident = (id: number, signal?: AbortSignal) =>
  signal
    ? apiMessageGet<StatusIncident>(`${incidentPath}/${id}`, { signal })
    : apiMessageGet<StatusIncident>(`${incidentPath}/${id}`);
export const saveStatusIncident = (incident: StatusIncident, isNew: boolean) =>
  isNew ? apiMessagePost<void>(incidentPath, incident) : apiMessagePut<void>(incidentPath, incident);
export const deleteStatusIncident = (id: number) => apiMessageDelete<void>(`${incidentPath}/${id}`);

export function readStatusIncidentQuery(params: URLSearchParams): StatusIncidentQuery {
  const pageIndex = readNonNegative(params.get('pageIndex'), 0);
  const requestedSize = readNonNegative(params.get('pageSize'), 8);
  return {
    search: params.get('search')?.trim() ?? '',
    pageIndex,
    pageSize: statusIncidentPageSizes.includes(requestedSize as 8 | 20 | 50) ? requestedSize : 8
  };
}

export function writeStatusIncidentQuery(query: StatusIncidentQuery) {
  const params = new URLSearchParams();
  if (query.search) params.set('search', query.search);
  params.set('pageIndex', String(query.pageIndex));
  params.set('pageSize', String(query.pageSize));
  return params;
}

export function buildStatusIncidentPath(query: StatusIncidentQuery) {
  const params = new URLSearchParams({
    pageIndex: String(query.pageIndex),
    pageSize: String(query.pageSize)
  });
  if (query.search) params.set('search', query.search);
  return `${incidentPath}?${params.toString()}`;
}

function readNonNegative(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}
