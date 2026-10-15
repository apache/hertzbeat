/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
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
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ExploreQuery } from '../model/explore-model';
import type { MetricInventory } from '../model/explore-metric-inventory';

const api = vi.hoisted(() => ({
  load: vi.fn(),
  time: null as { window: { from: number; to: number }; refreshRevision: number } | null,
  identity: { username: 'operator', workspaceId: 'default', roles: ['ADMIN'], authenticated: true }
}));
vi.mock('../api/explore-api', async original => ({
  ...(await original<typeof import('../api/explore-api')>()),
  loadMetricInventory: api.load
}));
vi.mock('@/core/auth/session-context', () => ({ useSession: () => ({ session: api.identity }) }));
vi.mock('@/shared/time', async original => ({
  ...(await original<typeof import('@/shared/time')>()),
  useSharedTimeOptional: () => api.time
}));
import { useMetricInventory } from './use-metric-inventory';

const scope: ExploreQuery = { signal: 'metrics', timeRange: 'last-30m', start: 1000, end: 2000 };
const inventory = (name: string): MetricInventory => ({
  context: null,
  source: 'greptime-inventory',
  limit: 100,
  truncated: false,
  items: [{ metricName: name, family: null }]
});
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
let client: QueryClient;
afterEach(() => {
  cleanup();
  client.clear();
  vi.clearAllMocks();
  api.time = null;
});

describe('remote metric catalog', () => {
  it('ignores stale exact timestamps for a preset and follows the refreshed shared window', async () => {
    client = new QueryClient();
    api.time = { window: { from: 1000000000000, to: 1000001800000 }, refreshRevision: 0 };
    api.load.mockResolvedValue(inventory('process_cpu_usage'));
    const query: ExploreQuery = {
      ...scope,
      windowMode: 'preset',
      serviceName: 'HertzBeat',
      serviceNamespace: 'hertzbeat',
      environment: 'local',
      collectorId: 'collector'
    };
    const { rerender } = renderHook(({ current }) => useMetricInventory(current), {
      initialProps: { current: query },
      wrapper
    });
    expect(api.load).not.toHaveBeenCalled();
    const validPreset = { ...query, start: undefined, end: undefined };
    rerender({ current: validPreset });
    await waitFor(() => expect(api.load).toHaveBeenCalledOnce());
    expect(api.load.mock.calls[0]?.[0]).toMatchObject({
      start: 1000000000000,
      end: 1000001800000,
      windowMode: undefined
    });
    api.time = { window: { from: 1000000060000, to: 1000001860000 }, refreshRevision: 1 };
    rerender({ current: validPreset });
    await waitFor(() => expect(api.load).toHaveBeenCalledTimes(2));
    expect(api.load.mock.calls[1]?.[0]).toMatchObject({ start: 1000000060000, end: 1000001860000 });
  });
  it('debounces a server search beyond the initial bounded list without retaining old matches', async () => {
    client = new QueryClient();
    api.load.mockResolvedValueOnce(inventory('initial_metric')).mockResolvedValueOnce(inventory('process_cpu_usage'));
    const { result } = renderHook(() => useMetricInventory(scope), { wrapper });
    await waitFor(() => expect(result.current.data?.items[0]?.metricName).toBe('initial_metric'));
    act(() => result.current.setSearch('process_'));
    expect(result.current.data).toBeUndefined();
    expect(result.current.state).toBe('loading');
    act(() => result.current.setSearch('process_cpu'));
    expect(api.load).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(result.current.data?.items[0]?.metricName).toBe('process_cpu_usage'));
    expect(api.load).toHaveBeenCalledTimes(2);
    expect(api.load.mock.calls[1]?.[1]).toBe('process_cpu');
  });

  it('aborts an obsolete request and isolates names across resource scope, time, and workspace identity', async () => {
    client = new QueryClient();
    let resolveOld: ((value: MetricInventory) => void) | undefined;
    api.load
      .mockImplementationOnce(
        () =>
          new Promise<MetricInventory>(resolve => {
            resolveOld = resolve;
          })
      )
      .mockResolvedValueOnce(inventory('other_service'))
      .mockResolvedValueOnce(inventory('other_window'))
      .mockResolvedValueOnce(inventory('other_workspace'));
    const { result, rerender } = renderHook(({ query }) => useMetricInventory(query), {
      initialProps: { query: scope },
      wrapper
    });
    await waitFor(() => expect(api.load).toHaveBeenCalledOnce());
    const oldSignal = api.load.mock.calls[0]?.[2] as AbortSignal;
    rerender({ query: { ...scope, serviceName: 'other' } });
    expect(result.current.data).toBeUndefined();
    await waitFor(() => expect(result.current.data?.items[0]?.metricName).toBe('other_service'));
    expect(oldSignal.aborted).toBe(true);
    await act(() => Promise.resolve(resolveOld?.(inventory('old_service'))));
    expect(result.current.data?.items[0]?.metricName).toBe('other_service');
    rerender({ query: { ...scope, serviceName: 'other', end: 3000 } });
    await waitFor(() => expect(result.current.data?.items[0]?.metricName).toBe('other_window'));
    const previousIdentity = api.identity;
    api.identity = { ...api.identity, workspaceId: 'another' };
    rerender({ query: { ...scope, serviceName: 'other', end: 3000 } });
    expect(result.current.data).toBeUndefined();
    await waitFor(() => expect(result.current.data?.items[0]?.metricName).toBe('other_workspace'));
    api.identity = previousIdentity;
  });

  it('keeps a storage failure distinct from a successful empty catalog', async () => {
    client = new QueryClient();
    api.load.mockRejectedValueOnce(new Error('unavailable')).mockResolvedValueOnce({ ...inventory(''), items: [] });
    const { result } = renderHook(() => useMetricInventory(scope), { wrapper });
    await waitFor(() => expect(result.current.state).toBe('error'));
    expect(result.current.data).toBeUndefined();
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.state).toBe('ready'));
    expect(result.current.data?.items).toEqual([]);
  });
});

