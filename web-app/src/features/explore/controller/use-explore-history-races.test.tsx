/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { GlobalTimeProvider, RouteTimeProvider, useSharedTime } from '@/shared/time';
import { traceEvidenceFixture } from '@/test/trace-evidence-fixtures';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ExploreQuery } from '../model/explore-model';
import { exploreQueryKeys } from './explore-query-keys';
import { useExploreHistory } from './use-explore-history';
import { useExploreRefresh } from './use-explore-refresh';

const loaders = vi.hoisted(() => ({ logs: vi.fn(), traces: vi.fn(), metrics: vi.fn() }));
vi.mock('../api/explore-api', async original => ({
  ...(await original<typeof import('../api/explore-api')>()),
  loadLogHistoryEvidence: loaders.logs,
  loadTraceSignal: loaders.traces,
  loadMetricSignal: loaders.metrics
}));
const clients: QueryClient[] = [];
afterEach(() => {
  cleanup();
  clients.splice(0).forEach(client => client.clear());
  vi.resetAllMocks();
  vi.restoreAllMocks();
});
const signals = ['logs', 'traces', 'metrics'] as const;
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}
function response(signal: ExploreQuery['signal'], marker = 'initial') {
  const page = { totalElements: 1, totalPages: 1, number: 0, size: 20 };
  if (signal === 'traces')
    return {
      ...page,
      content: [
        traceEvidenceFixture({ rootSpanName: marker, startTime: 1500, observedStartTime: 1500, observedEndTime: 1501 })
      ]
    };
  if (signal === 'logs')
    return {
      page: {
        ...page,
        content: [
          {
            logRecordUid: null,
            timeUnixNano: '1500000000',
            observedTimeUnixNano: null,
            severityNumber: null,
            severityText: null,
            body: marker,
            attributes: null,
            droppedAttributesCount: null,
            traceId: null,
            spanId: null,
            traceFlags: null,
            resource: null,
            resourceSchemaUrl: null,
            instrumentationScope: null,
            scopeSchemaUrl: null
          }
        ]
      },
      overview: { kind: 'error' as const },
      trend: { kind: 'error' as const }
    };
  return {
    context: null,
    query: marker,
    datasource: 'greptime',
    queryMode: 'explicit',
    results: { status: 200, refId: null, msg: null, frames: [] },
    stats: null,
    emptyStateReason: null,
    errorMessage: null
  };
}
function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  clients.push(client);
  return {
    client,
    Wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )
  };
}
function scopedQuery(signal: ExploreQuery['signal'], query: string, start = 1000, end = 2000): ExploreQuery {
  return { signal, query, timeRange: 'last-30m', serviceName: 'checkout', start, end };
}
function useHistory(query: ExploreQuery) {
  const history = useExploreHistory(query, { from: query.start!, to: query.end! }, true, 0);
  // The page reads fetch state during render, subscribing to TanStack's tracked property.
  return { ...history, fetching: history.queryResult.isFetching };
}

