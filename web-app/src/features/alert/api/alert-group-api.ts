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

import { alertGroupApiRequest } from './alert-group-api-failure';
import {
  buildAlertGroupPayload,
  buildAlertGroupTogglePayload,
  type AlertGroupConverge,
  type AlertGroupDraft,
  type AlertGroupQuery
} from '../model/alert-group-model';
import { parseAlertGroupDetail, parseAlertGroupPage } from './alert-group-schema';

const alertGroupEndpoint = '/api/alert/group';
const alertGroupsEndpoint = '/api/alert/groups';

function buildAlertGroupListPath(query: AlertGroupQuery) {
  const params = new URLSearchParams({
    pageIndex: String(query.pageIndex),
    pageSize: String(query.pageSize),
    sort: 'id',
    order: 'desc'
  });
  if (query.search) params.set('search', query.search);
  return `${alertGroupsEndpoint}?${params.toString()}`;
}

export async function loadAlertGroups(query: AlertGroupQuery, signal?: AbortSignal) {
  const path = buildAlertGroupListPath(query);
  const response = await alertGroupApiRequest(
    () => (signal ? apiMessageGet(path, { signal }) : apiMessageGet(path)),
    signal
  );
  return parseAlertGroupPage(response, query);
}

export async function loadAlertGroup(id: number) {
  const response = await alertGroupApiRequest(() => apiMessageGet(`${alertGroupEndpoint}/${id}`));
  return parseAlertGroupDetail(response);
}

export async function saveAlertGroup(draft: AlertGroupDraft): Promise<void> {
  const payload = buildAlertGroupPayload(draft);
  if (draft.id) await alertGroupApiRequest(() => apiMessagePut(alertGroupEndpoint, payload));
  else await alertGroupApiRequest(() => apiMessagePost(alertGroupEndpoint, payload));
}

export async function deleteAlertGroup(id: number): Promise<void> {
  await alertGroupApiRequest(() => apiMessageDelete(`${alertGroupsEndpoint}?ids=${id}`));
}

export async function updateAlertGroupEnabled(group: AlertGroupConverge, enable: boolean): Promise<void> {
  await alertGroupApiRequest(() => apiMessagePut(alertGroupEndpoint, buildAlertGroupTogglePayload(group, enable)));
}
