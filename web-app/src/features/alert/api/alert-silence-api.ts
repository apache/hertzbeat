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
  alertSilenceFailureKind,
  normalizeAlertSilenceIds,
  type AlertSilence,
  type AlertSilenceDraft,
  type AlertSilenceQuery
} from '../model/alert-silence-model';
import { parseAlertSilenceDeleteReceipt, parseAlertSilenceDetail, parseAlertSilencePage } from './alert-silence-schema';

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
  return `${alertSilenceEndpoint}/${normalizeAlertSilenceIds([id])[0]}`;
}

function buildAlertSilenceDeletePath(ids: readonly number[]) {
  const params = new URLSearchParams();
  normalizeAlertSilenceIds(ids).forEach(id => params.append('ids', String(id)));
  return `${alertSilenceCollectionEndpoint}?${params.toString()}`;
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

export async function loadMatchedAlertSilences(ids: number[], signal?: AbortSignal) {
  const canonicalIds = normalizeAlertSilenceIds(ids);
  const records = await Promise.all(
    canonicalIds.map(async id => {
      try {
        return await loadAlertSilence(id, signal);
      } catch (error) {
        if (alertSilenceFailureKind(error) === 'missing') return null;
        throw error;
      }
    })
  );
  return {
    records: records.filter((record): record is AlertSilence => record !== null),
    missingCount: records.filter(record => record === null).length
  };
}

export async function saveAlertSilence(draft: AlertSilenceDraft): Promise<AlertSilence> {
  const payload = buildAlertSilencePayload(draft);
  return alertSilenceApiRequest(async () => {
    const response =
      draft.id === undefined
        ? await apiMessagePost(alertSilenceEndpoint, payload)
        : await apiMessagePut(alertSilenceEndpoint, payload);
    return parseAlertSilenceDetail(response);
  });
}

export async function deleteAlertSilence(id: number) {
  return deleteAlertSilences([id]);
}

export async function deleteAlertSilences(ids: readonly number[]) {
  const commandIds = normalizeAlertSilenceIds(ids);
  const path = buildAlertSilenceDeletePath(commandIds);
  return alertSilenceApiRequest(async () => {
    const response = await apiMessageDelete(path);
    return parseAlertSilenceDeleteReceipt(response, commandIds);
  });
}

export async function updateAlertSilenceEnabled(silence: AlertSilence, enable: boolean): Promise<void> {
  const payload = buildAlertSilenceTogglePayload(silence, enable);
  await alertSilenceApiRequest(() => apiMessagePut(alertSilenceEndpoint, payload));
}
