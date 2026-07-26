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

import { alertInhibitApiRequest } from './alert-inhibit-api-failure';
import {
  buildAlertInhibitPayload,
  buildAlertInhibitTogglePayload,
  alertInhibitFailureKind,
  alertInhibitPrefillPageSize,
  normalizeAlertInhibitIds,
  AlertInhibitContractError,
  type AlertInhibit,
  type AlertInhibitDraft,
  type AlertInhibitQuery
} from '../model/alert-inhibit-model';
import { parseAlertInhibitDetail, parseAlertInhibitPage, parseAlertInhibitPrefillAlerts } from './alert-inhibit-schema';

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

export async function loadAlertInhibits(query: AlertInhibitQuery, signal?: AbortSignal) {
  const path = buildAlertInhibitListPath(query);
  const response = await alertInhibitApiRequest(
    () => (signal ? apiMessageGet(path, { signal }) : apiMessageGet(path)),
    signal
  );
  return parseAlertInhibitPage(response, query);
}

export async function loadAlertInhibit(id: number, signal?: AbortSignal) {
  const path = `/api/alert/inhibit/${id}`;
  const response = await alertInhibitApiRequest(
    () => (signal ? apiMessageGet(path, { signal }) : apiMessageGet(path)),
    signal
  );
  return parseAlertInhibitDetail(response);
}

export async function loadAlertInhibitPrefillAlerts(entityId: number, signal?: AbortSignal) {
  if (!Number.isSafeInteger(entityId) || entityId <= 0) {
    throw new AlertInhibitContractError('entity id must be a positive safe integer');
  }
  const params = new URLSearchParams({
    pageIndex: '0',
    pageSize: String(alertInhibitPrefillPageSize),
    status: 'firing'
  });
  const path = `/api/entities/${entityId}/alerts?${params.toString()}`;
  const response = await alertInhibitApiRequest(
    () => (signal ? apiMessageGet(path, { signal }) : apiMessageGet(path)),
    signal
  );
  return parseAlertInhibitPrefillAlerts(response);
}

export async function loadMatchedAlertInhibits(ids: number[], signal?: AbortSignal) {
  const canonicalIds = normalizeAlertInhibitIds(ids);
  const records = await Promise.all(
    canonicalIds.map(async id => {
      try {
        return await loadAlertInhibit(id, signal);
      } catch (error) {
        if (alertInhibitFailureKind(error) === 'missing') return null;
        throw error;
      }
    })
  );
  return {
    records: records.filter((record): record is AlertInhibit => record !== null),
    missingCount: records.filter(record => record === null).length
  };
}

export async function saveAlertInhibit(draft: AlertInhibitDraft): Promise<void> {
  const payload = buildAlertInhibitPayload(draft);
  if (draft.id) await alertInhibitApiRequest(() => apiMessagePut('/api/alert/inhibit', payload));
  else await alertInhibitApiRequest(() => apiMessagePost('/api/alert/inhibit', payload));
}

export async function deleteAlertInhibit(id: number): Promise<void> {
  await deleteAlertInhibits([id]);
}

export async function deleteAlertInhibits(ids: number[]): Promise<void> {
  const params = new URLSearchParams();
  normalizeAlertInhibitIds(ids).forEach(id => params.append('ids', String(id)));
  await alertInhibitApiRequest(() => apiMessageDelete(`/api/alert/inhibits?${params.toString()}`));
}

export async function updateAlertInhibitEnabled(inhibit: AlertInhibit, enable: boolean): Promise<void> {
  await alertInhibitApiRequest(() =>
    apiMessagePut('/api/alert/inhibit', buildAlertInhibitTogglePayload(inhibit, enable))
  );
}