describe('historical signal async ownership', () => {
  it.each(signals.flatMap(signal => ['query', 'window', 'service'].map(dimension => [signal, dimension] as const)))(
    'isolates %s history after a %s-only scope change',
    async (signal, dimension) => {
      const old = deferred<ReturnType<typeof response>>();
      const current = deferred<ReturnType<typeof response>>();
      loaders[signal].mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);
      const initial = scopedQuery(signal, 'same');
      const next = {
        ...initial,
        ...(dimension === 'query'
          ? { query: 'changed' }
          : dimension === 'window'
            ? { start: 3000, end: 4000 }
            : { serviceName: 'payments' })
      };
      const { Wrapper, client } = wrapper();
      const hook = renderHook(({ query }) => useHistory(query), { initialProps: { query: initial }, wrapper: Wrapper });
      await waitFor(() => expect(loaders[signal]).toHaveBeenCalledOnce());
      const obsoleteSignal = loaders[signal].mock.calls[0]![1] as AbortSignal;
      hook.rerender({ query: next });
      await waitFor(() => expect(loaders[signal]).toHaveBeenCalledTimes(2));
      expect(obsoleteSignal.aborted).toBe(true);
      expect(hook.result.current.evidence).toBeUndefined();
      expect(loaders[signal].mock.calls[1]![0]).toMatchObject({
        query: next.query,
        start: next.start,
        end: next.end,
        serviceName: next.serviceName
      });
      const accepted = response(signal, 'current-only');
      await act(async () => {
        current.resolve(accepted);
        await current.promise;
      });
      await waitFor(() => expect(hook.result.current.evidence?.data).toEqual(accepted));
      await act(async () => {
        old.resolve(response(signal, 'obsolete-only'));
        await old.promise;
      });
      expect(hook.result.current.evidence?.data).toEqual(accepted);
      expect(
        client.getQueryData(exploreQueryKeys.history(initial, { from: initial.start!, to: initial.end! }, 0))
      ).toBeUndefined();
    }
  );

  it.each(signals)(
    'follows shared time revisions 0→1→2 for %s and retains evidence after the newest failure',
    async signal => {
      let now = 3_000_000;
      vi.spyOn(Date, 'now').mockImplementation(() => now);
      const initial = response(signal, 'initial-evidence');
      const old = deferred<ReturnType<typeof response>>();
      const current = deferred<ReturnType<typeof response>>();
      loaders[signal]
        .mockResolvedValueOnce(initial)
        .mockReturnValueOnce(old.promise)
        .mockReturnValueOnce(current.promise);
      const query: ExploreQuery = { signal, query: 'same', serviceName: 'checkout', timeRange: 'last-30m' };
      const { Wrapper, client } = wrapper();
      const TimeWrapper = ({ children }: { children: ReactNode }) => (
        <Wrapper>
          <MemoryRouter>
            <GlobalTimeProvider>
              <RouteTimeProvider policy="route_owned">{children}</RouteTimeProvider>
            </GlobalTimeProvider>
          </MemoryRouter>
        </Wrapper>
      );
      const hook = renderHook(
        () => {
          const time = useSharedTime();
          const history = useExploreHistory(query, time.window, true, time.refreshRevision);
          const refresh = useExploreRefresh(query, true, time, history.queryResult.refetch);
          return { ...history, fetching: history.queryResult.isFetching, time, refresh };
        },
        { wrapper: TimeWrapper }
      );
      await waitFor(() => expect(hook.result.current.evidence?.data).toEqual(initial));
      const originalWindow = hook.result.current.time.window!;
      expect(hook.result.current.time.refreshRevision).toBe(0);
      expect(loaders[signal].mock.calls[0]![0]).toMatchObject({ start: originalWindow.from, end: originalWindow.to });
      now += 1000;
      await act(() => hook.result.current.refresh());
      await waitFor(() => expect(loaders[signal]).toHaveBeenCalledTimes(2));
      expect(hook.result.current.time.refreshRevision).toBe(1);
      const oldWindow = hook.result.current.time.window!;
      const oldSignal = loaders[signal].mock.calls[1]![1] as AbortSignal;
      expect(oldWindow.to).toBe(now);
      now += 1000;
      await act(() => hook.result.current.refresh());
      await waitFor(() => expect(loaders[signal]).toHaveBeenCalledTimes(3));
      expect(hook.result.current.time.refreshRevision).toBe(2);
      const latestWindow = hook.result.current.time.window!;
      expect(oldSignal.aborted).toBe(true);
      expect(loaders[signal].mock.calls[2]![0]).toMatchObject({ start: latestWindow.from, end: latestWindow.to });
      await act(async () => {
        current.reject(new Error('latest-generation failed'));
        await current.promise.catch(() => undefined);
      });
      await waitFor(() => expect(hook.result.current.queryResult.isError).toBe(true));
      expect(hook.result.current.evidence).toMatchObject({ data: initial, revision: 0, window: originalWindow });
      await act(async () => {
        old.resolve(response(signal, 'late-revision-1'));
        await old.promise;
      });
      expect(hook.result.current.evidence).toMatchObject({ data: initial, revision: 0, window: originalWindow });
      expect(hook.result.current.queryResult.error).toMatchObject({ message: 'latest-generation failed' });
      expect(client.getQueryData(exploreQueryKeys.history(query, oldWindow, 1))).toBeUndefined();
      expect(hook.result.current.fetching).toBe(false);
    }
  );

  it.each(signals)(
    'captures a relative %s window per revision and reuses equivalent focused evidence',
    async signal => {
      let now = 3_000_000;
      vi.spyOn(Date, 'now').mockImplementation(() => now);
      const initial = response(signal, 'captured');
      loaders[signal].mockResolvedValue(initial);
      const query: ExploreQuery = { signal, query: 'same', serviceName: 'checkout', timeRange: 'last-30m' };
      const { Wrapper } = wrapper();
      const hook = renderHook(
        ({ revision }) => {
          const history = useExploreHistory(query, undefined, true, revision);
          return { ...history, fetching: history.queryResult.isFetching };
        },
        { initialProps: { revision: 0 }, wrapper: Wrapper }
      );
      await waitFor(() => expect(hook.result.current.evidence?.revision).toBe(0));
      expect(hook.result.current.evidence?.window).toEqual({ from: 1_200_000, to: 3_000_000 });
      now += 1000;
      hook.rerender({ revision: 1 });
      await waitFor(() => expect(hook.result.current.evidence?.revision).toBe(1));
      const window = { from: 1_201_000, to: 3_001_000 };
      expect(loaders[signal].mock.calls[1]![0]).toMatchObject({ start: window.from, end: window.to });
      const focused = renderHook(
        () => useExploreHistory({ ...query, start: window.from, end: window.to }, window, true, 1, true),
        { wrapper: Wrapper }
      );
      expect(focused.result.current.evidence).toMatchObject({ data: initial, window, revision: 1 });
      await act(async () => {
        await Promise.resolve();
      });
      expect(loaders[signal]).toHaveBeenCalledTimes(2);
      expect(focused.result.current.queryResult.isFetching).toBe(false);
    }
  );

  it.each(signals)('keeps only the latest %s query/window after obsolete success and failure', async signal => {
    const first = deferred<ReturnType<typeof response>>();
    const second = deferred<ReturnType<typeof response>>();
    const current = deferred<ReturnType<typeof response>>();
    loaders[signal]
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)
      .mockReturnValueOnce(current.promise);
    const { client, Wrapper } = wrapper();
    const initial = scopedQuery(signal, 'first');
    const next = scopedQuery(signal, 'second', 3000, 4000);
    const latest = { ...scopedQuery(signal, 'latest', 5000, 6000), serviceName: 'payments' };
    const hook = renderHook(({ query }) => useHistory(query), { initialProps: { query: initial }, wrapper: Wrapper });
    await waitFor(() => expect(loaders[signal]).toHaveBeenCalledTimes(1));
    const firstSignal = loaders[signal].mock.calls[0]![1] as AbortSignal;
    hook.rerender({ query: next });
    expect(hook.result.current.evidence).toBeUndefined();
    await waitFor(() => expect(loaders[signal]).toHaveBeenCalledTimes(2));
    const secondSignal = loaders[signal].mock.calls[1]![1] as AbortSignal;
    hook.rerender({ query: latest });
    expect(hook.result.current.evidence).toBeUndefined();
    await waitFor(() => expect(loaders[signal]).toHaveBeenCalledTimes(3));
    expect(firstSignal.aborted).toBe(true);
    expect(secondSignal.aborted).toBe(true);
    expect(loaders[signal].mock.calls[2]![0]).toMatchObject({
      query: 'latest',
      start: 5000,
      end: 6000,
      serviceName: 'payments'
    });
    const accepted = response(signal, 'current');
    await act(async () => {
      current.resolve(accepted);
      await current.promise;
    });
    await waitFor(() => expect(hook.result.current.evidence?.data).toEqual(accepted));
    await act(async () => {
      second.resolve(response(signal));
      await second.promise;
    });
    await act(async () => {
      first.reject(new Error('obsolete query failed'));
      await first.promise.catch(() => undefined);
    });
    expect(hook.result.current.evidence?.data).toEqual(accepted);
    expect(hook.result.current.queryResult.error).toBeNull();
    for (const query of [initial, next]) {
      expect(
        client.getQueryData(exploreQueryKeys.history(query, { from: query.start!, to: query.end! }, 0))
      ).toBeUndefined();
    }
  });

  it.each(signals)('does not publish an unmounted %s response into a reopened identical query', async signal => {
    const old = deferred<ReturnType<typeof response>>();
    const current = deferred<ReturnType<typeof response>>();
    loaders[signal].mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);
    const { client, Wrapper } = wrapper();
    const query = scopedQuery(signal, 'same');
    const key = exploreQueryKeys.history(query, { from: 1000, to: 2000 }, 0);
    const first = renderHook(() => useHistory(query), { wrapper: Wrapper });
    await waitFor(() => expect(loaders[signal]).toHaveBeenCalledTimes(1));
    const oldSignal = loaders[signal].mock.calls[0]![1] as AbortSignal;
    first.unmount();
    expect(oldSignal.aborted).toBe(true);
    const reopened = renderHook(() => useHistory(query), { wrapper: Wrapper });
    await waitFor(() => expect(loaders[signal]).toHaveBeenCalledTimes(2));
    await act(async () => {
      old.resolve(response(signal));
      await old.promise;
    });
    expect(reopened.result.current.evidence).toBeUndefined();
    expect(client.getQueryData(key)).toBeUndefined();
    const accepted = response(signal, 'current');
    await act(async () => {
      current.resolve(accepted);
      await current.promise;
    });
    await waitFor(() => expect(reopened.result.current.evidence?.data).toEqual(accepted));
  });

  it.each(signals)('keeps the latest %s refresh when repeated clicks cancel an in-flight refresh', async signal => {
    const initial = response(signal);
    const obsolete = deferred<ReturnType<typeof response>>();
    const current = deferred<ReturnType<typeof response>>();
    loaders[signal]
      .mockResolvedValueOnce(initial)
      .mockReturnValueOnce(obsolete.promise)
      .mockReturnValueOnce(current.promise);
    const { Wrapper } = wrapper();
    const hook = renderHook(() => useHistory(scopedQuery(signal, 'refresh')), { wrapper: Wrapper });
    await waitFor(() => expect(hook.result.current.evidence?.data).toBe(initial));
    act(() => {
      void hook.result.current.queryResult.refetch();
      void hook.result.current.queryResult.refetch();
    });
    await waitFor(() => expect(loaders[signal]).toHaveBeenCalledTimes(3));
    const supersededSignal = loaders[signal].mock.calls[1]![1] as AbortSignal;
    const currentSignal = loaders[signal].mock.calls[2]![1] as AbortSignal;
    expect(supersededSignal.aborted).toBe(true);
    expect(currentSignal.aborted).toBe(false);
    await waitFor(() => expect(hook.result.current.queryResult.isFetching).toBe(true));
    expect(hook.result.current.evidence?.data).toBe(initial);
    const accepted = response(signal, 'current');
    await act(async () => {
      current.resolve(accepted);
      await current.promise;
    });
    await waitFor(() => expect(hook.result.current.queryResult.isFetching).toBe(false));
    await act(async () => {
      obsolete.reject(new Error('cancelled refresh failed late'));
      await obsolete.promise.catch(() => undefined);
    });
    expect(hook.result.current.evidence?.data).toEqual(accepted);
    expect(hook.result.current.queryResult.error).toBeNull();
  });

  it.each(signals)('deduplicates repeated %s retries after initial failure and permits a later retry', async signal => {
    const retry = deferred<ReturnType<typeof response>>();
    loaders[signal]
      .mockRejectedValueOnce(new Error('storage temporarily unavailable'))
      .mockReturnValueOnce(retry.promise)
      .mockResolvedValueOnce(response(signal));
    const { Wrapper } = wrapper();
    const hook = renderHook(() => useHistory(scopedQuery(signal, 'retry')), { wrapper: Wrapper });
    await waitFor(() => expect(hook.result.current.queryResult.isError).toBe(true));
    expect(hook.result.current.evidence).toBeUndefined();
    act(() => {
      void hook.result.current.queryResult.refetch();
      void hook.result.current.queryResult.refetch();
    });
    await waitFor(() => expect(loaders[signal]).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(hook.result.current.queryResult.isFetching).toBe(true));
    await act(async () => {
      retry.reject(new Error('retry failed'));
      await retry.promise.catch(() => undefined);
    });
    await waitFor(() => expect(hook.result.current.queryResult.isError).toBe(true));
    expect(hook.result.current.evidence).toBeUndefined();
    await act(() => hook.result.current.queryResult.refetch());
    await waitFor(() => expect(hook.result.current.queryResult.isSuccess).toBe(true));
    expect(loaders[signal]).toHaveBeenCalledTimes(3);
  });
});
