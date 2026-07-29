/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BulletinRequestFailure } from '../model/bulletin-failure';
import type { BulletinQuery } from '../model/bulletin-model';
import {
  useBulletinBatchSelection,
  useBulletinListController,
  useBulletinSelection,
  type BulletinListState
} from './bulletin-list-controller';
import { useBulletinMetrics } from './bulletin-metrics-controller';
import { useBulletinPageCorrection } from './bulletin-page-correction-controller';
import { useBulletinQueryController } from './bulletin-query-controller';
import { bulletinQueryKeys } from './bulletin-query-keys';

const api = vi.hoisted(() => ({ loadBulletinMetrics: vi.fn(), loadBulletins: vi.fn() }));

vi.mock('../api/bulletin-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/bulletin-api')>()),
  loadBulletinMetrics: api.loadBulletinMetrics,
  loadBulletins: api.loadBulletins
}));

const query = { search: 'ops', pageIndex: 0, pageSize: 8 };
const oldRecord = bulletin(7, 'Old');
const freshRecord = bulletin(8, 'Fresh');

describe('Bulletin list controller', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does not start a list read without read capability', async () => {
    const hook = renderHook(() => useBulletinListController(query, false), { wrapper: createWrapper() });

    await act(async () => Promise.resolve());

    expect(hook.result.current.state).toEqual({ kind: 'idle' });
    expect(api.loadBulletins).not.toHaveBeenCalled();
  });

  it('retires cached records and retained refresh transport when read capability is lost', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(bulletinQueryKeys.list(query), page([oldRecord]));
    api.loadBulletins.mockResolvedValue(page([freshRecord]));
    const hook = renderHook(({ canRead }: { canRead: boolean }) => useBulletinListController(query, canRead), {
      initialProps: { canRead: true },
      wrapper: createWrapper(client)
    });
    const retainedRefresh = hook.result.current.refresh;
    expect(hook.result.current.state).toMatchObject({ kind: 'ready', records: [oldRecord] });
    api.loadBulletins.mockClear();

    hook.rerender({ canRead: false });

    expect(hook.result.current.state).toEqual({ kind: 'idle' });
    await act(async () => expect(retainedRefresh()).resolves.toBe(false));
    expect(api.loadBulletins).not.toHaveBeenCalled();
  });

  it('hides stale records after refresh failure and restores authoritative retry data', async () => {
    api.loadBulletins
      .mockResolvedValueOnce(page([oldRecord]))
      .mockRejectedValueOnce(new BulletinRequestFailure('unavailable', 'uncertain'))
      .mockResolvedValueOnce(page([freshRecord]));
    const hook = renderHook(() => useBulletinListController(query), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(hook.result.current.state).toMatchObject({ kind: 'ready', records: [oldRecord] });
    });
    await act(async () => {
      await expect(hook.result.current.refresh()).resolves.toBe(false);
    });
    await waitFor(() => {
      expect(hook.result.current.state).toEqual({ kind: 'unavailable' });
    });

    await act(async () => {
      await expect(hook.result.current.refresh()).resolves.toBe(true);
    });
    await waitFor(() => {
      expect(hook.result.current.state).toMatchObject({ kind: 'ready', records: [freshRecord] });
    });
  });

  it('presents permission failure without exposing list records', async () => {
    api.loadBulletins.mockRejectedValue(new BulletinRequestFailure('permission', 'uncertain'));
    const hook = renderHook(() => useBulletinListController(query), { wrapper: createWrapper() });

    await waitFor(() => expect(hook.result.current.state).toEqual({ kind: 'permission' }));
    expect(hook.result.current.page).toBeUndefined();
  });

  it('returns false when the query function throws during refetch', async () => {
    api.loadBulletins.mockResolvedValueOnce(page([oldRecord]));
    const hook = renderHook(() => useBulletinListController(query), { wrapper: createWrapper() });
    await waitFor(() => expect(hook.result.current.state.kind).toBe('ready'));
    const originalRefresh = hook.result.current.refresh;

    api.loadBulletins.mockImplementationOnce(() => {
      throw new Error('observer boundary failed');
    });
    await act(async () => {
      await expect(originalRefresh()).resolves.toBe(false);
    });
  });

  it('does not present an incomplete non-empty page as an authoritative empty result', async () => {
    api.loadBulletins.mockResolvedValue({
      content: [],
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 8
    });
    const hook = renderHook(() => useBulletinListController(query), { wrapper: createWrapper() });

    await waitFor(() => expect(hook.result.current.state).toEqual({ kind: 'invalid' }));
  });

  it('presents an authoritative non-empty overflow page as correcting instead of empty', async () => {
    const overflowQuery = { search: 'ops', pageIndex: 2, pageSize: 8 };
    api.loadBulletins.mockResolvedValue({
      content: [],
      totalElements: 9,
      totalPages: 2,
      number: 2,
      size: 8
    });
    const hook = renderHook(() => useBulletinListController(overflowQuery), { wrapper: createWrapper() });

    await waitFor(() => expect(hook.result.current.state).toEqual({ kind: 'correcting' }));
    expect(hook.result.current.page).toMatchObject({ number: 2, totalElements: 9, totalPages: 2, size: 8 });
  });

  it('presents only authoritative zero-total page zero as empty', async () => {
    api.loadBulletins.mockResolvedValue({
      content: [],
      totalElements: 0,
      totalPages: 0,
      number: 0,
      size: 8
    });
    const hook = renderHook(() => useBulletinListController(query), { wrapper: createWrapper() });

    await waitFor(() => expect(hook.result.current.state).toEqual({ kind: 'empty' }));
  });

  it('loads the final legal page after a delete refresh proves the current page is empty', async () => {
    const legalRecords = Array.from({ length: 8 }, (_, index) => bulletin(20 + index, `Record ${index}`));
    api.loadBulletins
      .mockResolvedValueOnce({
        content: [oldRecord],
        totalElements: 17,
        totalPages: 3,
        number: 2,
        size: 8
      })
      .mockResolvedValueOnce({
        content: [],
        totalElements: 16,
        totalPages: 2,
        number: 2,
        size: 8
      })
      .mockResolvedValueOnce({
        content: legalRecords,
        totalElements: 16,
        totalPages: 2,
        number: 1,
        size: 8
      });
    const hook = renderHook(usePaginationRecoveryHarness, { wrapper: createRouteWrapper() });
    await waitFor(() => expect(hook.result.current.list.state.kind).toBe('ready'));

    await act(async () => expect(hook.result.current.list.refresh()).resolves.toBe(true));

    await waitFor(() => {
      expect(hook.result.current.query.query.pageIndex).toBe(1);
      expect(hook.result.current.list.state).toMatchObject({ kind: 'ready', records: legalRecords, total: 16 });
    });
    expect(hook.result.current.location.search).toBe('?pageIndex=1&pageSize=8&search=ops');
    expect(api.loadBulletins.mock.calls.map(([request]) => request.pageIndex)).toEqual([2, 2, 1]);
  });

  it('synchronously retires selection and metrics when the canonical list query changes', async () => {
    api.loadBulletinMetrics.mockReturnValue(new Promise(() => undefined));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const firstQuery = { search: '', pageIndex: 0, pageSize: 8 };
    const secondQuery = { ...firstQuery, pageIndex: 1 };
    const hook = renderHook(
      ({ list, query }: { list: BulletinListState; query: BulletinQuery }) => useSelectionHarness(query, list),
      {
        initialProps: {
          list: { kind: 'ready', records: [oldRecord], total: 1 } as BulletinListState,
          query: firstQuery
        },
        wrapper: createWrapper(client)
      }
    );

    act(() => hook.result.current.select(7));
    await waitFor(() => expect(api.loadBulletinMetrics).toHaveBeenCalledWith(7, expect.any(AbortSignal)));
    expect(
      client
        .getQueryCache()
        .find({ queryKey: bulletinQueryKeys.metrics(7) })
        ?.getObserversCount()
    ).toBe(1);

    hook.rerender({ list: { kind: 'loading' }, query: secondQuery });

    expect(hook.result.current.selectedId).toBeNull();
    expect(hook.result.current.metrics).toEqual({ kind: 'idle' });
    expect(
      client
        .getQueryCache()
        .find({ queryKey: bulletinQueryKeys.metrics(7) })
        ?.getObserversCount()
    ).toBe(0);
  });

  it('retires batch selection when the authoritative page scope changes', () => {
    const firstQuery = { search: '', pageIndex: 0, pageSize: 8 };
    const secondQuery = { ...firstQuery, pageIndex: 1 };
    const hook = renderHook(
      ({ list, query }: { list: BulletinListState; query: BulletinQuery }) => useBulletinBatchSelection(query, list),
      {
        initialProps: {
          list: { kind: 'ready', records: [oldRecord], total: 1 } as BulletinListState,
          query: firstQuery
        }
      }
    );

    act(() => hook.result.current.selectIds([7]));
    expect(hook.result.current.selectedIds).toEqual([7]);

    hook.rerender({
      list: { kind: 'ready', records: [freshRecord], total: 1 },
      query: secondQuery
    });

    expect(hook.result.current.selectedIds).toEqual([]);
  });

  it.each([
    ['save selection', 7],
    ['delete clear', null]
  ] as const)('rejects a retired-scope %s without losing the new-scope selection', (_operation, lateValue) => {
    const firstQuery = { search: 'old', pageIndex: 0, pageSize: 8 };
    const secondQuery = { ...firstQuery, search: 'new' };
    const hook = renderHook(
      ({ query, record }: { query: BulletinQuery; record: typeof oldRecord }) =>
        useSelectionHarness(query, { kind: 'ready', records: [record], total: 1 }),
      { initialProps: { query: firstQuery, record: oldRecord }, wrapper: createWrapper() }
    );
    const retiredSetter = hook.result.current.select;

    hook.rerender({ query: secondQuery, record: freshRecord });
    act(() => hook.result.current.select(8));
    expect(hook.result.current.selectedId).toBe(8);

    act(() => retiredSetter(lateValue));

    expect(hook.result.current.selectedId).toBe(8);
  });

  it('retains a valid selection while the same canonical query refreshes', async () => {
    api.loadBulletinMetrics.mockReturnValue(new Promise(() => undefined));
    const hook = renderHook(({ list }: { list: BulletinListState }) => useSelectionHarness(query, list), {
      initialProps: { list: { kind: 'ready', records: [oldRecord], total: 1 } as BulletinListState },
      wrapper: createWrapper()
    });

    act(() => hook.result.current.select(7));
    await waitFor(() => expect(api.loadBulletinMetrics).toHaveBeenCalledWith(7, expect.any(AbortSignal)));

    hook.rerender({ list: { kind: 'loading' } });
    expect(hook.result.current.selectedId).toBe(7);
    expect(hook.result.current.metrics).toEqual({ kind: 'loading' });

    hook.rerender({ list: { kind: 'ready', records: [oldRecord], total: 1 } });
    expect(hook.result.current.selectedId).toBe(7);
  });

  it('does not let a retired list completion clear or restore the new scope selection', async () => {
    const retiredList = deferred<ReturnType<typeof page>>();
    const firstQuery = { search: 'old', pageIndex: 0, pageSize: 8 };
    const secondQuery = { ...firstQuery, search: 'new' };
    api.loadBulletins.mockImplementation(current =>
      current.search === 'old' ? retiredList.promise : Promise.resolve(page([freshRecord]))
    );
    api.loadBulletinMetrics.mockReturnValue(new Promise(() => undefined));
    const hook = renderHook(({ query }: { query: BulletinQuery }) => useOwnedSelectionHarness(query), {
      initialProps: { query: firstQuery },
      wrapper: createWrapper()
    });

    act(() => hook.result.current.select(7));
    expect(hook.result.current.selectedId).toBe(7);

    hook.rerender({ query: secondQuery });
    expect(hook.result.current.selectedId).toBeNull();
    await waitFor(() => expect(hook.result.current.list.kind).toBe('ready'));
    act(() => hook.result.current.select(8));
    expect(hook.result.current.selectedId).toBe(8);

    retiredList.resolve(page([oldRecord]));
    await act(() => retiredList.promise);

    expect(hook.result.current.selectedId).toBe(8);
    expect(hook.result.current.query).toEqual(secondQuery);
  });

  it('cancels the retired list request when the canonical query changes', async () => {
    const requests: Array<{ query: BulletinQuery; signal: AbortSignal }> = [];
    const firstQuery = { search: 'old', pageIndex: 0, pageSize: 8 };
    const secondQuery = { ...firstQuery, search: 'latest' };
    api.loadBulletins.mockImplementation((current: BulletinQuery, signal: AbortSignal) => {
      requests.push({ query: current, signal });
      if (current.search === 'latest') return Promise.resolve({ ...page([]), totalPages: 0 });
      return new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(new DOMException('abort', 'AbortError')), { once: true });
      });
    });
    const hook = renderHook(({ query }: { query: BulletinQuery }) => useBulletinListController(query), {
      initialProps: { query: firstQuery },
      wrapper: createWrapper()
    });
    await waitFor(() => expect(requests).toHaveLength(1));

    hook.rerender({ query: secondQuery });

    await waitFor(() => expect(hook.result.current.state).toEqual({ kind: 'empty' }));
    expect(requests[0]?.signal.aborted).toBe(true);
    expect(requests[1]).toMatchObject({ query: secondQuery });
    expect(requests[1]?.signal).toBeInstanceOf(AbortSignal);
  });
});

