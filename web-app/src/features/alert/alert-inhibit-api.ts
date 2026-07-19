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
  ApiMessageError,
  apiMessageDelete,
  apiMessageGet,
  apiMessagePost,
  apiMessagePut
} from '@/core/http/api-message';

import {
  buildAlertInhibitPayload,
  buildAlertInhibitTogglePayload,
  AlertInhibitMissingError,
  type AlertInhibit,
  type AlertInhibitDraft,
  type AlertInhibitQuery
} from './alert-inhibit-model';
import { parseAlertInhibitDetail, parseAlertInhibitPage } from './alert-inhibit-schema';

function buildAlertInhibitListPath(query: AlertInhibitQuery) {
  const params = new URLSearchParams({
    pageIndex: String(query.pageIndex),
    pageSize: String(query.pageSize),
    sort: 'id',
    order: 'desc'
  });
  if (query.search) params.set('search', query.search);
  return `/api/alert/inhibits?${params.toString()}`;
}

export async function loadAlertInhibits(query: AlertInhibitQuery) {
  const response = await apiMessageGet(buildAlertInhibitListPath(query));
  return parseAlertInhibitPage(response, query);
}

export async function loadAlertInhibit(id: number) {
  const response = await apiMessageGet(`/api/alert/inhibit/${id}`);
  return parseAlertInhibitDetail(response);
}

export async function saveAlertInhibit(draft: AlertInhibitDraft): Promise<void> {
  const payload = buildAlertInhibitPayload(draft);
  if (draft.id) await apiMessagePut('/api/alert/inhibit', payload);
  else await apiMessagePost('/api/alert/inhibit', payload);
}

export async function deleteAlertInhibit(id: number): Promise<void> {
  await apiMessageDelete(`/api/alert/inhibits?ids=${id}`);
}

export async function updateAlertInhibitEnabled(inhibit: AlertInhibit, enable: boolean): Promise<void> {
  await apiMessagePut('/api/alert/inhibit', buildAlertInhibitTogglePayload(inhibit, enable));
}

export function classifyAlertInhibitReadError(reason: unknown): 'missing' | 'unavailable' | 'error' {
  if (reason instanceof AlertInhibitMissingError) return 'missing';
  if (reason instanceof ApiMessageError) {
    if (reason.status === 404 || (reason.status === 200 && reason.code === 3)) return 'missing';
    if (reason.cause !== undefined || reason.status === undefined || [0, 502, 503, 504].includes(reason.status)) {
      return 'unavailable';
    }
  }
  return 'error';
}

export function classifyAlertInhibitWriteError(reason: unknown): 'unavailable' | 'error' {
  return classifyAlertInhibitReadError(reason) === 'unavailable' ? 'unavailable' : 'error';
}
