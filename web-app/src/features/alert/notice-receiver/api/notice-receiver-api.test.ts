/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const http = vi.hoisted(() => ({
  apiMessageDelete: vi.fn(),
  apiMessageGet: vi.fn(),
  apiMessagePost: vi.fn(),
  apiMessagePut: vi.fn()
}));
vi.mock('@/core/http/api-message', () => ({ ...http, ApiMessageError: class ApiMessageError extends Error {} }));

import {
  deleteNoticeReceiver,
  loadAllNoticeReceiverOptions,
  loadNoticeReceiver,
  loadNoticeReceivers,
  NoticeReceiverContractError,
  saveNoticeReceiver,
  testNoticeReceiver
} from './notice-receiver-api';
import { createNoticeReceiverDraft, type NoticeReceiverDraft } from '../model/notice-receiver-model';

const safeReceiver = {
  id: 7,
  name: 'Pager',
  type: 2,
  typeKey: 'webhook',
  options: { hookAuthType: 'Bearer' },
  configuredSecrets: ['hookUrl', 'hookAuthToken'],
  creator: 'admin',
  modifier: 'admin',
  gmtCreate: '2026-07-17T12:00:00',
  gmtUpdate: '2026-07-17T12:01:00'
};

describe('notice receiver API contract', () => {
  beforeEach(() => vi.clearAllMocks());

  it('parses safe detail, page, and minimal rule options from exact endpoints', async () => {
    http.apiMessageGet
      .mockResolvedValueOnce(safeReceiver)
      .mockResolvedValueOnce({
        content: [safeReceiver],
        totalElements: 1,
        totalPages: 1,
        number: 0,
        size: 8
      })
      .mockResolvedValueOnce([{ id: 7, name: 'Pager', type: 2 }]);

    await expect(loadNoticeReceiver(7)).resolves.toEqual(safeReceiver);
    await expect(loadNoticeReceivers({ name: '', pageIndex: 0, pageSize: 8 })).resolves.toMatchObject({
      content: [safeReceiver],
      totalElements: 1
    });
    await expect(loadAllNoticeReceiverOptions()).resolves.toEqual([{ id: 7, name: 'Pager', type: 2 }]);
    expect(http.apiMessageGet.mock.calls).toEqual([
      ['/api/notice/receiver/7'],
      ['/api/notice/receivers?pageIndex=0&pageSize=8'],
      ['/api/notice/receivers/all']
    ]);
  });

  it.each([
    { ...safeReceiver, options: { hookAuthType: 'Bearer', hookUrl: 'https://secret.test/hook' } },
    { ...safeReceiver, accessToken: 'echoed-secret' },
    { ...safeReceiver, options: { hookAuthType: 'Bearer', email: 'wrong-type@example.test' } },
    { ...safeReceiver, configuredSecrets: ['email'] },
    { ...safeReceiver, configuredSecrets: ['hookUrl', 'hookUrl'] },
    { ...safeReceiver, type: 15, typeKey: 'ntfy' }
  ])('rejects secret-bearing, crossed, or unsupported detail evidence %#', async value => {
    http.apiMessageGet.mockResolvedValue(value);
    await expect(loadNoticeReceiver(7)).rejects.toBeInstanceOf(NoticeReceiverContractError);
  });

  it('rejects expanded receiver options used by rule authoring', async () => {
    http.apiMessageGet.mockResolvedValue([{ id: 7, name: 'Pager', type: 2, options: {} }]);
    await expect(loadAllNoticeReceiverOptions()).rejects.toBeInstanceOf(NoticeReceiverContractError);
  });

  it('rejects detail evidence for a different receiver id', async () => {
    http.apiMessageGet.mockResolvedValue({ ...safeReceiver, id: 8 });
    await expect(loadNoticeReceiver(7)).rejects.toBeInstanceOf(NoticeReceiverContractError);
  });

  it('sends structured active-type payloads and validates mutation evidence', async () => {
    http.apiMessagePost
      .mockResolvedValueOnce({ id: 7, status: 'created', receiver: safeReceiver })
      .mockResolvedValueOnce(undefined);
    http.apiMessagePut.mockResolvedValueOnce({ id: 7, status: 'updated', receiver: safeReceiver });
    http.apiMessageDelete.mockResolvedValueOnce({ id: 7, status: 'deleted', receiver: null });
    const create = {
      ...createNoticeReceiverDraft(),
      name: 'Pager',
      type: 2 as const,
      hookUrl: 'https://secret.test/hook',
      hookAuthType: 'Bearer' as const,
      hookAuthToken: 'token'
    };
    const update = {
      ...create,
      id: 7,
      hookUrl: '',
      hookAuthToken: '',
      configuredSecrets: ['hookUrl', 'hookAuthToken'] as const
    };

    await expect(saveNoticeReceiver(create)).resolves.toMatchObject({ status: 'created' });
    await expect(saveNoticeReceiver(update)).resolves.toMatchObject({ status: 'updated' });
    await expect(testNoticeReceiver(create)).resolves.toBeUndefined();
    await expect(deleteNoticeReceiver(7)).resolves.toEqual({ id: 7, status: 'deleted', receiver: null });

    expect(http.apiMessagePost).toHaveBeenNthCalledWith(1, '/api/notice/receiver', {
      name: 'Pager',
      type: 2,
      options: { hookUrl: 'https://secret.test/hook', hookAuthType: 'Bearer', hookAuthToken: 'token' }
    });
    expect(http.apiMessagePut).toHaveBeenCalledWith('/api/notice/receiver', {
      id: 7,
      name: 'Pager',
      type: 2,
      options: { hookAuthType: 'Bearer' }
    });
    expect(http.apiMessagePost).toHaveBeenNthCalledWith(
      2,
      '/api/notice/receiver/send-test-msg',
      expect.objectContaining({
        options: expect.objectContaining({ hookUrl: 'https://secret.test/hook', hookAuthToken: 'token' })
      })
    );
    expect(http.apiMessageDelete).toHaveBeenCalledWith('/api/notice/receiver/7');
  });

  it('rejects invalid successful mutation evidence', async () => {
    http.apiMessagePost.mockResolvedValue({
      id: 7,
      status: 'created',
      receiver: { ...safeReceiver, options: { hookUrl: 'echo' } }
    });
    const draft = { ...createNoticeReceiverDraft(), name: 'Email', email: 'ops@example.test' };
    await expect(saveNoticeReceiver(draft)).rejects.toBeInstanceOf(NoticeReceiverContractError);
  });

  it.each([
    { ...createNoticeReceiverDraft(), name: 'Webhook', type: 2, hookUrl: 'secret', hookAuthType: 'Digest' },
    { ...createNoticeReceiverDraft(), name: 'FeiShu', type: 14, appId: 'app', appSecret: 'secret', larkReceiveType: 4 },
    {
      ...createNoticeReceiverDraft(),
      name: 'WeCom',
      type: 10,
      corpId: 'corp',
      agentId: Number.MAX_SAFE_INTEGER + 1,
      appSecret: 'secret',
      userId: 'ops'
    }
  ])('rejects an invalid active option before transport %#', async source => {
    await expect(saveNoticeReceiver(source as NoticeReceiverDraft)).rejects.toMatchObject({
      code: 'NOTICE_RECEIVER_INPUT_INVALID'
    });
    expect(http.apiMessagePost).not.toHaveBeenCalled();
    expect(http.apiMessagePut).not.toHaveBeenCalled();
  });
});
