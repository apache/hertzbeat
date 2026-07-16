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
  buildAlertSilenceListPath,
  buildAlertSilencePayload,
  buildAlertSilenceTogglePayload,
  AlertSilenceMissingError,
  parseAlertSilenceDetail,
  parseAlertSilencePage,
  type AlertSilence,
  type AlertSilenceDraft,
  type AlertSilenceQuery
} from './alert-silence-model';

export async function loadAlertSilences(query: AlertSilenceQuery) {
  const response = await apiMessageGet<unknown>(buildAlertSilenceListPath(query));
  return parseAlertSilencePage(response, query);
}

export async function loadAlertSilence(id: number) {
  const response = await apiMessageGet<unknown>(`/api/alert/silence/${id}`);
  return parseAlertSilenceDetail(response);
}

export async function saveAlertSilence(draft: AlertSilenceDraft): Promise<void> {
  const payload = buildAlertSilencePayload(draft);
  if (draft.id) await apiMessagePut<unknown>('/api/alert/silence', payload);
  else await apiMessagePost<unknown>('/api/alert/silence', payload);
}

export async function deleteAlertSilence(id: number): Promise<void> {
  await apiMessageDelete<unknown>(`/api/alert/silences?ids=${id}`);
}

export async function updateAlertSilenceEnabled(silence: AlertSilence, enable: boolean): Promise<void> {
  await apiMessagePut<unknown>('/api/alert/silence', buildAlertSilenceTogglePayload(silence, enable));
}

export function isAlertSilenceMissing(reason: unknown) {
  return reason instanceof AlertSilenceMissingError
    || reason instanceof ApiMessageError && (reason.status === 404 || reason.status === 200 && reason.code === 15);
}
