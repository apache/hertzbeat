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
  ApiMessageError
} from '@/core/http/api-message';

import type { StatusIncidentQuery } from '../model/status-incident-query';
import {
  StatusManagementMissingError,
  type StatusComponent,
  type StatusIncident,
  type StatusOrg
} from '../model/status-management-contract';
import {
  parseStatusComponentDetail,
  parseStatusComponents,
  parseStatusIncidentDetail,
  parseStatusIncidentPage,
  parseStatusOrg
} from './status-management-schema';

const orgPath = '/api/status/page/org';
const componentPath = '/api/status/page/component';
const incidentPath = '/api/status/page/incident';

export const loadStatusOrg = async () => parseStatusOrg(await apiMessageGet(orgPath));
export const saveStatusOrg = async (org: StatusOrg) =>
  parseStatusOrg(await apiMessagePost(orgPath, org));
export const loadStatusComponents = async () =>
  parseStatusComponents(await apiMessageGet(componentPath));
export const loadStatusComponent = async (id: number) =>
  parseStatusComponentDetail(await apiMessageGet(`${componentPath}/${id}`));
export const saveStatusComponent = async (component: StatusComponent, isNew: boolean) => {
  if (isNew) await apiMessagePost(componentPath, component);
  else await apiMessagePut(componentPath, component);
};
export const deleteStatusComponent = async (id: number) => {
  await apiMessageDelete(`${componentPath}/${id}`);
};
export const loadStatusIncidents = async (query: StatusIncidentQuery) =>
  parseStatusIncidentPage(await apiMessageGet(buildStatusIncidentPath(query)), query);
export const loadStatusIncident = async (id: number, signal?: AbortSignal) => parseStatusIncidentDetail(
  signal
    ? await apiMessageGet(`${incidentPath}/${id}`, { signal })
    : await apiMessageGet(`${incidentPath}/${id}`)
);
export const saveStatusIncident = async (incident: StatusIncident, isNew: boolean) => {
  if (isNew) await apiMessagePost(incidentPath, incident);
  else await apiMessagePut(incidentPath, incident);
};
export const deleteStatusIncident = async (id: number) => {
  await apiMessageDelete(`${incidentPath}/${id}`);
};

export function buildStatusIncidentPath(query: StatusIncidentQuery) {
  const params = new URLSearchParams({
    pageIndex: String(query.pageIndex),
    pageSize: String(query.pageSize)
  });
  if (query.search) params.set('search', query.search);
  return `${incidentPath}?${params.toString()}`;
}

export type StatusManagementFailureKind = 'missing' | 'unavailable' | 'error';

export function statusManagementFailureKind(error: unknown): StatusManagementFailureKind {
  if (isStatusManagementMissing(error)) return 'missing';
  if (
    error instanceof ApiMessageError
    && (error.cause != null || [0, 502, 503, 504].includes(error.status ?? 0))
  ) {
    return 'unavailable';
  }
  return 'error';
}

export function isStatusManagementMissing(error: unknown) {
  return error instanceof StatusManagementMissingError
    || (error instanceof ApiMessageError
      && (error.status === 404 || (error.status === 200 && error.code === 15)));
}
