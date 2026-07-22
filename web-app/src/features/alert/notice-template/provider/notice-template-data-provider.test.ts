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

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { noticeApiEndpoint } from '../../api/notice-api-endpoints';
import { type NoticeTemplate, type NoticeTemplateResourceRecord } from '../../notice-template-model';

type NoticeTemplateApi = typeof import('../../api/notice-template-api');
const api = vi.hoisted(() => ({
  deleteNoticeTemplate: vi.fn<NoticeTemplateApi['deleteNoticeTemplate']>(),
  loadNoticeTemplate: vi.fn<NoticeTemplateApi['loadNoticeTemplate']>(),
  loadNoticeTemplates: vi.fn<NoticeTemplateApi['loadNoticeTemplates']>(),
  saveNoticeTemplate: vi.fn<NoticeTemplateApi['saveNoticeTemplate']>()
}));
vi.mock('../../api/notice-template-api', async importOriginal => ({
  ...(await importOriginal<NoticeTemplateApi>()),
  ...api
}));

import { noticeTemplateCreateActionUrl } from '../../api/notice-template-resource';

import { noticeTemplateDataProvider } from './notice-template-data-provider';

const record: NoticeTemplate = {
  id: 42,
  name: 'Canonical',
  type: 1,
  preset: false,
  content: '${server}'
};
const resourceRecord: NoticeTemplateResourceRecord = {
  ...record,
  id: 'notice-template:custom:42',
  backendId: 42,
  preset: false
};
const query = { name: '', preset: false, pageIndex: 0, pageSize: 8 } as const;
const page = { content: [record], totalElements: 1, totalPages: 1, number: 0, size: 8 };