function createWrapper(client = new QueryClient({ defaultOptions: { queries: { retry: false } } })) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

function createRouteWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/bulletin?search=ops&pageIndex=2&pageSize=8']}>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  };
}

function usePaginationRecoveryHarness() {
  const query = useBulletinQueryController();
  const list = useBulletinListController(query.query);
  useBulletinPageCorrection(query.query, list.page, query.replacePageIndex);
  return { list, location: useLocation(), query };
}

function useSelectionHarness(query: BulletinQuery, list: BulletinListState) {
  const selection = useBulletinSelection(query, list);
  return {
    metrics: useBulletinMetrics(selection.selectedId),
    query,
    select: selection.setSelectedId,
    selectedId: selection.selectedId
  };
}

function useOwnedSelectionHarness(query: BulletinQuery) {
  const list = useBulletinListController(query);
  const selection = useBulletinSelection(query, list.state);
  return {
    list: list.state,
    metrics: useBulletinMetrics(selection.selectedId),
    query,
    select: selection.setSelectedId,
    selectedId: selection.selectedId
  };
}

function page(content: ReturnType<typeof bulletin>[]) {
  return { content, totalElements: content.length, totalPages: 1, number: 0, size: 8 };
}

function bulletin(id: number, name: string) {
  return {
    id,
    name,
    app: 'website',
    monitorIds: [1],
    fields: { responseTime: ['duration'] },
    creator: null,
    modifier: null,
    gmtCreate: null,
    gmtUpdate: null
  };
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>(fulfill => {
    resolve = fulfill;
  });
  return { promise, resolve };
}
