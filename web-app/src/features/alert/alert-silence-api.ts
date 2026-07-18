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
  buildAlertSilencePayload,
  buildAlertSilenceTogglePayload,
  AlertSilenceContractError,
  AlertSilenceMissingError,
  type AlertSilence,
  type AlertSilenceDraft,
  type AlertSilenceQuery
} from './alert-silence-model';
import { parseAlertSilenceDetail, parseAlertSilencePage } from './alert-silence-schema';

function buildAlertSilenceListPath(query: AlertSilenceQuery) {
  const params = new URLSearchParams({
    pageIndex: String(query.pageIndex),
    pageSize: String(query.pageSize),
    sort: 'id',
    order: 'desc'
  });
  if (query.search) params.set('search', query.search);
  return `/api/alert/silences?${params.toString()}`;
}

export async function loadAlertSilences(query: AlertSilenceQuery, signal?: AbortSignal) {
  const path = buildAlertSilenceListPath(query);
  const response = signal
    ? await apiMessageGet<unknown>(path, { signal })
    : await apiMessageGet<unknown>(path);
  return parseAlertSilencePage(response, query);
}

export async function loadAlertSilence(id: number, signal?: AbortSignal) {
  const path = `/api/alert/silence/${canonicalAlertSilenceId(id)}`;
  const response = signal
    ? await apiMessageGet<unknown>(path, { signal })
    : await apiMessageGet<unknown>(path);
  return parseAlertSilenceDetail(response);
}

export async function saveAlertSilence(draft: AlertSilenceDraft): Promise<void> {
  const payload = buildAlertSilencePayload(draft);
  if (draft.id !== undefined) await apiMessagePut<unknown>('/api/alert/silence', payload);
  else await apiMessagePost<unknown>('/api/alert/silence', payload);
}

export async function deleteAlertSilence(id: number): Promise<void> {
  await apiMessageDelete<unknown>(`/api/alert/silences?ids=${canonicalAlertSilenceId(id)}`);
}

export async function updateAlertSilenceEnabled(silence: AlertSilence, enable: boolean): Promise<void> {
  await apiMessagePut<unknown>('/api/alert/silence', buildAlertSilenceTogglePayload(silence, enable));
}

// AlertSilenceController reports a missing detail with the backend's shared
// MONITOR_NOT_EXIST_CODE (0x03), even though this resource is not a monitor.
const alertSilenceMissingCode = 3;

export function isAlertSilenceMissing(reason: unknown) {
  return reason instanceof AlertSilenceMissingError
    || reason instanceof ApiMessageError
      && (reason.status === 404 || reason.status === 200 && reason.code === alertSilenceMissingCode);
}

export function classifyAlertSilenceReadError(reason: unknown): 'missing' | 'unavailable' | 'error' {
  if (isAlertSilenceMissing(reason)) return 'missing';
  if (reason instanceof ApiMessageError
    && (reason.cause !== undefined || reason.status === undefined || [0, 502, 503, 504].includes(reason.status))) {
    return 'unavailable';
  }
  return 'error';
}

function canonicalAlertSilenceId(value: unknown) {
  if (!Number.isSafeInteger(value) || Number(value) <= 0) {
    throw new AlertSilenceContractError('Alert Silence id must be a positive safe integer');
  }
  return Number(value);
}
