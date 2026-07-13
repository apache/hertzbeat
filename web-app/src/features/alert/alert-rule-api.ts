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

import { buildAlertRuleListPath, buildAlertRulePayload, type AlertRule, type AlertRuleDraft, type AlertRuleQuery } from './alert-rule-model';

export function loadAlertRules(query: AlertRuleQuery) {
  return apiMessageGet<PageResult<AlertRule>>(buildAlertRuleListPath(query));
}

export function loadAlertRule(id: string) {
  return apiMessageGet<AlertRule>(`/api/alert/define/${encodeURIComponent(id)}`);
}

export function saveAlertRule(mode: 'new' | 'edit', draft: AlertRuleDraft) {
  const payload = buildAlertRulePayload(draft);
  return mode === 'new' ? apiMessagePost<unknown>('/api/alert/define', payload) : apiMessagePut<unknown>('/api/alert/define', payload);
}

export function deleteAlertRules(ids: number[]) {
  const params = new URLSearchParams();
  ids.forEach(id => params.append('ids', String(id)));
  return apiMessageDelete<unknown>(`/api/alert/defines?${params.toString()}`);
}

export function updateAlertRuleEnabled(rule: AlertRule, enable: boolean) {
  return apiMessagePut<unknown>('/api/alert/define', { ...rule, enable });
}

export function previewAlertRule(draft: AlertRuleDraft) {
  const payload = buildAlertRulePayload(draft);
  const params = new URLSearchParams({ type: payload.type, expr: payload.expr });
  return apiMessageGet<Array<Record<string, unknown>>>(`/api/alert/define/preview/${encodeURIComponent(payload.datasource)}?${params.toString()}`);
}
