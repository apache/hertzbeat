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
  buildAlertInhibitListPath,
  buildAlertInhibitPayload,
  type AlertInhibit,
  type AlertInhibitDraft,
  type AlertInhibitQuery
} from './alert-inhibit-model';

export function loadAlertInhibits(query: AlertInhibitQuery) {
  return apiMessageGet<PageResult<AlertInhibit>>(buildAlertInhibitListPath(query));
}

export function loadAlertInhibit(id: number) {
  return apiMessageGet<AlertInhibit>(`/api/alert/inhibit/${id}`);
}

export function saveAlertInhibit(draft: AlertInhibitDraft) {
  const payload = buildAlertInhibitPayload(draft);
  return draft.id
    ? apiMessagePut<unknown>('/api/alert/inhibit', payload)
    : apiMessagePost<unknown>('/api/alert/inhibit', payload);
}

export function deleteAlertInhibit(id: number) {
  return apiMessageDelete<unknown>(`/api/alert/inhibits?ids=${id}`);
}

export function updateAlertInhibitEnabled(inhibit: AlertInhibit, enable: boolean) {
  return apiMessagePut<unknown>('/api/alert/inhibit', { ...inhibit, enable });
}
