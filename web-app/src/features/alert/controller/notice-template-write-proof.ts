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

import type { DataProvider } from '@refinedev/core';

import {
  buildNoticeTemplatePayload,
  type NoticeTemplateDraft,
  type NoticeTemplateResourceRecord
} from '../model/notice-template-model';
import { noticeTemplateResourceName } from '../api/notice-template-resource';
import { classifyNoticeTemplateDetailFailure } from '../model/notice-template-failure';

class NoticeTemplateWriteProofError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NoticeTemplateWriteProofError';
  }
}

/** Completes the exact read before DELETE so transport failure cannot be mistaken for an ambiguous write. */
export async function preflightNoticeTemplateDeletion(provider: DataProvider, template: NoticeTemplateResourceRecord) {
  if (template.backendId == null || !provider.getOne) {
    throw new NoticeTemplateWriteProofError('Delete preflight is unavailable');
  }
  const response = await provider.getOne<NoticeTemplateResourceRecord>({
    resource: noticeTemplateResourceName,
    id: template.backendId
  });
  if (response.data.backendId !== template.backendId || response.data.id !== template.id || response.data.preset) {
    throw new NoticeTemplateWriteProofError('Delete preflight returned a different template identity');
  }
}

/** Proves the exact id and full mutable payload written by the acknowledged PUT. */
export async function proveNoticeTemplateUpdate(provider: DataProvider, draft: NoticeTemplateDraft) {
  if (draft.id == null || !provider.getOne) throw new NoticeTemplateWriteProofError('Update proof is unavailable');
  const response = await provider.getOne<NoticeTemplateResourceRecord>({
    resource: noticeTemplateResourceName,
    id: draft.id
  });
  const expected = buildNoticeTemplatePayload(draft);
  const actual = response.data;
  if (
    actual.backendId !== draft.id ||
    actual.preset ||
    actual.name !== expected.name ||
    actual.type !== expected.type ||
    actual.content !== expected.content
  ) {
    throw new NoticeTemplateWriteProofError('Update proof does not match the acknowledged payload');
  }
}

/** A 404 from the exact detail endpoint is the only accepted deletion proof. */
export async function proveNoticeTemplateDeletion(provider: DataProvider, id: number) {
  if (!provider.getOne) throw new NoticeTemplateWriteProofError('Delete proof is unavailable');
  try {
    await provider.getOne<NoticeTemplateResourceRecord>({ resource: noticeTemplateResourceName, id });
  } catch (reason) {
    if (classifyNoticeTemplateDetailFailure(reason) === 'missing') return;
    throw reason;
  }
  throw new NoticeTemplateWriteProofError('Deleted template is still returned by its exact detail endpoint');
}
