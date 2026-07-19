/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  deferred,
  noticeReceiverListResult,
  persistedNoticeReceiver,
  validNoticeReceiverDraft
} from './notice-receiver-controller-test-fixtures';

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
vi.mock('../api/notice-receiver-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/notice-receiver-api')>()),
  testNoticeReceiver: vi.fn()
}));

import { useNoticeReceiverController } from './notice-receiver-controller';

describe('notice receiver controller composition', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    refine.params = 'pageIndex=0&pageSize=8';
    refine.getOne.mockResolvedValue({ data: persistedNoticeReceiver });
    refine.refetch.mockResolvedValue(noticeReceiverListResult());
    refine.create.mockResolvedValue({ data: persistedNoticeReceiver });
    refine.update.mockResolvedValue({ data: persistedNoticeReceiver });
    refine.remove.mockResolvedValue({ data: persistedNoticeReceiver });
    refine.useDataProvider.mockReturnValue(() => ({ getOne: refine.getOne }));
    refine.useNotification.mockReturnValue({ open: refine.notification });
    refine.useCreate.mockReturnValue({ mutateAsync: refine.create });
    refine.useUpdate.mockReturnValue({ mutateAsync: refine.update });
    refine.useDelete.mockReturnValue({ mutateAsync: refine.remove });
    refine.useList.mockReturnValue(listHookResult(refine.refetch));
  });

  it('keeps create open until the composed authoritative reread succeeds', async () => {
    const reread = deferred<ReturnType<typeof noticeReceiverListResult>>();
    refine.refetch.mockReturnValueOnce(reread.promise);
    const { result } = renderHook(() => useNoticeReceiverController());
    openValidDraft(result.current.actions);

    let submission!: Promise<boolean>;
    act(() => {
      submission = result.current.actions.submit();
    });
    await waitFor(() => expect(refine.create).toHaveBeenCalledTimes(1));
    expect(result.current.state.draft).not.toBeNull();
    act(() => reread.resolve(noticeReceiverListResult()));
    await act(async () => submission);

    expect(result.current.state.draft).toBeNull();
    expect(refine.notification).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'noticeReceivers.saveSuccess' })
    );
  });

  it('proves a pending save against the latest visible query', async () => {
    const write = deferred<{ data: typeof persistedNoticeReceiver }>();
    const oldRefetch = vi.fn().mockResolvedValue(noticeReceiverListResult());
    const latestRefetch = vi.fn().mockResolvedValue(noticeReceiverListResult());
    refine.create.mockReturnValueOnce(write.promise);
    refine.useList.mockImplementation(({ filters }: { filters: Array<{ value: string }> }) =>
      listHookResult(filters[0]?.value === 'latest' ? latestRefetch : oldRefetch)
    );
    const { result, rerender } = renderHook(() => useNoticeReceiverController());
    openValidDraft(result.current.actions);
    let submission!: Promise<boolean>;
    act(() => {
      submission = result.current.actions.submit();
    });
    await waitFor(() => expect(refine.create).toHaveBeenCalledTimes(1));

    refine.params = 'pageIndex=2&pageSize=8&name=latest';
    rerender();
    await waitFor(() => expect(result.current.state.query).toMatchObject({ name: 'latest', pageIndex: 2 }));
    act(() => write.resolve({ data: persistedNoticeReceiver }));
    await act(async () => submission);

    expect(latestRefetch).toHaveBeenCalledTimes(1);
    expect(oldRefetch).not.toHaveBeenCalled();
  });
});

function listHookResult(refetch: typeof refine.refetch) {
  return {
    query: { error: null, isError: false, isFetching: false, isPending: false, refetch },
    result: { data: [persistedNoticeReceiver], total: 1 }
  };
}

function openValidDraft(actions: {
  create: () => boolean;
  updateDraft: (patch: ReturnType<typeof validNoticeReceiverDraft>) => boolean;
}) {
  act(() => expect(actions.create()).toBe(true));
  act(() => expect(actions.updateDraft(validNoticeReceiverDraft())).toBe(true));
}
