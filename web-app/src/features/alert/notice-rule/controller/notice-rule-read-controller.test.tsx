/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  currentRefetch: vi.fn(),
  loadReceivers: vi.fn(),
  loadTemplates: vi.fn(),
  useList: vi.fn()
}));

vi.mock('@refinedev/core', () => ({ useList: mocks.useList }));
vi.mock('../api/notice-rule-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/notice-rule-api')>()),
  loadAllNoticeReceivers: mocks.loadReceivers,
  loadAllNoticeTemplates: mocks.loadTemplates
}));

import type { NoticeRuleQuery } from '../model/notice-rule-model';
import {
  NoticeRuleContractError,
  NoticeRuleDomainFailure,
  NoticeRuleRequestFailure
} from '../model/notice-rule-failure';
import { useNoticeRuleList, useNoticeRuleOptions } from './notice-rule-read-controller';

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
      .mockResolvedValueOnce({ error: new NoticeRuleRequestFailure('unavailable'), isError: true });
    const query: NoticeRuleQuery = { name: '', pageIndex: 0, pageSize: 8 };
    const { result } = renderHook(() => useNoticeRuleList(query));

    const older = result.current.refreshAuthoritatively();
    await act(async () => {
      await expect(result.current.refreshAuthoritatively()).rejects.toMatchObject({ kind: 'unavailable' });
    });
    expect(result.current.state.kind).toBe('unavailable');

    old.resolve({ data: { data: [], total: 0 }, isError: false });
    await act(async () => older);
    expect(result.current.state.kind).toBe('unavailable');
  });

  it('classifies a collection 404 as error rather than record missing', async () => {
    mocks.currentRefetch.mockResolvedValueOnce({ error: new NoticeRuleRequestFailure('missing'), isError: true });
    const query: NoticeRuleQuery = { name: '', pageIndex: 0, pageSize: 8 };
    const { result } = renderHook(() => useNoticeRuleList(query));

    await act(async () => {
      await expect(result.current.refreshAuthoritatively()).rejects.toMatchObject({ kind: 'error' });
    });

    expect(result.current.state.kind).toBe('error');
  });

  it('uses a named invalid failure when a successful reread omits canonical list totals', async () => {
    mocks.currentRefetch.mockResolvedValueOnce({ data: { data: [] }, isError: false });
    const query: NoticeRuleQuery = { name: '', pageIndex: 0, pageSize: 8 };
    const { result } = renderHook(() => useNoticeRuleList(query));

    await act(async () => {
      const failure = result.current.refreshAuthoritatively();
      await expect(failure).rejects.toBeInstanceOf(NoticeRuleContractError);
      await expect(failure).rejects.toMatchObject({
        kind: 'invalid',
        code: 'NOTICE_RULE_LIST_REREAD_INVALID'
      });
    });

    expect(result.current.state.kind).toBe('invalid');
  });

  it('never copies arbitrary reread fields into the thrown domain failure', async () => {
    mocks.currentRefetch.mockResolvedValueOnce({
      error: { statusCode: 503, token: 'private-token' },
      isError: true
    });
    const query: NoticeRuleQuery = { name: '', pageIndex: 0, pageSize: 8 };
    const { result } = renderHook(() => useNoticeRuleList(query));

    await act(async () => {
      const failure = result.current.refreshAuthoritatively();
      await expect(failure).rejects.toBeInstanceOf(NoticeRuleDomainFailure);
      await expect(failure).rejects.toSatisfy(
        (reason: NoticeRuleDomainFailure) => !Object.hasOwn(reason, 'statusCode') && !Object.hasOwn(reason, 'token')
      );
    });
  });
});

describe('notice rule option reads', () => {
  beforeEach(() => vi.clearAllMocks());

  it('forwards TanStack signals and aborts both option reads when their owner unmounts', async () => {
    const receiverRequest = pendingRequest();
    const templateRequest = pendingRequest();
    mocks.loadReceivers.mockImplementation(receiverRequest.load);
    mocks.loadTemplates.mockImplementation(templateRequest.load);

    const view = renderHook(() => useNoticeRuleOptions(), { wrapper: queryWrapper() });
    await waitFor(() => {
      expect(receiverRequest.signal()).toBeInstanceOf(AbortSignal);
      expect(templateRequest.signal()).toBeInstanceOf(AbortSignal);
    });

    view.unmount();

    expect(receiverRequest.signal()?.aborted).toBe(true);
    expect(templateRequest.signal()?.aborted).toBe(true);
  });
});

function pendingRequest() {
  let requestSignal: AbortSignal | undefined;
  return {
    load: (signal: AbortSignal) => {
      requestSignal = signal;
      return new Promise<never>((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true });
      });
    },
    signal: () => requestSignal
  };
}

function queryWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return ({ children }: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => {
    resolve = done;
  });
  return { promise, resolve };
}
