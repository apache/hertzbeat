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

import type { GetListParams } from '@refinedev/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiMessageError } from '@/core/http/api-message';
import { createRefineHttpError } from '@/shared/refine/refine-http-error';

import { noticeApiEndpoint } from '../../api/notice-api-endpoints';
import { NoticeReceiverContractError } from '../api/notice-receiver-api';
import { NoticeReceiverRequestFailure } from '../model/notice-receiver-failure';
import * as noticeReceiverModel from '../model/notice-receiver-model';
import { createNoticeReceiverDraft, type NoticeReceiverDraft } from '../model/notice-receiver-model';

const api = vi.hoisted(() => ({
  deleteNoticeReceiver: vi.fn(),
  loadNoticeReceiver: vi.fn(),
  loadNoticeReceivers: vi.fn(),
  saveNoticeReceiver: vi.fn()
}));
vi.mock('../api/notice-receiver-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/notice-receiver-api')>()),
  ...api
}));

import { noticeReceiverDataProvider } from './notice-receiver-data-provider';
import {
  normalizeNoticeReceiverProviderFailure,
  readNoticeReceiverWriteInput
} from './notice-receiver-data-provider-failure';
import {
  readNoticeReceiverDeleteRecord,
  readNoticeReceiverDraft,
  readNoticeReceiverId,
  readNoticeReceiverListQuery
} from './notice-receiver-data-provider-input';

const receiver = {
  id: 7,
  name: 'Pager',
  type: 1 as const,
  typeKey: 'email',
  options: { email: 'ops@example.test' },
  configuredSecrets: [],
  creator: null,
  modifier: null,
  gmtCreate: null,
  gmtUpdate: null
};
const draft = {
  ...createNoticeReceiverDraft(),
  name: 'Pager',
  type: 1,
  email: 'ops@example.test'
} as NoticeReceiverDraft;

