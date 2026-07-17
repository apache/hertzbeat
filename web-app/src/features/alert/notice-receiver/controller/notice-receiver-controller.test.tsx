/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const refine = vi.hoisted(() => ({
  create: vi.fn(),
  getOne: vi.fn(),
  notification: vi.fn(),
  params: 'pageIndex=0&pageSize=8',
  refetch: vi.fn(),
  remove: vi.fn(),
  setParams: vi.fn(),
  update: vi.fn(),
  useCreate: vi.fn(),
  useDataProvider: vi.fn(),
  useDelete: vi.fn(),
  useList: vi.fn(),
  useNotification: vi.fn(),
  useUpdate: vi.fn()
}));
vi.mock('@refinedev/core', () => ({
  useCreate: refine.useCreate,
  useDataProvider: refine.useDataProvider,
  useDelete: refine.useDelete,
  useList: refine.useList,
  useNotification: refine.useNotification,
  useUpdate: refine.useUpdate
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('react-router-dom', () => ({
  useSearchParams: () => [new URLSearchParams(refine.params), refine.setParams]
}));
vi.mock('../api/notice-receiver-api', () => ({ testNoticeReceiver: vi.fn() }));

import { useNoticeReceiverController } from './notice-receiver-controller';

const receiver = {
  id: 7, name: 'Pager', type: 2 as const, typeKey: 'webhook', options: { hookAuthType: 'Bearer' as const },
  configuredSecrets: ['hookUrl' as const, 'hookAuthToken' as const], creator: null, modifier: null,
  gmtCreate: null, gmtUpdate: null
};

describe('notice receiver controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    refine.params = 'pageIndex=0&pageSize=8';
    refine.getOne.mockResolvedValue({ data: receiver });
    refine.refetch.mockResolvedValue({ data: { data: [receiver], total: 1 }, isError: false });
    refine.create.mockResolvedValue({ data: receiver });
    refine.update.mockResolvedValue({ data: receiver });
    refine.remove.mockResolvedValue({ data: receiver });
    refine.useDataProvider.mockReturnValue(() => ({ getOne: refine.getOne }));
    refine.useNotification.mockReturnValue({ open: refine.notification });
    refine.useCreate.mockReturnValue({ mutateAsync: refine.create, mutation: { isPending: false } });
    refine.useUpdate.mockReturnValue({ mutateAsync: refine.update, mutation: { isPending: false } });
    refine.useDelete.mockReturnValue({ mutateAsync: refine.remove, mutation: { isPending: false } });
    refine.useList.mockReturnValue(listResult());
  });

  it('uses the named Refine resource and closes create only after list reread', async () => {
    refine.refetch.mockResolvedValue({ data: { data: [], total: 0 }, isError: false });
    const { result } = renderHook(() => useNoticeReceiverController());
    expect(refine.useList).toHaveBeenCalledWith(expect.objectContaining({
      resource: 'notice-receivers', dataProviderName: 'notice-receivers',
      pagination: { currentPage: 1, pageSize: 8, mode: 'server' }
    }));

    act(() => result.current.actions.create());
    act(() => result.current.actions.updateDraft({ name: 'Pager', type: 2, hookUrl: 'new-hook',
      hookAuthType: 'Bearer', hookAuthToken: 'new-token' }));
    await act(async () => result.current.actions.submit());

    expect(refine.create).toHaveBeenCalledWith(expect.objectContaining({
      resource: 'notice-receivers', dataProviderName: 'notice-receivers', values: expect.objectContaining({ name: 'Pager' })
    }));
    expect(refine.refetch).toHaveBeenCalledTimes(1);
    expect(result.current.state.draft).toBeNull();
  });

  it('keeps save editor open and marks list unavailable when list reread is unavailable', async () => {
    refine.refetch.mockResolvedValue({ isError: true, error: { statusCode: 503, code: 'NETWORK_REQUEST_FAILED' } });
    const { result } = renderHook(() => useNoticeReceiverController());
    await act(async () => result.current.actions.edit(7));
    await act(async () => result.current.actions.submit());

    expect(result.current.state.draft).not.toBeNull();
    expect(result.current.state.list.kind).toBe('unavailable');
  });

  it('keeps the editor open when provider canonical reread fails', async () => {
    refine.update.mockRejectedValue({ statusCode: 503, code: 'NETWORK_REQUEST_FAILED' });
    const { result } = renderHook(() => useNoticeReceiverController());
    await act(async () => result.current.actions.edit(7));
    await act(async () => result.current.actions.submit());

    expect(result.current.state.draft).not.toBeNull();
    expect(refine.refetch).not.toHaveBeenCalled();
  });

  it('keeps the editor open when update evidence reports missing', async () => {
    refine.update.mockRejectedValue({ statusCode: 404, code: 'NOTICE_RECEIVER_MISSING' });
    const { result } = renderHook(() => useNoticeReceiverController());
    await act(async () => result.current.actions.edit(7));
    await act(async () => result.current.actions.submit());

    expect(result.current.state.draft).not.toBeNull();
    expect(refine.notification).toHaveBeenCalledWith(expect.objectContaining({ message: 'noticeReceivers.save.missing' }));
  });

  it('keeps invalid and unavailable list states distinct', () => {
    refine.useList.mockReturnValue(listResult({ error: { statusCode: 502, code: 'NOTICE_RECEIVER_RESPONSE_INVALID' } }));
    const invalid = renderHook(() => useNoticeReceiverController());
    expect(invalid.result.current.state.list.kind).toBe('invalid');
    invalid.unmount();

    refine.useList.mockReturnValue(listResult({ error: { statusCode: 503, code: 'NETWORK_REQUEST_FAILED' } }));
    const unavailable = renderHook(() => useNoticeReceiverController());
    expect(unavailable.result.current.state.list.kind).toBe('unavailable');
  });

  it('clears all prior secret ownership when the type changes', async () => {
    const { result } = renderHook(() => useNoticeReceiverController());
    await act(async () => result.current.actions.edit(7));
    act(() => result.current.actions.selectType(1));
    expect(result.current.state.draft).toMatchObject({ type: 1, configuredSecrets: [], clearSecrets: [] });
  });

  it('does not report delete success when list absence cannot be proved', async () => {
    refine.refetch.mockResolvedValue({ data: { data: [receiver], total: 1 }, isError: false });
    const { result } = renderHook(() => useNoticeReceiverController());
    await act(async () => result.current.actions.remove(receiver));
    expect(result.current.state.list.kind).toBe('invalid');
    expect(refine.notification).not.toHaveBeenCalledWith(expect.objectContaining({
      message: 'noticeReceivers.deleteSuccess'
    }));
  });

  it('restores the search draft when browser navigation restores an earlier query', async () => {
    const { result, rerender } = renderHook(() => useNoticeReceiverController());

    act(() => result.current.actions.setName('no-such-receiver'));
    expect(result.current.state.name).toBe('no-such-receiver');

    refine.params = 'pageIndex=0&pageSize=8&name=no-such-receiver';
    rerender();
    await waitFor(() => expect(result.current.state.name).toBe('no-such-receiver'));

    refine.params = 'pageIndex=0&pageSize=8';
    rerender();
    await waitFor(() => expect(result.current.state.name).toBe(''));
  });
});

function listResult(override: { error?: { statusCode: number; code: string } } = {}) {
  return {
    query: {
      error: override.error ?? null,
      isError: Boolean(override.error),
      isFetching: false,
      isPending: false,
      refetch: refine.refetch
    },
    result: { data: [receiver], total: 1 }
  };
}
