/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { act, renderHook, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { NoticeReceiverQuery } from '../model/notice-receiver-model';
import { NoticeReceiverRequestFailure } from '../model/notice-receiver-failure';
import {
  defaultNoticeReceiverQuery,
  deferred,
  noticeReceiverListResult,
  persistedNoticeReceiver
} from './notice-receiver-controller-test-fixtures';

const refine = vi.hoisted(() => ({ getOne: vi.fn(), refetch: vi.fn(), useDataProvider: vi.fn(), useList: vi.fn() }));
vi.mock('@refinedev/core', () => ({ useDataProvider: refine.useDataProvider, useList: refine.useList }));

import { useNoticeReceiverReadController } from './use-notice-receiver-read-controller';

describe('notice receiver read controller', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    refine.getOne.mockResolvedValue({ data: persistedNoticeReceiver });
    refine.refetch.mockResolvedValue(noticeReceiverListResult());
    refine.useDataProvider.mockReturnValue(() => ({ getOne: refine.getOne }));
    refine.useList.mockReturnValue(listHookResult());
  });

  it('rejects getOne evidence for a different receiver id', async () => {
    refine.getOne.mockResolvedValue({ data: { ...persistedNoticeReceiver, id: 8 } });
    const { result } = renderReadController();

    await expect(result.current.loadExact(7)).rejects.toMatchObject({
      name: 'NoticeReceiverRequestFailure',
      kind: 'invalid',
      writeOutcome: 'uncertain'
    });
  });

  it('rereads the latest visible query through a layout-synchronized ref', async () => {
    const oldRefetch = vi.fn().mockResolvedValue(noticeReceiverListResult());
    const latestRefetch = vi.fn().mockResolvedValue(noticeReceiverListResult());
    refine.useList.mockImplementation(({ filters }: { filters: Array<{ value: string }> }) =>
      listHookResult(filters[0]?.value === 'latest' ? latestRefetch : oldRefetch)
    );
    const { result, rerender } = renderHook(
      ({ query }: { query: NoticeReceiverQuery }) => useNoticeReceiverReadController(query),
      { initialProps: { query: defaultNoticeReceiverQuery } }
    );
    const pendingCommandReread = result.current.rereadAuthoritatively;

    rerender({ query: { ...defaultNoticeReceiverQuery, name: 'latest', pageIndex: 2 } });
    await act(async () => pendingCommandReread());

    expect(latestRefetch).toHaveBeenCalledTimes(1);
    expect(oldRefetch).not.toHaveBeenCalled();
  });

  it('rejects projection evidence when its visible query identity changes while refetch is pending', async () => {
    const old = deferred<ReturnType<typeof noticeReceiverListResult>>();
    const oldRefetch = vi.fn().mockReturnValue(old.promise);
    const latestRefetch = vi.fn().mockResolvedValue(noticeReceiverListResult());
    refine.useList.mockImplementation(({ filters }: { filters: Array<{ value: string }> }) =>
      listHookResult(filters[0]?.value === 'latest' ? latestRefetch : oldRefetch)
    );
    const { result, rerender } = renderHook(
      ({ query }: { query: NoticeReceiverQuery }) => useNoticeReceiverReadController(query),
      { initialProps: { query: defaultNoticeReceiverQuery } }
    );

    const pendingProjection = result.current.rereadAuthoritatively();
    rerender({ query: { ...defaultNoticeReceiverQuery, name: 'latest', pageIndex: 2 } });
    act(() => old.resolve(noticeReceiverListResult()));

    await act(async () => {
      await expect(pendingProjection).rejects.toMatchObject({ code: 'NOTICE_RECEIVER_LIST_CONTEXT_CHANGED' });
    });
    expect(latestRefetch).not.toHaveBeenCalled();
  });

  it('does not let an older successful refresh clear a newer failure', async () => {
    const older = deferred<ReturnType<typeof noticeReceiverListResult>>();
    const newer = deferred<{ isError: true; error: NoticeReceiverRequestFailure }>();
    refine.refetch.mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise);
    const { result } = renderReadController();

    let first!: Promise<unknown>;
    let second!: Promise<unknown>;
    act(() => {
      first = result.current.refresh();
      second = result.current.refresh();
    });
    act(() => newer.resolve({ isError: true, error: unavailableFailure() }));
    await act(async () => second);
    expect(result.current.state.list.kind).toBe('unavailable');
    act(() => older.resolve(noticeReceiverListResult()));
    await act(async () => first);
    expect(result.current.state.list.kind).toBe('unavailable');
  });

  it('classifies a collection 404 as error rather than receiver missing', async () => {
    refine.useList.mockReturnValue(
      listHookResult(
        refine.refetch,
        new NoticeReceiverRequestFailure('missing', 'rejected', { code: 'NOTICE_RECEIVER_MISSING' })
      )
    );
    const { result } = renderReadController();
    await waitFor(() => expect(result.current.state.list.kind).toBe('error'));
  });

  it('keeps a successful reread without data visibly invalid', async () => {
    refine.refetch.mockResolvedValue({ isError: false, data: undefined });
    const { result } = renderReadController();

    await act(async () => result.current.refresh());

    expect(result.current.state.list.kind).toBe('invalid');
  });

  it('keeps publishing authoritative failures after StrictMode replays mount effects', async () => {
    refine.refetch.mockResolvedValue({ isError: false, data: undefined });
    const { result } = renderHook(() => useNoticeReceiverReadController(defaultNoticeReceiverQuery), {
      wrapper: StrictMode
    });

    await act(async () => result.current.refresh());

    expect(result.current.state.list.kind).toBe('invalid');
  });
});

function renderReadController() {
  return renderHook(() => useNoticeReceiverReadController(defaultNoticeReceiverQuery));
}

function listHookResult(refetch = refine.refetch, error: NoticeReceiverRequestFailure | null = null) {
  return {
    query: { error, isError: Boolean(error), isFetching: false, isPending: false, refetch },
    result: { data: [persistedNoticeReceiver], total: 1 }
  };
}

function unavailableFailure() {
  return new NoticeReceiverRequestFailure('unavailable', 'uncertain');
}
