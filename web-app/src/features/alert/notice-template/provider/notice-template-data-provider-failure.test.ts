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
import { createRefineHttpError } from '@/shared/refine/refine-http-error';

import { NoticeTemplateRequestFailure } from '../../model/notice-template-failure';
import { NoticeTemplateContractError } from '../../notice-template-model';

type NoticeTemplateApi = typeof import('../../notice-template-api');
const api = vi.hoisted(() => ({
  loadNoticeTemplate: vi.fn<NoticeTemplateApi['loadNoticeTemplate']>(),
  loadNoticeTemplates: vi.fn<NoticeTemplateApi['loadNoticeTemplates']>(),
  saveNoticeTemplate: vi.fn<NoticeTemplateApi['saveNoticeTemplate']>()
}));
vi.mock('../../notice-template-api', async importOriginal => ({
  ...(await importOriginal<NoticeTemplateApi>()),
  ...api
}));

import { noticeTemplateDataProvider } from './notice-template-data-provider';
import {
  normalizeNoticeTemplateProviderFailure,
  readNoticeTemplateWriteInput
} from './notice-template-data-provider-failure';

describe('Notice Template provider failure normalization', () => {
  beforeEach(() => vi.clearAllMocks());

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
