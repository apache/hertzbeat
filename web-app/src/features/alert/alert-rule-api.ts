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
  AlertRuleContractError,
  AlertRuleMissingError,
  buildAlertRulePayload,
  buildAlertRulePreviewRequest,
  buildAlertRuleTogglePayload,
  type AlertRule,
  type AlertRuleDraft,
  type AlertRuleQuery
} from './alert-rule-model';
import { parseAlertRuleDetail, parseAlertRulePage, parseAlertRulePreview } from './alert-rule-schema';

export function buildAlertRuleListPath(query: AlertRuleQuery) {
  const params = new URLSearchParams({
    pageIndex: String(query.pageIndex), pageSize: String(query.pageSize), sort: 'id', order: 'desc'
  });
  // Spring decodes the parameter before the service deliberately URL-decodes it again.
  if (query.search.trim()) params.set('search', encodeURIComponent(JSON.stringify([query.search.trim()])));
  return `/api/alert/defines?${params.toString()}`;
}

export async function loadAlertRules(query: AlertRuleQuery) {
  const response = await apiMessageGet<unknown>(buildAlertRuleListPath(query));
  return parseAlertRulePage(response, query);
}

export async function loadAlertRule(id: string | number) {
  const normalizedId = normalizeId(id);
  const response = await apiMessageGet<unknown>(`/api/alert/define/${normalizedId}`);
  const detail = parseAlertRuleDetail(response);
  if (detail.id !== normalizedId) throw new AlertRuleContractError('detail id does not match the endpoint');
  return detail;
}

export async function saveAlertRule(mode: 'new' | 'edit', draft: AlertRuleDraft): Promise<void> {
  if (mode === 'new' && draft.id !== undefined) throw new AlertRuleContractError('create must not carry an id');
  if (mode === 'edit' && draft.id === undefined) throw new AlertRuleContractError('update requires an id');
  const payload = buildAlertRulePayload(draft);
  if (mode === 'new') await apiMessagePost<unknown>('/api/alert/define', payload);
  else await apiMessagePut<unknown>('/api/alert/define', payload);
}

export async function deleteAlertRules(ids: number[]): Promise<void> {
  if (ids.length === 0) throw new AlertRuleContractError('delete requires at least one id');
  const uniqueIds = [...new Set(ids.map(normalizeId))];
  const params = new URLSearchParams();
  uniqueIds.forEach(id => params.append('ids', String(id)));
  await apiMessageDelete<unknown>(`/api/alert/defines?${params.toString()}`);
}

export async function updateAlertRuleEnabled(rule: AlertRule, enable: boolean): Promise<void> {
  await apiMessagePut<unknown>('/api/alert/define', buildAlertRuleTogglePayload(rule, enable));
}

export async function previewAlertRule(draft: AlertRuleDraft) {
  const request = buildAlertRulePreviewRequest(draft);
  const params = new URLSearchParams({ type: request.type, expr: request.expr });
  // The backend currently exposes preview only as GET, so the expression
  // remains in the URL until that contract supports a request body.
  const response = await apiMessageGet<unknown>(
    `/api/alert/define/preview/${encodeURIComponent(request.datasource)}?${params.toString()}`
  );
  return parseAlertRulePreview(response);
}

export function classifyAlertRuleReadError(reason: unknown): 'missing' | 'unavailable' | 'error' {
  if (reason instanceof AlertRuleMissingError) return 'missing';
  if (reason instanceof ApiMessageError) {
    if (reason.status === 404 || reason.status === 200 && reason.code === 3) return 'missing';
    if (reason.cause !== undefined || reason.status === undefined || [0, 502, 503, 504].includes(reason.status)) {
      return 'unavailable';
    }
  }
  return 'error';
}

function normalizeId(value: string | number) {
  if (typeof value === 'string' && !/^[1-9]\d*$/.test(value)) {
    throw new AlertRuleContractError('id must use canonical positive decimal notation');
  }
  const id = typeof value === 'number' ? value : Number(value);
  if (!Number.isSafeInteger(id) || id < 1) throw new AlertRuleContractError('id must be a positive integer');
  return id;
}
