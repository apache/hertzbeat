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
  buildNoticeTemplatePayload,
  parseNoticeTemplateDetail,
  parseNoticeTemplatePage,
  writeNoticeTemplateQuery,
  type NoticeTemplateDraft,
  type NoticeTemplateQuery
} from './notice-template-model';
import { noticeTemplateEndpoint, noticeTemplatesEndpoint } from './notice-api-endpoints';
import { noticeTemplateCreateActionUrl } from './notice-template-resource';
import { noticeTemplateApiRequest } from './api/notice-template-api-failure';

export async function loadNoticeTemplates(query: NoticeTemplateQuery) {
  return noticeTemplateApiRequest('collection', async () => {
    const response = await apiMessageGet(`${noticeTemplatesEndpoint}?${writeNoticeTemplateQuery(query).toString()}`);
    return parseNoticeTemplatePage(response);
  });
}

export async function loadNoticeTemplate(id: number) {
  return noticeTemplateApiRequest('detail', async () => {
    const response = await apiMessageGet(noticeTemplateDetailEndpoint(id));
    return parseNoticeTemplateDetail(response);
  });
}

export async function saveNoticeTemplate(draft: NoticeTemplateDraft) {
  await noticeTemplateApiRequest('write', () => {
    const payload = buildNoticeTemplatePayload(draft);
    return draft.id
      ? apiMessagePut(noticeTemplateCreateActionUrl, payload)
      : apiMessagePost(noticeTemplateCreateActionUrl, payload);
  });
}

export async function deleteNoticeTemplate(id: number) {
  await noticeTemplateApiRequest('write', () => apiMessageDelete(noticeTemplateDetailEndpoint(id)));
}

function noticeTemplateDetailEndpoint(id: number) {
  return `${noticeTemplateEndpoint}/${id}`;
}
