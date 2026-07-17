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

import { loadAllNoticeReceiverOptions } from './notice-receiver/api/notice-receiver-api';
import type { NoticeReceiverOption } from './notice-receiver/model/notice-receiver-model';
import {
  buildNoticeRuleListPath,
  buildNoticeRulePayload,
  type NoticeRule,
  type NoticeRuleDraft,
  type NoticeRuleQuery
} from './notice-rule-model';
import type { NoticeTemplate } from './notice-template-model';

export function loadNoticeRules(query: NoticeRuleQuery) {
  return apiMessageGet<PageResult<NoticeRule>>(buildNoticeRuleListPath(query));
}

export function loadNoticeRule(id: number) {
  return apiMessageGet<NoticeRule>(`/api/notice/rule/${id}`);
}

export function loadAllNoticeReceivers() {
  return loadAllNoticeReceiverOptions();
}

export function loadAllNoticeTemplates() {
  return apiMessageGet<NoticeTemplate[]>('/api/notice/templates/all');
}

export function saveNoticeRule(draft: NoticeRuleDraft, receivers: NoticeReceiverOption[], templates: NoticeTemplate[]) {
  const payload = buildNoticeRulePayload(draft, receivers, templates);
  return draft.id
    ? apiMessagePut<unknown>('/api/notice/rule', payload)
    : apiMessagePost<unknown>('/api/notice/rule', payload);
}

export function deleteNoticeRule(id: number) {
  return apiMessageDelete<unknown>(`/api/notice/rule/${id}`);
}
