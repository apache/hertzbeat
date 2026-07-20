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

import { ApiMessageError } from '@/core/http/api-message';
import { noticeApiEndpoint } from '@/features/alert/notice-api-endpoints';
import { NoticeTemplateRequestFailure } from '@/features/alert/model/notice-template-failure';
import {
  NoticeTemplateContractError,
  type NoticeTemplate,
  type NoticeTemplateResourceRecord
} from '@/features/alert/notice-template-model';

type NoticeTemplateApi = typeof import('@/features/alert/notice-template-api');
const api = vi.hoisted(() => ({
  deleteNoticeTemplate: vi.fn<NoticeTemplateApi['deleteNoticeTemplate']>(),
  loadNoticeTemplate: vi.fn<NoticeTemplateApi['loadNoticeTemplate']>(),
  loadNoticeTemplates: vi.fn<NoticeTemplateApi['loadNoticeTemplates']>(),
  saveNoticeTemplate: vi.fn<NoticeTemplateApi['saveNoticeTemplate']>()
}));
vi.mock('@/features/alert/notice-template-api', async importOriginal => ({
  ...(await importOriginal<NoticeTemplateApi>()),
  ...api
}));

import { noticeTemplateCreateActionUrl } from '@/features/alert/notice-template-resource';

import { createRefineHttpError } from '../refine-http-error';
import { noticeTemplateDataProvider } from './notice-template-data-provider';
import {
  normalizeNoticeTemplateProviderFailure,
  readNoticeTemplateWriteInput
} from './notice-template-data-provider-failure';
import {
  readNoticeTemplateDeleteVariables,
  readNoticeTemplateDraft,
  readNoticeTemplateId,
  readNoticeTemplateListQuery
} from './notice-template-data-provider-input';

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
    api.saveNoticeTemplate.mockResolvedValue(undefined);

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

  it('uses only an exact custom acknowledgement for create and never guesses an id', async () => {
    api.saveNoticeTemplate.mockResolvedValue(undefined);

    await expect(
      noticeTemplateDataProvider.custom?.({
        url: noticeTemplateCreateActionUrl,
        method: 'post',
        payload: { name: 'New', type: 1, content: '${content}' }
      })
    ).resolves.toEqual({ data: { acknowledged: true } });
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

  it('keeps missing detail and invalid response contracts distinguishable', async () => {
    api.loadNoticeTemplate
      .mockRejectedValueOnce(new ApiMessageError('private', { code: 15, status: 200 }))
      .mockRejectedValueOnce(
        new NoticeTemplateRequestFailure('missing', 'rejected', { code: 'NOTICE_TEMPLATE_NOT_FOUND' })
      )
      .mockRejectedValueOnce(new NoticeTemplateContractError());

    await expect(noticeTemplateDataProvider.getOne({ resource: 'notice-templates', id: 42 })).rejects.toMatchObject({
      kind: 'missing',
      writeOutcome: 'uncertain'
    });
    await expect(noticeTemplateDataProvider.getOne({ resource: 'notice-templates', id: 42 })).rejects.toMatchObject({
      code: 'NOTICE_TEMPLATE_NOT_FOUND',
      kind: 'missing',
      writeOutcome: 'uncertain'
    });
    await expect(noticeTemplateDataProvider.getOne({ resource: 'notice-templates', id: 42 })).rejects.toMatchObject({
      code: 'NOTICE_TEMPLATE_RESPONSE_INVALID',
      kind: 'invalid',
      writeOutcome: 'uncertain'
    });
  });

  it.each([
    [
      'HTTP-success business envelope',
      createRefineHttpError('private', 400, 15, 'envelope', 200),
      'write',
      'error',
      'uncertain'
    ],
    ['display-only contract 400', createRefineHttpError('private', 400), 'write', 'error', 'uncertain'],
    [
      'missing source status',
      createRefineHttpError('private', 400, undefined, 'http'),
      'write',
      'unavailable',
      'uncertain'
    ],
    ['timeout', createRefineHttpError('private', 408, undefined, 'http', 408), 'write', 'error', 'uncertain'],
    [
      'source HTTP rejection',
      createRefineHttpError('private', 400, undefined, 'http', 400),
      'write',
      'error',
      'rejected'
    ],
    [
      'server failure',
      createRefineHttpError('private', 503, undefined, 'http', 503),
      'write',
      'unavailable',
      'uncertain'
    ],
    [
      'zero source status',
      createRefineHttpError('private', 0, undefined, 'http', 0),
      'write',
      'unavailable',
      'uncertain'
    ],
    [
      'network',
      createRefineHttpError('private', 0, 'NOTICE_TEMPLATE_NETWORK_FAILED', 'network'),
      'write',
      'unavailable',
      'uncertain'
    ],
    [
      'server failure carrying a stable code',
      createRefineHttpError('private', 503, 'NOTICE_TEMPLATE_SERVER_FAILED', 'http', 503),
      'write',
      'unavailable',
      'uncertain'
    ],
    [
      'unexpected',
      createRefineHttpError('private', 500, 'REFINE_UNEXPECTED_ERROR', 'unexpected'),
      'write',
      'error',
      'uncertain'
    ],
    [
      'detail source 404',
      createRefineHttpError('private', 404, undefined, 'http', 404),
      'detail',
      'missing',
      'uncertain'
    ],
    [
      'cause-bearing detail source 404',
      withCause(createRefineHttpError('private', 404, undefined, 'http', 404)),
      'detail',
      'unavailable',
      'uncertain'
    ],
    [
      'cause-bearing exact missing envelope',
      withCause(createRefineHttpError('private', 400, 15, 'envelope', 200)),
      'detail',
      'unavailable',
      'uncertain'
    ],
    [
      'cause-bearing source HTTP rejection',
      withCause(createRefineHttpError('private', 422, 'NOTICE_TEMPLATE_PRIVATE', 'http', 422)),
      'write',
      'unavailable',
      'uncertain'
    ],
    [
      'collection source 404',
      createRefineHttpError('private', 404, undefined, 'http', 404),
      'collection',
      'error',
      'uncertain'
    ]
  ] as const)('normalizes Refine %s evidence', async (_label, reason, phase, kind, writeOutcome) => {
    if (phase === 'write') api.saveNoticeTemplate.mockRejectedValueOnce(reason);
    if (phase === 'detail') api.loadNoticeTemplate.mockRejectedValueOnce(reason);
    if (phase === 'collection') api.loadNoticeTemplates.mockRejectedValueOnce(reason);

    await expect(requestForPhase(phase)).rejects.toMatchObject({ kind, writeOutcome });
  });

  it('does not convert cause-bearing local-looking input evidence into a rewrite', () => {
    const reason = withCause(
      createRefineHttpError('private', 400, 'NOTICE_TEMPLATE_VARIABLES_INVALID', 'contract', 400)
    );
    let preserved: unknown;
    try {
      readNoticeTemplateWriteInput(() => {
        throw reason;
      });
    } catch (failure) {
      preserved = failure;
    }

    expect(preserved).toBe(reason);
    expect(normalizeNoticeTemplateProviderFailure(preserved, 'write')).toMatchObject({
      kind: 'unavailable',
      writeOutcome: 'uncertain'
    });
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

function requestForPhase(phase: 'write' | 'detail' | 'collection') {
  switch (phase) {
    case 'write':
      return noticeTemplateDataProvider.update({
        resource: 'notice-templates',
        id: 42,
        variables: { id: 42, name: 'Request', type: 1, content: '${request}' }
      });
    case 'detail':
      return noticeTemplateDataProvider.getOne({ resource: 'notice-templates', id: 42 });
    case 'collection':
      return noticeTemplateDataProvider.getList({
        resource: 'notice-templates',
        pagination: { currentPage: 1, pageSize: 8, mode: 'server' },
        filters: [{ field: 'preset', operator: 'eq', value: false }]
      });
  }
}

function withCause<T extends Error>(error: T) {
  Object.defineProperty(error, 'cause', { value: new Error('private transport cause') });
  return error;
}

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
