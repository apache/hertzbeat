/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const http = vi.hoisted(() => ({ delete: vi.fn(), get: vi.fn(), post: vi.fn(), put: vi.fn() }));
const receiverApi = vi.hoisted(() => ({ loadAll: vi.fn() }));
vi.mock('@/core/http/api-message', async importOriginal => ({
  ...(await importOriginal<typeof import('@/core/http/api-message')>()),
  apiMessageDelete: http.delete,
  apiMessageGet: http.get,
  apiMessagePost: http.post,
  apiMessagePut: http.put
}));
vi.mock('../../notice-receiver/api/notice-receiver-api', () => ({ loadAllNoticeReceiverOptions: receiverApi.loadAll }));

import { ApiMessageError } from '@/core/http/api-message';

import { NoticeReceiverRequestFailure } from '../../notice-receiver/model/notice-receiver-failure';
import { NoticeRuleContractError, NoticeRuleRequestFailure } from '../model/notice-rule-failure';
import { createNoticeRuleDraft } from '../model/notice-rule-model';
import {
  deleteNoticeRule,
  loadAllNoticeReceivers,
  loadAllNoticeRulesByName,
  loadAllNoticeTemplates,
  loadNoticeRule,
  loadNoticeRules,
  saveNoticeRule
} from './notice-rule-api';

const rule = (id: number) => ({
  id,
  name: 'Night',
  receiverId: [11],
  receiverName: ['Email'],
  templateId: null,
  templateName: null,
  enable: true,
  filterAll: true
});

describe('notice rule API', () => {
  beforeEach(() => vi.clearAllMocks());

  it('walks every authoritative backend page for create identity proof', async () => {
    http.get
      .mockResolvedValueOnce({
        content: Array.from({ length: 25 }, (_, index) => rule(index + 1)),
        totalElements: 30,
        totalPages: 2,
        number: 0,
        size: 25
      })
      .mockResolvedValueOnce({
        content: Array.from({ length: 5 }, (_, index) => rule(index + 26)),
        totalElements: 30,
        totalPages: 2,
        number: 1,
        size: 25
      });

    await expect(loadAllNoticeRulesByName('Night')).resolves.toHaveLength(30);
    expect(http.get).toHaveBeenNthCalledWith(1, '/api/notice/rules?pageIndex=0&pageSize=25&name=Night');
    expect(http.get).toHaveBeenNthCalledWith(2, '/api/notice/rules?pageIndex=1&pageSize=25&name=Night');
  });

  it('rejects mismatched page identity instead of accepting current-page evidence', async () => {
    http.get.mockResolvedValue({ content: [rule(1)], totalElements: 1, totalPages: 1, number: 2, size: 8 });
    await expect(loadNoticeRules({ name: '', pageIndex: 0, pageSize: 8 })).rejects.toMatchObject({
      code: 'NOTICE_RULE_PAGE_INVALID'
    });
  });

  it('rejects extra resource fields at the notice rule contract boundary', async () => {
    http.get.mockResolvedValue({ ...rule(1), token: 'secret' });

    await expect(loadNoticeRule(1)).rejects.toMatchObject({ code: 'NOTICE_RULE_DETAIL_INVALID' });
  });

  it('normalizes every transport entry before leaving the Notice Rule API', async () => {
    const receiver = { id: 11, name: 'Email', type: 1 as const };
    const template = { id: 21, name: 'Mail', type: 1 as const, preset: false, content: '${content}' };
    const draft = { ...createNoticeRuleDraft(), name: 'Night', receiverIds: [11], templateId: 21 };

    http.get.mockRejectedValueOnce(transportFailure());
    await expect(loadNoticeRules({ name: '', pageIndex: 0, pageSize: 8 })).rejects.toBeInstanceOf(
      NoticeRuleRequestFailure
    );
    http.get.mockRejectedValueOnce(transportFailure());
    await expect(loadNoticeRule(31)).rejects.toBeInstanceOf(NoticeRuleRequestFailure);
    http.get.mockRejectedValueOnce(transportFailure());
    await expect(loadAllNoticeTemplates()).rejects.toBeInstanceOf(NoticeRuleRequestFailure);
    http.post.mockRejectedValueOnce(transportFailure());
    await expect(saveNoticeRule(draft, [receiver], [template])).rejects.toBeInstanceOf(NoticeRuleRequestFailure);
    http.put.mockRejectedValueOnce(transportFailure());
    await expect(saveNoticeRule({ ...draft, id: 31 }, [receiver], [template])).rejects.toBeInstanceOf(
      NoticeRuleRequestFailure
    );
    http.delete.mockRejectedValueOnce(transportFailure());
    await expect(deleteNoticeRule(31)).rejects.toBeInstanceOf(NoticeRuleRequestFailure);
  });

  it('adapts receiver option domain evidence without exposing Receiver failures', async () => {
    receiverApi.loadAll.mockRejectedValueOnce(
      new NoticeReceiverRequestFailure('invalid', 'uncertain', { code: 'NOTICE_RECEIVER_RESPONSE_INVALID' })
    );

    const failure = loadAllNoticeReceivers();
    await expect(failure).rejects.toBeInstanceOf(NoticeRuleContractError);
    await expect(failure).rejects.toMatchObject({
      kind: 'invalid',
      code: 'NOTICE_RECEIVER_RESPONSE_INVALID'
    });
  });

  it('rejects an empty template dependency set because the backend always supplies preset templates', async () => {
    http.get.mockResolvedValueOnce([]);

    await expect(loadAllNoticeTemplates()).rejects.toMatchObject({
      code: 'NOTICE_RULE_TEMPLATE_OPTIONS_INVALID'
    });
  });

  it('forwards caller cancellation to both option transports', async () => {
    const signal = new AbortController().signal;
    receiverApi.loadAll.mockResolvedValueOnce([]);
    http.get.mockResolvedValueOnce([{ id: null, name: 'EmailTemplate', type: 1, preset: true, content: '${content}' }]);

    await loadAllNoticeReceivers(signal);
    await loadAllNoticeTemplates(signal);

    expect(receiverApi.loadAll).toHaveBeenCalledWith(signal);
    expect(http.get).toHaveBeenCalledWith('/api/notice/templates/all', { signal });
  });
});

function transportFailure() {
  return new ApiMessageError('private transport failure', { status: 503 });
}
