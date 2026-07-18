/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const http = vi.hoisted(() => ({ delete: vi.fn(), get: vi.fn(), post: vi.fn(), put: vi.fn() }));
vi.mock('@/core/http/api-message', async importOriginal => ({
  ...await importOriginal<typeof import('@/core/http/api-message')>(),
  apiMessageDelete: http.delete,
  apiMessageGet: http.get,
  apiMessagePost: http.post,
  apiMessagePut: http.put
}));
vi.mock('../../notice-receiver/api/notice-receiver-api', () => ({ loadAllNoticeReceiverOptions: vi.fn() }));

import { ApiMessageError } from '@/core/http/api-message';

import {
  isNoticeRuleMissing,
  loadAllNoticeRulesByName,
  loadNoticeRule,
  loadNoticeRules
} from './notice-rule-api';

const rule = (id: number) => ({
  id, name: 'Night', receiverId: [11], receiverName: ['Email'], templateId: null, templateName: null,
  enable: true, filterAll: true
});

describe('notice rule API', () => {
  beforeEach(() => vi.clearAllMocks());

  it('walks every authoritative backend page for create identity proof', async () => {
    http.get
      .mockResolvedValueOnce({ content: Array.from({ length: 25 }, (_, index) => rule(index + 1)),
        totalElements: 30, totalPages: 2, number: 0, size: 25 })
      .mockResolvedValueOnce({ content: Array.from({ length: 5 }, (_, index) => rule(index + 26)),
        totalElements: 30, totalPages: 2, number: 1, size: 25 });

    await expect(loadAllNoticeRulesByName('Night')).resolves.toHaveLength(30);
    expect(http.get).toHaveBeenNthCalledWith(1, '/api/notice/rules?pageIndex=0&pageSize=25&name=Night');
    expect(http.get).toHaveBeenNthCalledWith(2, '/api/notice/rules?pageIndex=1&pageSize=25&name=Night');
  });

  it('rejects mismatched page identity instead of accepting current-page evidence', async () => {
    http.get.mockResolvedValue({ content: [rule(1)], totalElements: 1, totalPages: 1, number: 2, size: 8 });
    await expect(loadNoticeRules({ name: '', pageIndex: 0, pageSize: 8 }))
      .rejects.toMatchObject({ code: 'NOTICE_RULE_PAGE_INVALID' });
  });

  it('rejects extra resource fields at the notice rule contract boundary', async () => {
    http.get.mockResolvedValue({ ...rule(1), token: 'secret' });

    await expect(loadNoticeRule(1)).rejects.toMatchObject({ code: 'NOTICE_RULE_DETAIL_INVALID' });
  });

  it('classifies detail missing by the frozen backend failure code without depending on English copy', () => {
    expect(isNoticeRuleMissing(new ApiMessageError('localized or changed copy', { code: 15 }))).toBe(true);
    expect(isNoticeRuleMissing(new ApiMessageError('same old English copy', { code: 16 }))).toBe(false);
  });
});
