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

import { alertSilenceApiRequest } from './alert-silence-api-failure';
import {
  buildAlertSilencePayload,
  buildAlertSilenceTogglePayload,
  AlertSilenceContractError,
  type AlertSilence,
  type AlertSilenceDraft,
  type AlertSilenceQuery
} from '../model/alert-silence-model';
import { parseAlertSilenceDetail, parseAlertSilencePage } from './alert-silence-schema';

const alertSilenceEndpoint = '/api/alert/silence';
const alertSilenceCollectionEndpoint = '/api/alert/silences';

function buildAlertSilenceListPath(query: AlertSilenceQuery) {
  const params = new URLSearchParams({
    pageIndex: String(query.pageIndex),
    pageSize: String(query.pageSize),
    sort: 'id',
    order: 'desc'
  });
  if (query.search) params.set('search', query.search);
  return `${alertSilenceCollectionEndpoint}?${params.toString()}`;
}

function buildAlertSilenceDetailPath(id: number) {
  return `${alertSilenceEndpoint}/${canonicalAlertSilenceId(id)}`;
}

function buildAlertSilenceDeletePath(id: number) {
  return `${alertSilenceCollectionEndpoint}?ids=${canonicalAlertSilenceId(id)}`;
}

export async function loadAlertSilences(query: AlertSilenceQuery, signal?: AbortSignal) {
  const path = buildAlertSilenceListPath(query);
  return alertSilenceApiRequest(async () => {
    const response = await (signal ? apiMessageGet(path, { signal }) : apiMessageGet(path));
    return parseAlertSilencePage(response, query);
  });
}

export async function loadAlertSilence(id: number, signal?: AbortSignal) {
  const path = buildAlertSilenceDetailPath(id);
  return alertSilenceApiRequest(async () => {
    const response = await (signal ? apiMessageGet(path, { signal }) : apiMessageGet(path));
    return parseAlertSilenceDetail(response);
  });
}

export async function saveAlertSilence(draft: AlertSilenceDraft): Promise<void> {
  const payload = buildAlertSilencePayload(draft);
  if (draft.id !== undefined) {
    await alertSilenceApiRequest(() => apiMessagePut(alertSilenceEndpoint, payload));
  } else {
    await alertSilenceApiRequest(() => apiMessagePost(alertSilenceEndpoint, payload));
  }
}

export async function deleteAlertSilence(id: number): Promise<void> {
  const path = buildAlertSilenceDeletePath(id);
  await alertSilenceApiRequest(() => apiMessageDelete(path));
}

export async function updateAlertSilenceEnabled(silence: AlertSilence, enable: boolean): Promise<void> {
  const payload = buildAlertSilenceTogglePayload(silence, enable);
  await alertSilenceApiRequest(() => apiMessagePut(alertSilenceEndpoint, payload));
}

function canonicalAlertSilenceId(value: unknown) {
  if (!Number.isSafeInteger(value) || Number(value) <= 0) {
    throw new AlertSilenceContractError('Alert Silence id must be a positive safe integer');
  }
  return Number(value);
}
