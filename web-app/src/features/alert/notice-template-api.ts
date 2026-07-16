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

import {
  buildNoticeTemplateListPath,
  buildNoticeTemplatePayload,
  parseNoticeTemplateDetail,
  parseNoticeTemplatePage,
  type NoticeTemplateDraft,
  type NoticeTemplateQuery
} from './notice-template-model';

export async function loadNoticeTemplates(query: NoticeTemplateQuery) {
  const response = await apiMessageGet<unknown>(buildNoticeTemplateListPath(query));
  return parseNoticeTemplatePage(response);
}

export async function loadNoticeTemplate(id: number) {
  const response = await apiMessageGet<unknown>(`/api/notice/template/${id}`);
  return parseNoticeTemplateDetail(response);
}

export async function saveNoticeTemplate(draft: NoticeTemplateDraft) {
  const payload = buildNoticeTemplatePayload(draft);
  if (draft.id) await apiMessagePut<unknown>('/api/notice/template', payload);
  else await apiMessagePost<unknown>('/api/notice/template', payload);
}

export async function deleteNoticeTemplate(id: number) {
  await apiMessageDelete<unknown>(`/api/notice/template/${id}`);
}