it('cancels a delayed metadata retry when service scope changes and ignores its late failure', async () => {
  client = new QueryClient();
  let rejectRetry!: (error: Error) => void;
  const retry = new Promise<MetricInventory>((_resolve, reject) => {
    rejectRetry = reject;
  });
  api.load
    .mockReset()
    .mockRejectedValueOnce(new Error('catalog offline'))
    .mockReturnValueOnce(retry)
    .mockResolvedValueOnce(inventory('current_service_metric'));
  const hook = renderHook(({ current }) => useMetricInventory(current), {
    initialProps: { current: { ...scope, serviceName: 'checkout', serviceNamespace: 'commerce', environment: 'prod' } },
    wrapper
  });
  await waitFor(() => expect(hook.result.current.state).toBe('error'));
  act(() => hook.result.current.retry());
  await waitFor(() => expect(hook.result.current.state).toBe('loading'));
  const retrySignal = api.load.mock.calls[1]![2] as AbortSignal;
  hook.rerender({ current: { ...scope, serviceName: 'payments', serviceNamespace: 'commerce', environment: 'prod' } });
  expect(hook.result.current.data).toBeUndefined();
  await waitFor(() => expect(hook.result.current.data?.items[0]?.metricName).toBe('current_service_metric'));
  expect(retrySignal.aborted).toBe(true);
  expect(api.load.mock.calls[2]!.slice(0, 2)).toEqual([
    { ...scope, serviceName: 'payments', serviceNamespace: 'commerce', environment: 'prod', windowMode: undefined },
    ''
  ]);
  await act(async () => {
    rejectRetry(new Error('obsolete retry failed'));
    await retry.catch(() => undefined);
  });
  expect(hook.result.current.state).toBe('ready');
  expect(hook.result.current.data?.items[0]?.metricName).toBe('current_service_metric');
});
