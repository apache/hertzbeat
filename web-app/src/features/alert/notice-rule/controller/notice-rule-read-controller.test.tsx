/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  currentRefetch: vi.fn(),
  useList: vi.fn()
}));

vi.mock('@refinedev/core', () => ({ useList: mocks.useList }));

import type { NoticeRuleQuery } from '../model/notice-rule-model';
import { useNoticeRuleList } from './notice-rule-read-controller';

describe('notice rule authoritative list reread', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useList.mockImplementation(() => ({
      query: {
        error: null,
        isError: false,
        isFetching: false,
        isPending: false,
        refetch: mocks.currentRefetch
      },
      result: { data: [], total: 0 }
    }));
  });

  it('uses the latest query owner when a pending command completes after search changes', async () => {
    const oldRefetch = vi.fn().mockResolvedValue({ data: { data: [], total: 0 }, isError: false });
    const latestRefetch = vi.fn().mockResolvedValue({ data: { data: [], total: 0 }, isError: false });
    mocks.currentRefetch = oldRefetch;
    const initial: NoticeRuleQuery = { name: '', pageIndex: 0, pageSize: 8 };
    const { result, rerender } = renderHook(({ query }) => useNoticeRuleList(query), {
      initialProps: { query: initial }
    });
    const pendingCommandReread = result.current.refreshAuthoritatively;

    mocks.currentRefetch = latestRefetch;
    rerender({ query: { name: 'latest', pageIndex: 0, pageSize: 8 } });
    await act(async () => pendingCommandReread());

    expect(oldRefetch).not.toHaveBeenCalled();
    expect(latestRefetch).toHaveBeenCalledTimes(1);
  });

  it('does not let an older successful reread erase a newer failure', async () => {
    const old = deferred<{ data: { data: never[]; total: number }; isError: false }>();
    mocks.currentRefetch
      .mockReturnValueOnce(old.promise)
      .mockResolvedValueOnce({ error: { statusCode: 503 }, isError: true });
    const query: NoticeRuleQuery = { name: '', pageIndex: 0, pageSize: 8 };
    const { result } = renderHook(() => useNoticeRuleList(query));

    const older = result.current.refreshAuthoritatively();
    await act(async () => {
      await expect(result.current.refreshAuthoritatively()).rejects.toMatchObject({ statusCode: 503 });
    });
    expect(result.current.state.kind).toBe('unavailable');

    old.resolve({ data: { data: [], total: 0 }, isError: false });
    await act(async () => older);
    expect(result.current.state.kind).toBe('unavailable');
  });

  it('classifies a collection 404 as error rather than record missing', async () => {
    mocks.currentRefetch.mockResolvedValueOnce({ error: { statusCode: 404 }, isError: true });
    const query: NoticeRuleQuery = { name: '', pageIndex: 0, pageSize: 8 };
    const { result } = renderHook(() => useNoticeRuleList(query));

    await act(async () => {
      await expect(result.current.refreshAuthoritatively()).rejects.toMatchObject({ statusCode: 404 });
    });

    expect(result.current.state.kind).toBe('error');
  });
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => {
    resolve = done;
  });
  return { promise, resolve };
}
