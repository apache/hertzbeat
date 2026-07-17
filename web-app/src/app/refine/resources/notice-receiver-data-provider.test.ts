/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiMessageError } from '@/core/http/api-message';
import { NoticeReceiverContractError } from '@/features/alert/notice-receiver/api/notice-receiver-api';
import { createNoticeReceiverDraft, type NoticeReceiverDraft } from '@/features/alert/notice-receiver/model/notice-receiver-model';

const api = vi.hoisted(() => ({
  deleteNoticeReceiver: vi.fn(),
  loadNoticeReceiver: vi.fn(),
  loadNoticeReceivers: vi.fn(),
  saveNoticeReceiver: vi.fn()
}));
vi.mock('@/features/alert/notice-receiver/api/notice-receiver-api', async importOriginal => ({
  ...await importOriginal<typeof import('@/features/alert/notice-receiver/api/notice-receiver-api')>(),
  ...api
}));

import { noticeReceiverDataProvider } from './notice-receiver-data-provider';

const receiver = { id: 7, name: 'Pager', type: 1 as const, typeKey: 'email',
  options: { email: 'ops@example.test' }, configuredSecrets: [], creator: null, modifier: null,
  gmtCreate: null, gmtUpdate: null };
const draft = { ...createNoticeReceiverDraft(), name: 'Pager', type: 1, email: 'ops@example.test' } as NoticeReceiverDraft;

