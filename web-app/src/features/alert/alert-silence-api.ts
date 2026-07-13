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

import { apiMessageDelete, apiMessageGet, apiMessagePost, apiMessagePut, type PageResult } from '@/core/http/api-message';

import {
  buildAlertSilenceListPath,
  buildAlertSilencePayload,
  type AlertSilence,
  type AlertSilenceDraft,
  type AlertSilenceQuery
} from './alert-silence-model';

export function loadAlertSilences(query: AlertSilenceQuery) {
  return apiMessageGet<PageResult<AlertSilence>>(buildAlertSilenceListPath(query));
}

export function loadAlertSilence(id: number) {
  return apiMessageGet<AlertSilence>(`/api/alert/silence/${id}`);
}

export function saveAlertSilence(draft: AlertSilenceDraft) {
  const payload = buildAlertSilencePayload(draft);
  return draft.id
    ? apiMessagePut<unknown>('/api/alert/silence', payload)
    : apiMessagePost<unknown>('/api/alert/silence', payload);
}

export function deleteAlertSilence(id: number) {
  return apiMessageDelete<unknown>(`/api/alert/silences?ids=${id}`);
}

export function updateAlertSilenceEnabled(silence: AlertSilence, enable: boolean) {
  return apiMessagePut<unknown>('/api/alert/silence', { ...silence, enable });
}
