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

import { NoticeReceiverContractError } from '@/features/alert/notice-receiver/api/notice-receiver-api';
import * as noticeReceiverModel from '@/features/alert/notice-receiver/model/notice-receiver-model';
import {
  createNoticeReceiverDraft,
  type NoticeReceiverDraft
} from '@/features/alert/notice-receiver/model/notice-receiver-model';

const api = vi.hoisted(() => ({
  deleteNoticeReceiver: vi.fn(),
  loadNoticeReceiver: vi.fn(),
  loadNoticeReceivers: vi.fn(),
  saveNoticeReceiver: vi.fn()
}));
vi.mock('@/features/alert/notice-receiver/api/notice-receiver-api', async importOriginal => ({
  ...(await importOriginal<typeof import('@/features/alert/notice-receiver/api/notice-receiver-api')>()),
  ...api
}));

import { noticeReceiverDataProvider } from './notice-receiver-data-provider';
import inputSource from './notice-receiver-data-provider-input.ts?raw';
import {
  readNoticeReceiverDeleteRecord,
  readNoticeReceiverDraft,
  readNoticeReceiverId,
  readNoticeReceiverListQuery
} from './notice-receiver-data-provider-input';
import providerSource from './notice-receiver-data-provider.ts?raw';

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
      totalElements: 1,
      totalPages: 1,
      number: 1,
      size: 15
    });
    await expect(
      noticeReceiverDataProvider.getList({
        resource: 'notice-receivers',
        pagination: { currentPage: 2, pageSize: 15, mode: 'server' },
        filters: [{ field: 'name', operator: 'contains', value: ' Pager ' }]
      })
    ).resolves.toEqual({ data: [receiver], total: 1 });
    expect(api.loadNoticeReceivers).toHaveBeenCalledWith({ name: 'Pager', pageIndex: 1, pageSize: 15 });
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
    expect(api.loadNoticeReceiver).toHaveBeenCalledTimes(2);
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
    api.deleteNoticeReceiver.mockResolvedValue({ id: 7, status: 'deleted', receiver: null });
    await expect(
      noticeReceiverDataProvider.deleteOne({ resource: 'notice-receivers', id: 7, variables: receiver })
    ).resolves.toEqual({ data: receiver });
    expect(api.deleteNoticeReceiver).toHaveBeenCalledWith(7);
    expect(api.loadNoticeReceiver).not.toHaveBeenCalled();
  });

  it('maps secret-bearing API evidence to a stable contract HttpError', async () => {
    api.saveNoticeReceiver.mockRejectedValue(new NoticeReceiverContractError());
    await expect(
      noticeReceiverDataProvider.create({ resource: 'notice-receivers', variables: draft })
    ).rejects.toMatchObject({ code: 'NOTICE_RECEIVER_RESPONSE_INVALID', kind: 'contract' });
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
    ).rejects.toMatchObject({ code: 'NOTICE_RECEIVER_VARIABLES_INVALID' });
    expect(api.loadNoticeReceivers).not.toHaveBeenCalled();
    expect(api.loadNoticeReceiver).not.toHaveBeenCalled();
    expect(api.saveNoticeReceiver).not.toHaveBeenCalled();
  });
});

describe('Notice Receiver provider input boundary', () => {
  it('keeps Refine orchestration small and runtime parsing outside the provider', () => {
    const sourceLines = providerSource
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n')
      .filter(line => line.trim() && !line.trim().startsWith('//'));

    expect(sourceLines.length).toBeLessThanOrEqual(200);
    expect(providerSource).not.toMatch(/function read(?:ListQuery|Pagination|NameFilter|Id|Draft|DeleteRecord)/);
    expect(providerSource).not.toContain('as TData');
    expect(providerSource).not.toContain('as unknown as TData');
    expect(providerSource).toContain("from '@/shared/refine/refine-provider-data'");
    expect(inputSource).toContain("from 'zod'");
    expect(inputSource).toContain('schema.safeParse(value)');
    expect(inputSource).toContain('receiverTypeDefinitions.some');
    expect(inputSource).toContain('hasCurrentDraftShape()');
    expect(inputSource).not.toMatch(/z\.literal\((?:0|1[0-4])\).*receiverType/);
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

  it('preserves the complete draft shape, unknown fields, nullable numeric values, and string arrays', () => {
    const source = {
      ...createNoticeReceiverDraft(),
      name: 'Pager',
      email: 'ops@example.test',
      agentId: null,
      configuredSecrets: ['future-secret'],
      clearSecrets: ['future-clear'],
      futureMessageServer: { id: 9 }
    };
    expect(readNoticeReceiverDraft(source)).toEqual(source);
    expect(readNoticeReceiverDraft({ ...source, agentId: 0 })).toMatchObject({ agentId: 0 });

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

  it('accepts only positive numeric ids and preserves the delete record identity', () => {
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
    expect(readNoticeReceiverDeleteRecord(record, 7)).toBe(record);
    expect(() => readNoticeReceiverDeleteRecord({ ...record, id: 8 }, 7)).toThrow(
      expect.objectContaining({
        code: 'NOTICE_RECEIVER_VARIABLES_INVALID',
        statusCode: 400
      })
    );
  });
});
