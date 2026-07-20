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

import { describe, expect, it } from 'vitest';

import {
  buildNoticeTemplatePayload,
  createNoticeTemplateDraft,
  isNoticeTemplateReadOnly,
  noticeTemplateDraftFromDetail,
  noticeTemplateResourceRecord,
  readNoticeTemplateQuery,
  validateNoticeTemplateDraft,
  writeNoticeTemplateQuery
} from './notice-template-model';

describe('notice template model', () => {
  it('keeps preset ownership and zero-based pagination in the URL contract', () => {
    const query = readNoticeTemplateQuery(new URLSearchParams('name=Email&preset=false&pageIndex=2&pageSize=15'));

    expect(query).toEqual({ name: 'Email', preset: false, pageIndex: 2, pageSize: 15 });
    expect(writeNoticeTemplateQuery(query).toString()).toBe('name=Email&preset=false&pageIndex=2&pageSize=15');
  });

  it('builds a custom-only write payload without audit metadata', () => {
    const draft = noticeTemplateDraftFromDetail({
      id: 42,
      name: '  On-call webhook  ',
      type: 2,
      preset: false,
      content: '  ${title}  ',
      creator: 'admin',
      modifier: 'admin',
      gmtCreate: '2026-07-13T10:00:00',
      gmtUpdate: '2026-07-13T11:00:00'
    });

    expect(buildNoticeTemplatePayload(draft)).toEqual({
      id: 42,
      name: 'On-call webhook',
      type: 2,
      preset: false,
      content: '${title}'
    });
  });

  it('validates required content and all backend channel types', () => {
    const draft = createNoticeTemplateDraft();
    expect(validateNoticeTemplateDraft(draft)).toEqual(['name', 'content']);
    expect(validateNoticeTemplateDraft({ ...draft, name: 'Ntfy', type: 15 as never, content: '${content}' })).toEqual([
      'type'
    ]);
    expect(
      validateNoticeTemplateDraft({ ...draft, name: 'Invalid', type: 16 as never, content: '${content}' })
    ).toEqual(['type']);
  });

  it('keeps built-in templates read-only even though they do not have database ids', () => {
    expect(isNoticeTemplateReadOnly({ preset: true })).toBe(true);
    expect(isNoticeTemplateReadOnly({ preset: false })).toBe(false);
  });

  it('maps backend identity into a separate namespaced UI identity', () => {
    expect(
      noticeTemplateResourceRecord({
        id: 42,
        name: 'Built-in:Email',
        type: 1,
        preset: true,
        content: '${content}'
      })
    ).toMatchObject({
      id: 'notice-template:preset:1:Built-in%3AEmail',
      backendId: null,
      preset: true
    });
    expect(
      noticeTemplateResourceRecord({
        id: 42,
        name: 'Custom',
        type: 1,
        preset: false,
        content: '${content}'
      })
    ).toMatchObject({
      id: 'notice-template:custom:42',
      backendId: 42,
      preset: false
    });
  });
});