describe('Notice Receiver Refine data provider', () => {
  beforeEach(() => vi.clearAllMocks());

  it('maps Refine list pagination and name filter to the frozen page endpoint', async () => {
    api.loadNoticeReceivers.mockResolvedValue({
      content: [receiver],
      totalElements: 16,
      totalPages: 2,
      number: 1,
      size: 15
    });
    await expect(
      noticeReceiverDataProvider.getList({
        resource: 'notice-receivers',
        pagination: { currentPage: 2, pageSize: 15, mode: 'server' },
        filters: [{ field: 'name', operator: 'contains', value: ' Pager ' }]
      })
    ).resolves.toEqual({ data: [receiver], total: 16 });
    expect(api.loadNoticeReceivers).toHaveBeenCalledWith({ name: 'Pager', pageIndex: 1, pageSize: 15 });
    expect(noticeReceiverDataProvider.getApiUrl()).toBe(noticeApiEndpoint);
  });

  it('creates and updates pessimistically, then authoritatively rereads detail', async () => {
    api.saveNoticeReceiver
      .mockResolvedValueOnce({ id: 7, status: 'created', receiver })
      .mockResolvedValueOnce({ id: 7, status: 'updated', receiver });
    api.loadNoticeReceiver.mockResolvedValue(receiver);

    await expect(
      noticeReceiverDataProvider.create({ resource: 'notice-receivers', variables: draft })
    ).resolves.toEqual({ data: receiver });
    await expect(
      noticeReceiverDataProvider.update({ resource: 'notice-receivers', id: 7, variables: { ...draft, id: 7 } })
    ).resolves.toEqual({ data: receiver });
    expect(api.saveNoticeReceiver).toHaveBeenNthCalledWith(1, draft);
    expect(api.saveNoticeReceiver).toHaveBeenNthCalledWith(2, { ...draft, id: 7 });
    expect(api.loadNoticeReceiver).toHaveBeenCalledTimes(2);
  });

  it('preserves Receiver domain failures instead of collapsing them into an unexpected Refine error', async () => {
    const failure = new NoticeReceiverRequestFailure('unavailable', 'uncertain');
    api.loadNoticeReceiver.mockRejectedValueOnce(failure);

    let observed: unknown;
    try {
      await noticeReceiverDataProvider.getOne({ resource: 'notice-receivers', id: 7 });
    } catch (reason) {
      observed = reason;
    }

    expect(observed).toBe(failure);
  });

  it('carries acknowledged mutation identity only through typed domain evidence', async () => {
    const mutation = { id: 7, status: 'updated' as const, receiver };
    api.saveNoticeReceiver.mockResolvedValueOnce(mutation);
    api.loadNoticeReceiver.mockRejectedValueOnce(new NoticeReceiverRequestFailure('unavailable', 'uncertain'));

    let observed: unknown;
    try {
      await noticeReceiverDataProvider.update({
        resource: 'notice-receivers',
        id: 7,
        variables: { ...draft, id: 7 }
      });
    } catch (reason) {
      observed = reason;
    }

    expect(observed).toBeInstanceOf(NoticeReceiverRequestFailure);
    expect(observed).toMatchObject({
      kind: 'unavailable',
      writeOutcome: 'uncertain',
      mutation
    });
    expect(observed).not.toHaveProperty('noticeReceiverMutation');
    expect(observed).not.toHaveProperty('statusCode');
  });

  it('fails closed on missing mutation or mismatched canonical reread', async () => {
    api.saveNoticeReceiver
      .mockResolvedValueOnce({ id: 7, status: 'missing', receiver: null })
      .mockResolvedValueOnce({ id: 7, status: 'updated', receiver });
    api.loadNoticeReceiver.mockResolvedValue({ ...receiver, name: 'Different' });

    await expect(
      noticeReceiverDataProvider.update({ resource: 'notice-receivers', id: 7, variables: { ...draft, id: 7 } })
    ).rejects.toMatchObject({ code: 'NOTICE_RECEIVER_MISSING' });
    await expect(
      noticeReceiverDataProvider.update({ resource: 'notice-receivers', id: 7, variables: { ...draft, id: 7 } })
    ).rejects.toMatchObject({ code: 'NOTICE_RECEIVER_REREAD_INVALID' });
  });

  it('preserves acknowledged mutation identity when the canonical reread cannot complete', async () => {
    const secretDraft = {
      ...createNoticeReceiverDraft(),
      name: 'Gateway',
      type: 2 as const,
      hookUrl: 'private-hook-value',
      hookAuthType: 'Bearer' as const,
      hookAuthToken: 'private-token-value'
    };
    const mutation = {
      id: 7,
      status: 'created' as const,
      receiver: {
        ...receiver,
        name: 'Gateway',
        type: 2 as const,
        typeKey: 'webhook',
        options: { hookAuthType: 'Bearer' as const },
        configuredSecrets: ['hookUrl' as const, 'hookAuthToken' as const]
      }
    };
    api.saveNoticeReceiver.mockResolvedValueOnce(mutation);
    api.loadNoticeReceiver.mockRejectedValueOnce(new ApiMessageError('network failed'));

    let failure: unknown;
    try {
      await noticeReceiverDataProvider.create({ resource: 'notice-receivers', variables: secretDraft });
    } catch (reason) {
      failure = reason;
    }
    expect(failure).toMatchObject({
      kind: 'unavailable',
      writeOutcome: 'uncertain',
      mutation
    });
    expect(failure).not.toHaveProperty('noticeReceiverMutation');
    expect(failure).not.toHaveProperty('statusCode');
    const serializedFailure = JSON.stringify(failure);
    expect(serializedFailure).not.toContain('private-hook-value');
    expect(serializedFailure).not.toContain('private-token-value');
    expect(api.saveNoticeReceiver).toHaveBeenCalledTimes(1);
  });

  it('rejects canonical reread that drops public options or does not converge secret names', async () => {
    const webhookDraft = {
      ...createNoticeReceiverDraft(),
      name: 'Gateway',
      type: 2 as const,
      hookUrl: 'new-hook',
      hookAuthType: 'Bearer' as const,
      hookAuthToken: 'new-token'
    };
    const mutationReceiver = {
      ...receiver,
      name: 'Gateway',
      type: 2 as const,
      typeKey: 'webhook',
      options: { hookAuthType: 'Bearer' as const },
      configuredSecrets: ['hookUrl' as const, 'hookAuthToken' as const]
    };
    api.saveNoticeReceiver.mockResolvedValue({ id: 7, status: 'created', receiver: mutationReceiver });
    api.loadNoticeReceiver
      .mockResolvedValueOnce({ ...mutationReceiver, options: { hookAuthType: 'None' as const } })
      .mockResolvedValueOnce({ ...mutationReceiver, configuredSecrets: ['hookUrl' as const] })
      .mockResolvedValueOnce({
        ...mutationReceiver,
        configuredSecrets: ['hookUrl' as const, 'hookUrl' as const]
      });

    await expect(
      noticeReceiverDataProvider.create({ resource: 'notice-receivers', variables: webhookDraft })
    ).rejects.toMatchObject({ code: 'NOTICE_RECEIVER_REREAD_INVALID' });
    await expect(
      noticeReceiverDataProvider.create({ resource: 'notice-receivers', variables: webhookDraft })
    ).rejects.toMatchObject({ code: 'NOTICE_RECEIVER_REREAD_INVALID' });
    await expect(
      noticeReceiverDataProvider.create({ resource: 'notice-receivers', variables: webhookDraft })
    ).rejects.toMatchObject({ code: 'NOTICE_RECEIVER_REREAD_INVALID' });
  });

  it('uses confirmed deleted mutation evidence without a redundant detail reread', async () => {
    const deleteVariables = Object.assign(Object.create({ inheritedSecret: 'private-inherited' }), receiver, {
      authorization: 'private-authorization'
    }) as unknown;
    api.deleteNoticeReceiver.mockResolvedValue({ id: 7, status: 'deleted', receiver: null });
    await expect(
      noticeReceiverDataProvider.deleteOne({ resource: 'notice-receivers', id: 7, variables: deleteVariables })
    ).resolves.toEqual({ data: { id: 7 } });
    expect(api.deleteNoticeReceiver).toHaveBeenCalledWith(7);
    expect(api.loadNoticeReceiver).not.toHaveBeenCalled();
  });

  it('maps secret-bearing API evidence to stable typed domain evidence', async () => {
    api.saveNoticeReceiver.mockRejectedValue(new NoticeReceiverContractError());
    await expect(
      noticeReceiverDataProvider.create({ resource: 'notice-receivers', variables: draft })
    ).rejects.toMatchObject({
      code: 'NOTICE_RECEIVER_RESPONSE_INVALID',
      kind: 'invalid',
      writeOutcome: 'uncertain'
    });
  });

  it('rejects unsupported resources, sorters, filters, ids, and variables before transport', async () => {
    await expect(noticeReceiverDataProvider.getList({ resource: 'labels' })).rejects.toMatchObject({
      code: 'NOTICE_RECEIVER_RESOURCE_UNSUPPORTED'
    });
    await expect(
      noticeReceiverDataProvider.getList({ resource: 'notice-receivers', sorters: [{ field: 'name', order: 'asc' }] })
    ).rejects.toMatchObject({ code: 'NOTICE_RECEIVER_SORT_UNSUPPORTED' });
    await expect(noticeReceiverDataProvider.getOne({ resource: 'notice-receivers', id: '7' })).rejects.toMatchObject({
      code: 'NOTICE_RECEIVER_ID_INVALID'
    });
    await expect(
      noticeReceiverDataProvider.create({ resource: 'notice-receivers', variables: {} })
    ).rejects.toMatchObject({
      code: 'NOTICE_RECEIVER_VARIABLES_INVALID',
      kind: 'invalid',
      writeOutcome: 'rejected'
    });
    await expect(
      noticeReceiverDataProvider.update({ resource: 'notice-receivers', id: '7', variables: draft })
    ).rejects.toMatchObject({
      code: 'NOTICE_RECEIVER_ID_INVALID',
      kind: 'invalid',
      writeOutcome: 'rejected'
    });
    await expect(
      noticeReceiverDataProvider.deleteOne({
        resource: 'notice-receivers',
        id: 7,
        variables: { ...receiver, id: 8 }
      })
    ).rejects.toMatchObject({
      code: 'NOTICE_RECEIVER_VARIABLES_INVALID',
      kind: 'invalid',
      writeOutcome: 'rejected'
    });
    expect(api.loadNoticeReceivers).not.toHaveBeenCalled();
    expect(api.loadNoticeReceiver).not.toHaveBeenCalled();
    expect(api.saveNoticeReceiver).not.toHaveBeenCalled();
    expect(api.deleteNoticeReceiver).not.toHaveBeenCalled();
  });

  it.each([
    [
      'display-only envelope status',
      createRefineHttpError('private', 404, 15, 'envelope', 200),
      'write',
      'error',
      'uncertain'
    ],
    [
      'detail envelope with a display 404',
      createRefineHttpError('private', 404, 15, 'envelope', 200),
      'detail',
      'error',
      'uncertain'
    ],
    [
      'network with a display 404',
      createRefineHttpError('private', 404, 'NOTICE_RECEIVER_MISSING', 'network'),
      'write',
      'unavailable',
      'uncertain'
    ],
    [
      'cause-bearing detail source 404',
      Object.assign(createRefineHttpError('private', 404, undefined, 'http', 404), {
        cause: new Error('private-cause')
      }),
      'detail',
      'unavailable',
      'uncertain'
    ],
    [
      'cause-bearing write source 422',
      Object.assign(createRefineHttpError('private', 422, undefined, 'http', 422), {
        cause: new Error('private-cause')
      }),
      'write',
      'unavailable',
      'uncertain'
    ],
    [
      'cause-bearing write source with a stable receiver code',
      Object.assign(createRefineHttpError('private', 422, 'NOTICE_RECEIVER_MISSING', 'http', 422), {
        cause: new Error('private-cause')
      }),
      'write',
      'unavailable',
      'uncertain'
    ],
    ['HTTP timeout', createRefineHttpError('private', 408, undefined, 'http', 408), 'write', 'error', 'uncertain'],
    [
      'missing source status',
      createRefineHttpError('private', 404, 'NOTICE_RECEIVER_MISSING', 'http'),
      'write',
      'unavailable',
      'uncertain'
    ],
    [
      'zero source status',
      createRefineHttpError('private', 0, 'NOTICE_RECEIVER_MISSING', 'http', 0),
      'write',
      'unavailable',
      'uncertain'
    ],
    [
      'server source status',
      createRefineHttpError('private', 503, 'NOTICE_RECEIVER_MISSING', 'http', 503),
      'write',
      'unavailable',
      'uncertain'
    ],
    [
      'source rejection with a business code',
      createRefineHttpError('private', 400, 15, 'http', 422),
      'write',
      'error',
      'rejected'
    ],
    [
      'detail source rejection',
      createRefineHttpError('private', 422, undefined, 'http', 422),
      'detail',
      'error',
      'uncertain'
    ],
    [
      'collection source rejection',
      createRefineHttpError('private', 422, undefined, 'http', 422),
      'collection',
      'error',
      'uncertain'
    ],
    [
      'exact detail source missing',
      createRefineHttpError('private', 404, undefined, 'http', 404),
      'detail',
      'missing',
      'uncertain'
    ]
  ] as const)('normalizes Refine %s evidence', async (_label, reason, phase, kind, writeOutcome) => {
    if (phase === 'write') api.saveNoticeReceiver.mockRejectedValueOnce(reason);
    if (phase === 'detail') api.loadNoticeReceiver.mockRejectedValueOnce(reason);
    if (phase === 'collection') api.loadNoticeReceivers.mockRejectedValueOnce(reason);

    await expect(requestForPhase(phase)).rejects.toMatchObject({ kind, writeOutcome });
  });
});

