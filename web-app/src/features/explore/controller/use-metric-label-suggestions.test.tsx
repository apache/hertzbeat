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
import { afterEach, expect, it, vi } from 'vitest';
import { loadMetricLabels } from '../api/explore-metric-labels-api';
import type { MetricLabels } from '../model/explore-metric-inventory';
import { useMetricLabelSuggestions } from './use-metric-label-suggestions';
vi.mock('../api/explore-metric-labels-api', async original => ({
  ...(await original<typeof import('../api/explore-metric-labels-api')>()),
  loadMetricLabels: vi.fn()
}));
vi.mock('@/core/auth/session-context', () => ({
  useSession: () => ({
    session: { username: 'operator', workspaceId: 'default', roles: ['ADMIN'], authenticated: true }
  })
}));
const query = { signal: 'metrics' as const, timeRange: 'last-30m' as const, query: 'duration_bucket' };
const window = { from: 1000, to: 2000 };
function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}
const data = (items: string[]): MetricLabels => ({
  context: null,
  source: 'greptime-labels',
  state: 'ready',
  limit: 100,
  truncated: false,
  items
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it('debounces draft edits and never fetches without a validated scope/window', async () => {
  vi.mocked(loadMetricLabels).mockResolvedValue(data(['le']));
  const hook = renderHook(({ value }) => useMetricLabelSuggestions(value, window), {
    initialProps: { value: query },
    wrapper: wrapper()
  });
  expect(loadMetricLabels).not.toHaveBeenCalled();
  hook.rerender({ value: { ...query, query: 'new_metric' } });
  await waitFor(() => expect(hook.result.current.state).toBe('ready'));
  expect(loadMetricLabels).toHaveBeenCalledTimes(1);
  expect(vi.mocked(loadMetricLabels).mock.calls[0]?.[0].query).toBe('new_metric');
  hook.rerender({ value: { ...query, query: 'sum(metric)' } });
  expect(hook.result.current).toEqual({ state: 'idle', items: [], truncated: false });
});

it('aborts old requests and hides stale values immediately on scope change', async () => {
  const requests: { signal?: AbortSignal | undefined; resolve: (value: MetricLabels) => void }[] = [];
  vi.mocked(loadMetricLabels).mockImplementation(
    (_query, _window, _label, signal) => new Promise(resolve => requests.push({ signal, resolve }))
  );
  const hook = renderHook(({ value }) => useMetricLabelSuggestions(value, window), {
    initialProps: { value: { ...query, serviceName: 'checkout' } },
    wrapper: wrapper()
  });
  await waitFor(() => expect(requests).toHaveLength(1));
  hook.rerender({ value: { ...query, serviceName: 'payment' } });
  expect(hook.result.current.items).toEqual([]);
  expect(requests[0]!.signal!.aborted).toBe(true);
  await waitFor(() => expect(requests).toHaveLength(2));
  requests[0]!.resolve(data(['old']));
  requests[1]!.resolve(data(['new']));
  await waitFor(() => expect(hook.result.current.items).toEqual(['new']));
});

it('keeps missing time idle and unavailable distinct from ready empty suggestions', async () => {
  vi.mocked(loadMetricLabels).mockResolvedValue({ ...data([]), state: 'unavailable' });
  const hook = renderHook(({ time }) => useMetricLabelSuggestions(query, time), {
    initialProps: { time: undefined as typeof window | undefined },
    wrapper: wrapper()
  });
  expect(hook.result.current.state).toBe('idle');
  expect(loadMetricLabels).not.toHaveBeenCalled();
  hook.rerender({ time: window });
  await waitFor(() => expect(hook.result.current.state).toBe('unavailable'));
  expect(hook.result.current.items).toEqual([]);
});

function deferredLabels<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}
it.each(['metric', 'service', 'window'] as const)(
  'exits label loading for a new %s and ignores an obsolete rejection',
  async dimension => {
    const old = deferredLabels<MetricLabels>();
    vi.mocked(loadMetricLabels)
      .mockReset()
      .mockReturnValueOnce(old.promise)
      .mockResolvedValueOnce(data(['current']));
    const initial = { ...query, serviceName: 'checkout' };
    const next = {
      ...initial,
      query: dimension === 'metric' ? 'requests_total' : initial.query,
      serviceName: dimension === 'service' ? 'payments' : initial.serviceName
    };
    const nextWindow = dimension === 'window' ? { from: 3000, to: 4000 } : window;
    const hook = renderHook(({ value, time }) => useMetricLabelSuggestions(value, time, 'le'), {
      initialProps: { value: initial, time: window },
      wrapper: wrapper()
    });
    await waitFor(() => expect(loadMetricLabels).toHaveBeenCalledOnce());
    const oldSignal = vi.mocked(loadMetricLabels).mock.calls[0]![3]!;
    hook.rerender({ value: next, time: nextWindow });
    expect(hook.result.current).toEqual({ state: 'loading', items: [], truncated: false });
    expect(oldSignal.aborted).toBe(true);
    await waitFor(() => expect(hook.result.current.items).toEqual(['current']));
    expect(vi.mocked(loadMetricLabels).mock.calls[1]!.slice(0, 3)).toEqual([next, nextWindow, 'le']);
    await act(async () => {
      old.reject(new Error('obsolete label lookup failed'));
      await old.promise.catch(() => undefined);
    });
    expect(hook.result.current).toEqual({ state: 'ready', items: ['current'], truncated: false });
  }
);
it('retries a failed label lookup when its active draft is reopened, without remaining in loading', async () => {
  const retry = deferredLabels<MetricLabels>();
  vi.mocked(loadMetricLabels)
    .mockReset()
    .mockRejectedValueOnce(new Error('labels offline'))
    .mockReturnValueOnce(retry.promise);
  const initialProps: { value: typeof query | undefined } = { value: query };
  const hook = renderHook(
    ({ value }: { value: typeof query | undefined }) => useMetricLabelSuggestions(value, window),
    {
      initialProps,
      wrapper: wrapper()
    }
  );
  await waitFor(() => expect(hook.result.current.state).toBe('error'));
  expect(hook.result.current.items).toEqual([]);
  hook.rerender({ value: undefined });
  expect(hook.result.current.state).toBe('idle');
  hook.rerender({ value: query });
  await waitFor(() => expect(loadMetricLabels).toHaveBeenCalledTimes(2));
  expect(hook.result.current.state).toBe('loading');
  await act(async () => {
    retry.resolve(data([]));
    await retry.promise;
  });
  await waitFor(() => expect(hook.result.current).toEqual({ state: 'ready', items: [], truncated: false }));
});