describe('Notice Template Refine data provider', () => {
  beforeEach(() => vi.clearAllMocks());

  it('maps only the supported list filters and 1-based pagination', async () => {
    api.loadNoticeTemplates.mockResolvedValue(page);

    await expect(
      noticeTemplateDataProvider.getList<NoticeTemplateResourceRecord>({
        resource: 'notice-templates',
        pagination: { currentPage: 1, pageSize: 8, mode: 'server' },
        filters: [
          { field: 'name', operator: 'contains', value: ' Canonical ' },
          { field: 'preset', operator: 'eq', value: false }
        ]
      })
    ).resolves.toEqual({ data: [resourceRecord], total: 1 });
    expect(api.loadNoticeTemplates).toHaveBeenCalledWith({
      name: 'Canonical',
      preset: false,
      pageIndex: 0,
      pageSize: 8
    });
    expect(noticeTemplateDataProvider.getApiUrl()).toBe(noticeApiEndpoint);
  });

  it('keeps preset ids UI-only even when a preset and custom template share the same backend number', async () => {
    const preset = { id: 42, name: 'Built-in:Email', type: 1 as const, preset: true, content: '${content}' };
    api.loadNoticeTemplates.mockResolvedValueOnce({
      content: [preset, record],
      totalElements: 2,
      totalPages: 1,
      number: 0,
      size: 8
    });

    await expect(
      noticeTemplateDataProvider.getList<NoticeTemplateResourceRecord>({
        resource: 'notice-templates',
        pagination: { currentPage: 1, pageSize: 8, mode: 'server' },
        filters: [{ field: 'preset', operator: 'eq', value: true }]
      })
    ).resolves.toEqual({
      data: [{ ...preset, id: 'notice-template:preset:1:Built-in%3AEmail', backendId: null }, resourceRecord],
      total: 2
    });
  });

  it('rejects a page with colliding UI resource ids', async () => {
    const preset = { name: 'Built-in:Email', type: 1 as const, preset: true, content: '${content}' };

    api.loadNoticeTemplates.mockResolvedValueOnce({
      content: [preset, { ...preset }],
      totalElements: 2,
      totalPages: 1,
      number: 0,
      size: 8
    });
    await expect(
      noticeTemplateDataProvider.getList<NoticeTemplateResourceRecord>({
        resource: 'notice-templates',
        pagination: { currentPage: 1, pageSize: 8, mode: 'server' },
        filters: [{ field: 'preset', operator: 'eq', value: true }]
      })
    ).rejects.toMatchObject({ code: 'NOTICE_TEMPLATE_RESOURCE_ID_COLLISION' });
  });

  it('rejects stale pagination evidence and impossible totals', async () => {
    api.loadNoticeTemplates.mockResolvedValueOnce({ ...page, number: 1 });
    await expect(
      noticeTemplateDataProvider.getList({
        resource: 'notice-templates',
        pagination: { currentPage: 1, pageSize: 8, mode: 'server' },
        filters: [{ field: 'preset', operator: 'eq', value: false }]
      })
    ).rejects.toMatchObject({ code: 'NOTICE_TEMPLATE_PAGE_MISMATCH' });

    api.loadNoticeTemplates.mockResolvedValueOnce({ ...page, size: 15 });
    await expect(
      noticeTemplateDataProvider.getList({
        resource: 'notice-templates',
        pagination: { currentPage: 1, pageSize: 8, mode: 'server' },
        filters: [{ field: 'preset', operator: 'eq', value: false }]
      })
    ).rejects.toMatchObject({ code: 'NOTICE_TEMPLATE_PAGE_MISMATCH' });

    api.loadNoticeTemplates.mockResolvedValueOnce({ ...page, totalElements: 0 });
    await expect(
      noticeTemplateDataProvider.getList({
        resource: 'notice-templates',
        pagination: { currentPage: 1, pageSize: 8, mode: 'server' },
        filters: [{ field: 'preset', operator: 'eq', value: false }]
      })
    ).rejects.toMatchObject({ code: 'NOTICE_TEMPLATE_TOTAL_INVALID' });

    api.loadNoticeTemplates.mockResolvedValueOnce({
      ...page,
      content: Array.from({ length: 9 }, (_value, index) => ({ ...record, id: 42 + index })),
      totalElements: 9
    });
    await expect(
      noticeTemplateDataProvider.getList({
        resource: 'notice-templates',
        pagination: { currentPage: 1, pageSize: 8, mode: 'server' },
        filters: [{ field: 'preset', operator: 'eq', value: false }]
      })
    ).rejects.toMatchObject({ code: 'NOTICE_TEMPLATE_PAGE_CONTENT_INVALID' });
  });

  it('returns the acknowledged update payload without hiding a later proof read', async () => {
    api.saveNoticeTemplate.mockResolvedValue(null);

    await expect(
      noticeTemplateDataProvider.update<NoticeTemplateResourceRecord>({
        resource: 'notice-templates',
        id: 42,
        variables: { id: 42, name: 'Request', type: 1, content: '${request}' }
      })
    ).resolves.toEqual({
      data: {
        id: 'notice-template:custom:42',
        backendId: 42,
        name: 'Request',
        type: 1,
        preset: false,
        content: '${request}'
      }
    });
    expect(api.saveNoticeTemplate).toHaveBeenCalledWith({
      id: 42,
      name: 'Request',
      type: 1,
      content: '${request}'
    });
    expect(api.loadNoticeTemplate).not.toHaveBeenCalled();
  });

  it('rejects a preset response as a custom canonical identity', async () => {
    api.loadNoticeTemplate.mockResolvedValue({ ...record, preset: true });

    await expect(
      noticeTemplateDataProvider.getOne<NoticeTemplateResourceRecord>({
        resource: 'notice-templates',
        id: 42
      })
    ).rejects.toMatchObject({ code: 'NOTICE_TEMPLATE_CANONICAL_IDENTITY_INVALID' });
  });

  it('preserves the server create response and never fabricates an acknowledgement or id', async () => {
    api.saveNoticeTemplate.mockResolvedValue(null);

    await expect(
      noticeTemplateDataProvider.custom?.({
        url: noticeTemplateCreateActionUrl,
        method: 'post',
        payload: { name: 'New', type: 1, content: '${content}' }
      })
    ).resolves.toEqual({ data: { response: null } });
    expect(api.saveNoticeTemplate).toHaveBeenCalledWith({ name: 'New', type: 1, content: '${content}' });
    expect(api.loadNoticeTemplate).not.toHaveBeenCalled();
    expect(api.loadNoticeTemplates).not.toHaveBeenCalled();
  });

  it('rejects ordinary create and inexact custom action wires before transport', async () => {
    await expect(
      noticeTemplateDataProvider.getList({
        resource: 'labels',
        filters: [{ field: 'preset', operator: 'eq', value: false }]
      })
    ).rejects.toMatchObject({
      code: 'NOTICE_TEMPLATE_RESOURCE_UNSUPPORTED',
      kind: 'invalid',
      writeOutcome: 'uncertain'
    });
    await expect(
      noticeTemplateDataProvider.create({ resource: 'notice-templates', variables: {} })
    ).rejects.toMatchObject({
      code: 'NOTICE_TEMPLATE_CREATE_UNSUPPORTED',
      kind: 'invalid',
      writeOutcome: 'rejected'
    });

    const unsupportedRequests = [
      { url: `${noticeTemplateCreateActionUrl}/other`, method: 'post' as const },
      { url: noticeTemplateCreateActionUrl, method: 'get' as const }
    ];
    for (const request of unsupportedRequests) {
      await expect(
        noticeTemplateDataProvider.custom?.({ ...request, payload: { name: 'New', type: 1, content: '${content}' } })
      ).rejects.toMatchObject({
        code: 'NOTICE_TEMPLATE_CUSTOM_ACTION_UNSUPPORTED',
        kind: 'invalid',
        writeOutcome: 'rejected'
      });
    }
    expect(api.loadNoticeTemplates).not.toHaveBeenCalled();
    expect(api.saveNoticeTemplate).not.toHaveBeenCalled();
  });

  it('keeps delete mutation separate from both exact preflight and missing-detail proof', async () => {
    api.deleteNoticeTemplate.mockResolvedValue(undefined);

    await expect(
      noticeTemplateDataProvider.deleteOne<NoticeTemplateResourceRecord>({
        resource: 'notice-templates',
        id: 42,
        variables: { record: resourceRecord, query }
      })
    ).resolves.toEqual({ data: resourceRecord });
    expect(api.loadNoticeTemplate).not.toHaveBeenCalled();
    expect(api.loadNoticeTemplates).not.toHaveBeenCalled();
  });
});