function requestForPhase(phase: 'write' | 'detail' | 'collection') {
  switch (phase) {
    case 'write':
      return noticeReceiverDataProvider.create({ resource: 'notice-receivers', variables: draft });
    case 'detail':
      return noticeReceiverDataProvider.getOne({ resource: 'notice-receivers', id: 7 });
    case 'collection':
      return noticeReceiverDataProvider.getList({ resource: 'notice-receivers' });
  }
}

describe('Notice Receiver provider input boundary', () => {
  it('does not turn a cause-bearing contract failure into safe pretransport rejection', () => {
    const reason = Object.assign(
      createRefineHttpError('private', 400, 'NOTICE_RECEIVER_VARIABLES_INVALID', 'contract'),
      { cause: new Error('private-cause') }
    );

    let observed: unknown;
    try {
      readNoticeReceiverWriteInput(() => {
        throw reason;
      });
    } catch (failure) {
      observed = failure;
    }

    expect(observed).toBe(reason);
    expect(normalizeNoticeReceiverProviderFailure(observed, 'write')).toMatchObject({
      kind: 'unavailable',
      writeOutcome: 'uncertain'
    });
  });

  it('keeps list normalization and every established unsupported or invalid error code', () => {
    expect(
      readNoticeReceiverListQuery({
        resource: 'notice-receivers',
        pagination: { currentPage: 2, pageSize: 15, mode: 'server' },
        filters: [{ field: 'name', operator: 'contains', value: ' Pager ' }]
      })
    ).toEqual({ name: 'Pager', pageIndex: 1, pageSize: 15 });

    const cases: Array<[GetListParams, string]> = [
      [
        { resource: 'notice-receivers', sorters: [{ field: 'name', order: 'asc' }] },
        'NOTICE_RECEIVER_SORT_UNSUPPORTED'
      ],
      [{ resource: 'notice-receivers', pagination: { mode: 'client' } }, 'NOTICE_RECEIVER_PAGINATION_UNSUPPORTED'],
      [{ resource: 'notice-receivers', pagination: { currentPage: 0 } }, 'NOTICE_RECEIVER_PAGINATION_INVALID'],
      [{ resource: 'notice-receivers', pagination: { pageSize: 10 } }, 'NOTICE_RECEIVER_PAGINATION_INVALID'],
      [
        { resource: 'notice-receivers', filters: [{ field: 'name', operator: 'eq', value: 'Pager' }] },
        'NOTICE_RECEIVER_FILTER_UNSUPPORTED'
      ],
      [
        {
          resource: 'notice-receivers',
          filters: [
            { field: 'name', operator: 'contains', value: 'Pager' },
            { field: 'name', operator: 'contains', value: 'Backup' }
          ]
        },
        'NOTICE_RECEIVER_FILTER_UNSUPPORTED'
      ]
    ];
    for (const [params, code] of cases) {
      expect(() => readNoticeReceiverListQuery(params)).toThrow(expect.objectContaining({ code, statusCode: 400 }));
    }
  });

  it('reconstructs the complete draft shape without retaining unknown fields', () => {
    const source = {
      ...createNoticeReceiverDraft(),
      name: 'Pager',
      email: 'ops@example.test',
      agentId: null,
      configuredSecrets: ['hookUrl'],
      clearSecrets: ['hookAuthToken'],
      authorization: 'private-authorization'
    };
    const parsed = readNoticeReceiverDraft(source);
    expect(parsed).toEqual({
      ...createNoticeReceiverDraft(),
      name: 'Pager',
      email: 'ops@example.test',
      agentId: null,
      configuredSecrets: ['hookUrl'],
      clearSecrets: ['hookAuthToken']
    });
    expect(parsed).not.toHaveProperty('authorization');
    expect(JSON.stringify(parsed)).not.toContain('private-authorization');
    expect(readNoticeReceiverDraft({ ...source, agentId: 0 })).toMatchObject({ agentId: 0 });
    expect(() => readNoticeReceiverDraft(Object.create(source) as unknown)).toThrow(
      expect.objectContaining({ code: 'NOTICE_RECEIVER_VARIABLES_INVALID', statusCode: 400 })
    );

    const incomplete = { ...source } as Record<string, unknown>;
    delete incomplete.serverChanToken;
    expect(() => readNoticeReceiverDraft(incomplete)).toThrow(
      expect.objectContaining({
        code: 'NOTICE_RECEIVER_VARIABLES_INVALID',
        statusCode: 400
      })
    );
    expect(() => readNoticeReceiverDraft({ ...source, configuredSecrets: [7] })).toThrow(
      expect.objectContaining({
        code: 'NOTICE_RECEIVER_VARIABLES_INVALID',
        statusCode: 400
      })
    );
    expect(() => readNoticeReceiverDraft({ ...source, configuredSecrets: ['future-secret'] })).toThrow(
      expect.objectContaining({
        code: 'NOTICE_RECEIVER_VARIABLES_INVALID',
        statusCode: 400
      })
    );
  });

  it('fails closed when the model baseline grows beyond the explicit runtime schema', () => {
    const baseline = createNoticeReceiverDraft();
    vi.spyOn(noticeReceiverModel, 'createNoticeReceiverDraft').mockReturnValue({
      ...baseline,
      futureChannel: ''
    } as NoticeReceiverDraft);

    expect(() => readNoticeReceiverDraft({ ...draft, futureChannel: '' })).toThrow(
      expect.objectContaining({
        code: 'NOTICE_RECEIVER_VARIABLES_INVALID',
        statusCode: 400
      })
    );
  });

  it('accepts only catalog receiver types, applies domain validation, and enforces create/update ids', () => {
    expect(() => readNoticeReceiverDraft({ ...draft, type: 15 })).toThrow(
      expect.objectContaining({
        code: 'NOTICE_RECEIVER_VARIABLES_INVALID',
        statusCode: 400
      })
    );
    expect(() => readNoticeReceiverDraft({ ...draft, email: 'invalid' })).toThrow(
      expect.objectContaining({
        code: 'NOTICE_RECEIVER_VARIABLES_INVALID',
        statusCode: 400
      })
    );
    const invalidActiveDrafts = [
      { ...draft, type: 2, hookUrl: 'secret', hookAuthType: 'Future' },
      { ...draft, type: 14, appId: 'app', appSecret: 'secret', larkReceiveType: 99 },
      { ...draft, type: 10, corpId: 'corp', appSecret: 'secret', userId: 'ops', agentId: -1 },
      { ...draft, type: 10, corpId: 'corp', appSecret: 'secret', userId: 'ops', agentId: 1.5 }
    ];
    for (const invalid of invalidActiveDrafts) {
      expect(() => readNoticeReceiverDraft(invalid)).toThrow(
        expect.objectContaining({
          code: 'NOTICE_RECEIVER_VARIABLES_INVALID',
          statusCode: 400
        })
      );
    }
    expect(() => readNoticeReceiverDraft({ ...draft, id: 7 })).toThrow(
      expect.objectContaining({
        code: 'NOTICE_RECEIVER_VARIABLES_INVALID',
        statusCode: 400
      })
    );
    expect(readNoticeReceiverDraft({ ...draft, id: 7 }, 7)).toMatchObject({ id: 7 });
    expect(() => readNoticeReceiverDraft({ ...draft, id: 8 }, 7)).toThrow(
      expect.objectContaining({
        code: 'NOTICE_RECEIVER_VARIABLES_INVALID',
        statusCode: 400
      })
    );
  });

  it('accepts only positive numeric ids and reconstructs the delete identity', () => {
    expect(readNoticeReceiverId(7)).toBe(7);
    for (const value of ['7', 0, 1.5]) {
      expect(() => readNoticeReceiverId(value)).toThrow(
        expect.objectContaining({
          code: 'NOTICE_RECEIVER_ID_INVALID',
          statusCode: 400
        })
      );
    }

    const record = { ...receiver, futureEvidence: 'kept' };
    expect(readNoticeReceiverDeleteRecord(record, 7)).toEqual({ id: 7 });
    expect(() => readNoticeReceiverDeleteRecord({ ...record, id: 8 }, 7)).toThrow(
      expect.objectContaining({
        code: 'NOTICE_RECEIVER_VARIABLES_INVALID',
        statusCode: 400
      })
    );
  });
});
