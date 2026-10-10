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
import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { expect, it, vi } from 'vitest';
import { loadLogStatistics } from '../api/explore-api';
import type { LogExploreQuery } from '../model/explore-model';
import { exploreQueryKeys } from './explore-query-keys';
import { useLogSourceTrend } from './use-log-source-trend';

vi.mock('../api/explore-api', () => ({ loadLogStatistics: vi.fn() }));
const query: LogExploreQuery = { signal: 'logs', query: 'base', timeRange: 'last-30m' };
const projected = { ...query, query: 'source-a', serviceName: 'service-a', start: 1000, end: 2000 };
const window = { from: 1000, to: 2000 };
const evidence: Awaited<ReturnType<typeof loadLogStatistics>> = {
  overview: { kind: 'error' },
  trend: { kind: 'ready', data: { start: 1000, end: 2000, intervalMs: 1000, buckets: [] } }
};
function setup() {
  vi.mocked(loadLogStatistics).mockReset();
  const client = new QueryClient();
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

it('keeps the exact legacy key and query policy, loading the projected source only when enabled', async () => {
  const { client, wrapper } = setup();
  vi.mocked(loadLogStatistics).mockResolvedValue(evidence);
  const first = {
    query,
    projected: undefined as LogExploreQuery | undefined,
    window,
    refreshRevision: 0,
    active: false
  };
  const hook = renderHook(input => useLogSourceTrend(input), { initialProps: first, wrapper });
  expect(loadLogStatistics).not.toHaveBeenCalled();
  expect(
    client
      .getQueryCache()
      .getAll()
      .map(entry => entry.queryKey)
  ).toEqual([['explore-log-source-trend', exploreQueryKeys.history(query, window, 0), 0]]);
  expect(exploreQueryKeys.logSourceTrend(query, window, 0)).toEqual([
    'explore-log-source-trend',
    exploreQueryKeys.history(query, window, 0),
    0
  ]);
  hook.rerender({ ...first, projected, active: true, refreshRevision: 3 });
  await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
  expect(loadLogStatistics).toHaveBeenLastCalledWith(projected, expect.any(AbortSignal));
  const cached = client.getQueryCache().find({ queryKey: exploreQueryKeys.logSourceTrend(projected, window, 3) });
  expect(cached?.options).toMatchObject({ retry: false, staleTime: 30_000, refetchOnWindowFocus: false });
  const second = { ...projected, query: 'source-b', serviceName: 'service-b' };
  hook.rerender({ ...first, projected: second, active: true, refreshRevision: 3 });
  await waitFor(() => expect(loadLogStatistics).toHaveBeenCalledTimes(2));
  hook.rerender({ ...first, projected: second, window: { from: 2000, to: 3000 }, active: true, refreshRevision: 3 });
  await waitFor(() => expect(loadLogStatistics).toHaveBeenCalledTimes(3));
  hook.rerender({ ...first, projected: second, window: { from: 2000, to: 3000 }, active: true, refreshRevision: 4 });
  await waitFor(() => expect(loadLogStatistics).toHaveBeenCalledTimes(4));
  hook.unmount();
  client.clear();
});

it('retains stale evidence on an error and retries only through the returned refetch', async () => {
  const { client, wrapper } = setup();
  vi.mocked(loadLogStatistics)
    .mockResolvedValueOnce(evidence)
    .mockRejectedValueOnce(new Error('unavailable'))
    .mockResolvedValueOnce(evidence);
  const hook = renderHook(() => useLogSourceTrend({ query, projected, window, refreshRevision: 7, active: true }), {
    wrapper
  });
  await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
  await act(async () => {
    await hook.result.current.refetch();
  });
  await waitFor(() => expect(hook.result.current.isError).toBe(true));
  expect(hook.result.current.data).toEqual(evidence);
  expect(loadLogStatistics).toHaveBeenCalledTimes(2);
  await act(async () => {
    await hook.result.current.refetch();
  });
  await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
  expect(loadLogStatistics).toHaveBeenCalledTimes(3);
  hook.unmount();
  client.clear();
});

it('aborts the retired source and ignores its late completion after a source/window revision change', async () => {
  const { client, wrapper } = setup();
  let finish: (value: typeof evidence) => void = () => undefined;
  let retired: AbortSignal | undefined;
  vi.mocked(loadLogStatistics)
    .mockImplementationOnce((_query, signal) => {
      retired = signal;
      return new Promise(resolve => {
        finish = resolve;
      });
    })
    .mockResolvedValueOnce(evidence);
  const first = { query, projected, window, refreshRevision: 1, active: true };
  const hook = renderHook(input => useLogSourceTrend(input), { initialProps: first, wrapper });
  await waitFor(() => expect(loadLogStatistics).toHaveBeenCalledOnce());
  hook.rerender({
    ...first,
    projected: { ...projected, query: 'source-b' },
    window: { from: 3000, to: 4000 },
    refreshRevision: 2
  });
  await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
  expect(retired?.aborted).toBe(true);
  await act(async () => {
    finish({ ...evidence, trend: { kind: 'error', reason: 'permission' } });
    await Promise.resolve();
  });
  expect(hook.result.current.data).toEqual(evidence);
  hook.unmount();
  client.clear();
});

it('allows explicit refetch for a valid projected source while automatic loading is disabled', async () => {
  const { client, wrapper } = setup();
  vi.mocked(loadLogStatistics).mockResolvedValue(evidence);
  const hook = renderHook(() => useLogSourceTrend({ query, projected, window, refreshRevision: 9, active: false }), {
    wrapper
  });
  expect(loadLogStatistics).not.toHaveBeenCalled();
  expect(
    client
      .getQueryCache()
      .getAll()
      .map(entry => entry.queryKey)
  ).toEqual([['explore-log-source-trend', exploreQueryKeys.history(projected, window, 9), 9]]);
  await act(async () => {
    const refreshed = await hook.result.current.refetch();
    expect(refreshed.isSuccess).toBe(true);
    expect(refreshed.data).toEqual(evidence);
  });
  expect(client.getQueryCache().getAll()[0]?.state).toMatchObject({ status: 'success', data: evidence });
  expect(loadLogStatistics).toHaveBeenCalledExactlyOnceWith(projected, expect.any(AbortSignal));
  hook.unmount();
  client.clear();
});

it('keeps a selected-source partial permission failure as typed evidence without losing its sibling', async () => {
  const { client, wrapper } = setup();
  const partial = { ...evidence, overview: { kind: 'error' as const, reason: 'permission' as const } };
  vi.mocked(loadLogStatistics).mockResolvedValue(partial);
  const hook = renderHook(() => useLogSourceTrend({ query, projected, window, refreshRevision: 4, active: true }), {
    wrapper
  });
  await waitFor(() => expect(hook.result.current.data).toEqual(partial));
  expect(hook.result.current.isError).toBe(false);
  expect(hook.result.current.data?.trend).toBe(partial.trend);
  expect(loadLogStatistics).toHaveBeenCalledExactlyOnceWith(projected, expect.any(AbortSignal));
  hook.unmount();
  client.clear();
});
