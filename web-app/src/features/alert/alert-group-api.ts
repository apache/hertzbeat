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

import { ApiMessageError, apiMessageDelete, apiMessageGet, apiMessagePost, apiMessagePut } from '@/core/http/api-message';

import {
  buildAlertGroupListPath,
  buildAlertGroupPayload,
  buildAlertGroupTogglePayload,
  AlertGroupMissingError,
  type AlertGroupConverge,
  type AlertGroupDraft,
  type AlertGroupQuery
} from './alert-group-model';
import { parseAlertGroupDetail, parseAlertGroupPage } from './alert-group-schema';

export async function loadAlertGroups(query: AlertGroupQuery) {
  const response = await apiMessageGet(buildAlertGroupListPath(query));
  return parseAlertGroupPage(response, query);
}

export async function loadAlertGroup(id: number) {
  const response = await apiMessageGet(`/api/alert/group/${id}`);
  return parseAlertGroupDetail(response);
}

export async function saveAlertGroup(draft: AlertGroupDraft): Promise<void> {
  const payload = buildAlertGroupPayload(draft);
  if (draft.id) await apiMessagePut('/api/alert/group', payload);
  else await apiMessagePost('/api/alert/group', payload);
}

export async function deleteAlertGroup(id: number): Promise<void> {
  await apiMessageDelete(`/api/alert/groups?ids=${id}`);
}

export async function updateAlertGroupEnabled(group: AlertGroupConverge, enable: boolean): Promise<void> {
  await apiMessagePut('/api/alert/group', buildAlertGroupTogglePayload(group, enable));
}

export function classifyAlertGroupReadError(reason: unknown): 'missing' | 'unavailable' | 'error' {
  if (reason instanceof AlertGroupMissingError) return 'missing';
  if (reason instanceof ApiMessageError) {
    if (reason.status === 404 || reason.status === 200 && reason.code === 3) return 'missing';
    if (reason.cause !== undefined || reason.status === undefined || [0, 502, 503, 504].includes(reason.status)) {
      return 'unavailable';
    }
  }
  return 'error';
}
