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

import { apiMessageDelete, apiMessageGet, apiMessagePost, apiMessagePut } from '@/core/http/api-message';
import { statusApiRequest } from '@/features/status/api/status-api-failure';
import { statusRequestFailureKind } from '@/features/status/shared/status-error-model';

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

export const loadStatusOrg = (signal?: AbortSignal) =>
  statusApiRequest(async () => parseStatusOrg(await get(orgPath, signal)), { resource: 'organization' });
export const saveStatusOrg = (org: StatusOrg) =>
  statusApiRequest(async () => parseStatusOrg(await apiMessagePost(orgPath, org)));
export const loadStatusComponents = (signal?: AbortSignal) =>
  statusApiRequest(async () => parseStatusComponents(await get(componentPath, signal)));
export const loadStatusComponent = (id: number, signal?: AbortSignal) =>
  statusApiRequest(async () => parseStatusComponentDetail(await get(`${componentPath}/${id}`, signal)));
export const saveStatusComponent = (component: StatusComponent, isNew: boolean) =>
  statusApiRequest(async () => {
    if (isNew) await apiMessagePost(componentPath, component);
    else await apiMessagePut(componentPath, component);
  });
export const deleteStatusComponent = (id: number) =>
  statusApiRequest(async () => {
    await apiMessageDelete(`${componentPath}/${id}`);
  });
export const loadStatusIncidents = (query: StatusIncidentQuery, signal?: AbortSignal) =>
  statusApiRequest(async () => parseStatusIncidentPage(await get(buildStatusIncidentPath(query), signal), query));
export const loadStatusIncident = (id: number, signal?: AbortSignal) =>
  statusApiRequest(async () => parseStatusIncidentDetail(await get(`${incidentPath}/${id}`, signal)));
export const saveStatusIncident = (incident: StatusIncident, isNew: boolean) =>
  statusApiRequest(async () => {
    if (isNew) await apiMessagePost(incidentPath, incident);
    else await apiMessagePut(incidentPath, incident);
  });
export const deleteStatusIncident = (id: number) =>
  statusApiRequest(async () => {
    await apiMessageDelete(`${incidentPath}/${id}`);
  });

function buildStatusIncidentPath(query: StatusIncidentQuery) {
  const params = new URLSearchParams({
    pageIndex: String(query.pageIndex),
    pageSize: String(query.pageSize)
  });
  if (query.search) params.set('search', query.search);
  return `${incidentPath}?${params.toString()}`;
}

function get(path: string, signal?: AbortSignal) {
  return signal ? apiMessageGet(path, { signal }) : apiMessageGet(path);
}

export type StatusManagementFailureKind = 'missing' | 'permission' | 'unavailable' | 'error';

export function statusManagementFailureKind(error: unknown): StatusManagementFailureKind {
  if (error instanceof StatusManagementMissingError) return 'missing';
  return statusRequestFailureKind(error) ?? 'error';
}

export function isStatusManagementMissing(error: unknown) {
  return statusManagementFailureKind(error) === 'missing';
}
