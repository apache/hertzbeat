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

import type { NoticeTemplateResourceRecord } from '../../notice-template-model';

import {
  readNoticeTemplateDeleteVariables,
  readNoticeTemplateDraft,
  readNoticeTemplateId,
  readNoticeTemplateListQuery
} from './notice-template-data-provider-input';

const resourceRecord: NoticeTemplateResourceRecord = {
  id: 'notice-template:custom:42',
  backendId: 42,
  name: 'Canonical',
  type: 1,
  preset: false,
  content: '${server}'
};
const query = { name: '', preset: false, pageIndex: 0, pageSize: 8 } as const;

describe('Notice Template provider input boundary', () => {
  it('normalizes supported list input and rejects unsupported Refine controls', () => {
    expect(
      readNoticeTemplateListQuery({
        resource: 'notice-templates',
        pagination: { currentPage: 2, pageSize: 15, mode: 'server' },
        filters: [
          { field: 'name', operator: 'contains', value: ' Canonical ' },
          { field: 'preset', operator: 'eq', value: false }
        ]
      })
    ).toEqual({ name: 'Canonical', preset: false, pageIndex: 1, pageSize: 15 });

    expect(() =>
      readNoticeTemplateListQuery({
        resource: 'notice-templates',
        sorters: [{ field: 'name', order: 'asc' }],
        filters: [{ field: 'preset', operator: 'eq', value: false }]
      })
    ).toThrow(
      expect.objectContaining({
        code: 'NOTICE_TEMPLATE_SORT_UNSUPPORTED',
        statusCode: 400
      })
    );
    expect(() =>
      readNoticeTemplateListQuery({
        resource: 'notice-templates',
        filters: [{ field: 'preset', operator: 'ne', value: false }]
      })
    ).toThrow(
      expect.objectContaining({
        code: 'NOTICE_TEMPLATE_FILTER_UNSUPPORTED',
        statusCode: 400
      })
    );
  });

  it('strips unknown draft fields while preserving the established id contract', () => {
    expect(
      readNoticeTemplateDraft(
        {
          id: 42,
          name: 'Canonical',
          type: 1,
          content: '${server}',
          ignored: 'transport-only'
        },
        42
      )
    ).toEqual({ id: 42, name: 'Canonical', type: 1, content: '${server}' });

    expect(() =>
      readNoticeTemplateDraft(
        {
          id: 43,
          name: 'Canonical',
          type: 1,
          content: '${server}'
        },
        42
      )
    ).toThrow(
      expect.objectContaining({
        code: 'NOTICE_TEMPLATE_VARIABLES_INVALID',
        statusCode: 400
      })
    );
    expect(() =>
      readNoticeTemplateDraft({
        id: 42,
        name: 'Canonical',
        type: 1,
        content: '${server}'
      })
    ).toThrow(
      expect.objectContaining({
        code: 'NOTICE_TEMPLATE_VARIABLES_INVALID',
        statusCode: 400
      })
    );
  });

  it('preserves delete proof query evidence and distinguishes forbidden identity', () => {
    const proofQuery = { ...query, futureEvidence: 'kept' };
    expect(
      readNoticeTemplateDeleteVariables(
        {
          record: { ...resourceRecord, futureMetadata: 'ignored' },
          query: proofQuery,
          futureEnvelope: true
        },
        42
      )
    ).toEqual({ record: { ...resourceRecord, futureMetadata: 'ignored' }, query: proofQuery });

    expect(() =>
      readNoticeTemplateDeleteVariables(
        {
          record: { ...resourceRecord, id: 'notice-template:custom:43' },
          query
        },
        42
      )
    ).toThrow(
      expect.objectContaining({
        code: 'NOTICE_TEMPLATE_DELETE_FORBIDDEN',
        statusCode: 400
      })
    );
    expect(() =>
      readNoticeTemplateDeleteVariables(
        {
          record: resourceRecord,
          query: { ...query, pageIndex: -1 }
        },
        42
      )
    ).toThrow(
      expect.objectContaining({
        code: 'NOTICE_TEMPLATE_VARIABLES_INVALID',
        statusCode: 400
      })
    );
  });

  it('accepts only positive numeric backend ids', () => {
    expect(readNoticeTemplateId(42)).toBe(42);
    expect(() => readNoticeTemplateId('42')).toThrow(
      expect.objectContaining({
        code: 'NOTICE_TEMPLATE_ID_INVALID',
        statusCode: 400
      })
    );
  });
});