describe('Notice Receiver Refine data provider', () => {
  beforeEach(() => vi.clearAllMocks());

  it('maps Refine list pagination and name filter to the frozen page endpoint', async () => {
    api.loadNoticeReceivers.mockResolvedValue({ content: [receiver], totalElements: 1,
      totalPages: 1, number: 1, size: 15 });
    await expect(noticeReceiverDataProvider.getList({ resource: 'notice-receivers',
      pagination: { currentPage: 2, pageSize: 15, mode: 'server' },
      filters: [{ field: 'name', operator: 'contains', value: ' Pager ' }] }))
      .resolves.toEqual({ data: [receiver], total: 1 });
    expect(api.loadNoticeReceivers).toHaveBeenCalledWith({ name: 'Pager', pageIndex: 1, pageSize: 15 });
  });

  it('creates and updates pessimistically, then authoritatively rereads detail', async () => {
    api.saveNoticeReceiver.mockResolvedValueOnce({ id: 7, status: 'created', receiver })
      .mockResolvedValueOnce({ id: 7, status: 'updated', receiver });
    api.loadNoticeReceiver.mockResolvedValue(receiver);

    await expect(noticeReceiverDataProvider.create({ resource: 'notice-receivers', variables: draft }))
      .resolves.toEqual({ data: receiver });
    await expect(noticeReceiverDataProvider.update({ resource: 'notice-receivers', id: 7,
      variables: { ...draft, id: 7 } })).resolves.toEqual({ data: receiver });
    expect(api.loadNoticeReceiver).toHaveBeenCalledTimes(2);
  });

  it('fails closed on missing mutation or mismatched canonical reread', async () => {
    api.saveNoticeReceiver.mockResolvedValueOnce({ id: 7, status: 'missing', receiver: null })
      .mockResolvedValueOnce({ id: 7, status: 'updated', receiver });
    api.loadNoticeReceiver.mockResolvedValue({ ...receiver, name: 'Different' });

    await expect(noticeReceiverDataProvider.update({ resource: 'notice-receivers', id: 7,
      variables: { ...draft, id: 7 } })).rejects.toMatchObject({ code: 'NOTICE_RECEIVER_MISSING' });
    await expect(noticeReceiverDataProvider.update({ resource: 'notice-receivers', id: 7,
      variables: { ...draft, id: 7 } })).rejects.toMatchObject({ code: 'NOTICE_RECEIVER_REREAD_INVALID' });
  });

  it('rejects canonical reread that drops public options or does not converge secret names', async () => {
    const webhookDraft = { ...createNoticeReceiverDraft(), name: 'Gateway', type: 2 as const,
      hookUrl: 'new-hook', hookAuthType: 'Bearer' as const, hookAuthToken: 'new-token' };
    const mutationReceiver = { ...receiver, name: 'Gateway', type: 2 as const, typeKey: 'webhook',
      options: { hookAuthType: 'Bearer' as const }, configuredSecrets: ['hookUrl' as const, 'hookAuthToken' as const] };
    api.saveNoticeReceiver.mockResolvedValue({ id: 7, status: 'created', receiver: mutationReceiver });
    api.loadNoticeReceiver.mockResolvedValueOnce({ ...mutationReceiver, options: { hookAuthType: 'None' as const } })
      .mockResolvedValueOnce({ ...mutationReceiver, configuredSecrets: ['hookUrl' as const] });

    await expect(noticeReceiverDataProvider.create({ resource: 'notice-receivers', variables: webhookDraft }))
      .rejects.toMatchObject({ code: 'NOTICE_RECEIVER_REREAD_INVALID' });
    await expect(noticeReceiverDataProvider.create({ resource: 'notice-receivers', variables: webhookDraft }))
      .rejects.toMatchObject({ code: 'NOTICE_RECEIVER_REREAD_INVALID' });
  });

  it('deletes pessimistically only with confirmed deleted evidence', async () => {
    api.deleteNoticeReceiver.mockResolvedValue({ id: 7, status: 'deleted', receiver: null });
    api.loadNoticeReceiver.mockRejectedValue(new ApiMessageError('Receiver missing', { code: 1, status: 200 }));
    await expect(noticeReceiverDataProvider.deleteOne({ resource: 'notice-receivers', id: 7,
      variables: receiver })).resolves.toEqual({ data: receiver });
    expect(api.deleteNoticeReceiver).toHaveBeenCalledWith(7);
  });

  it('fails delete when its authoritative missing reread is unavailable', async () => {
    api.deleteNoticeReceiver.mockResolvedValue({ id: 7, status: 'deleted', receiver: null });
    api.loadNoticeReceiver.mockRejectedValue(new ApiMessageError('Receiver storage unavailable', { code: 1, status: 200 }));
    await expect(noticeReceiverDataProvider.deleteOne({ resource: 'notice-receivers', id: 7,
      variables: receiver })).rejects.toMatchObject({ kind: 'envelope' });
  });

  it('maps secret-bearing API evidence to a stable contract HttpError', async () => {
    api.saveNoticeReceiver.mockRejectedValue(new NoticeReceiverContractError());
    await expect(noticeReceiverDataProvider.create({ resource: 'notice-receivers', variables: draft }))
      .rejects.toMatchObject({ code: 'NOTICE_RECEIVER_RESPONSE_INVALID', kind: 'contract' });
  });

  it('rejects unsupported resources, sorters, filters, ids, and variables before transport', async () => {
    await expect(noticeReceiverDataProvider.getList({ resource: 'labels' }))
      .rejects.toMatchObject({ code: 'NOTICE_RECEIVER_RESOURCE_UNSUPPORTED' });
    await expect(noticeReceiverDataProvider.getList({ resource: 'notice-receivers',
      sorters: [{ field: 'name', order: 'asc' }] })).rejects.toMatchObject({ code: 'NOTICE_RECEIVER_SORT_UNSUPPORTED' });
    await expect(noticeReceiverDataProvider.getOne({ resource: 'notice-receivers', id: '7' }))
      .rejects.toMatchObject({ code: 'NOTICE_RECEIVER_ID_INVALID' });
    await expect(noticeReceiverDataProvider.create({ resource: 'notice-receivers', variables: {} }))
      .rejects.toMatchObject({ code: 'NOTICE_RECEIVER_VARIABLES_INVALID' });
    expect(api.loadNoticeReceivers).not.toHaveBeenCalled();
    expect(api.loadNoticeReceiver).not.toHaveBeenCalled();
    expect(api.saveNoticeReceiver).not.toHaveBeenCalled();
  });
});
