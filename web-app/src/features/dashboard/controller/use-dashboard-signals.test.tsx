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
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const calls = vi.hoisted(() => ({
  session: { authenticated: true, workspaceId: 'default', username: 'admin' },
  metric: vi.fn<(query: MetricExploreQuery, signal?: AbortSignal) => Promise<MetricSignalEvidence>>(),
  logs: vi.fn(),
  traces: vi.fn(),
  samples: vi.fn(),
  rank: vi.fn<(scope: RepeatedErrorScope, signal?: AbortSignal) => Promise<RepeatedErrors>>()
}));
vi.mock('@/core/auth/session-context', () => ({
  useSession: () => ({ session: calls.session })
}));
vi.mock('@/features/explore', async original => ({
  ...(await original<typeof import('@/features/explore')>()),
  loadMetricSignal: calls.metric,
  loadLogStatistics: calls.logs,
  loadTraceAnalytics: calls.traces,
  loadErrorTraceSamples: calls.samples
}));
vi.mock('../api/dashboard-repeated-errors-api', () => ({
  loadRepeatedErrors: calls.rank,
  loadRepeatedErrorRecords: vi.fn()
}));
vi.mock('@/features/entity/queries', () => ({
  loadEntities: () => Promise.resolve({ content: [] }),
  readEntityQuery: () => ({})
}));
import { useDashboardSignals } from './use-dashboard-signals';
import type { SavedQueryRecord, MetricExploreQuery, MetricSignalEvidence } from '@/features/explore';
import type { RepeatedErrorScope, RepeatedErrors } from '../model/dashboard-repeated-errors';
const favorites: SavedQueryRecord[] = [1, 2, 3, 4].map(index => ({
  signal: 'metrics',
  viewKey: `metric-${index}`,
  label: `metric ${index}`,
  route: '/explore?signal=metrics',
  payload: JSON.stringify({ version: 1, query: { signal: 'metrics', timeRange: 'last-15m', query: `metric_${index}` } })
}));
function hook() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return renderHook(() => useDashboardSignals(favorites, 'ready'), {
    wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  });
}
describe('start signal orchestration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1700000000000);
    vi.clearAllMocks();
    sessionStorage.clear();
    calls.session = { authenticated: true, workspaceId: 'default', username: 'admin' };
    calls.metric.mockResolvedValue({ kind: 'selection_required' });
    calls.logs.mockResolvedValue({ trend: { kind: 'error' }, overview: { kind: 'error' } });
    calls.traces.mockResolvedValue({ state: 'unavailable' });
    calls.samples.mockResolvedValue({ state: 'ready', rows: [] });
    calls.rank.mockImplementation(scope =>
      Promise.resolve({
        state: 'unsupported',
        scope,
        coverage: null,
        matchingEvents: null,
        groups: []
      })
    );
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });
  it('loads only the current and next favorite using the same fixed window', async () => {
    const view = hook();
    await act(async () => {});
    expect(calls.metric).toHaveBeenCalledTimes(2);
    const requests = calls.metric.mock.calls.map(call => call[0]);
    expect(requests.map(query => query.query)).toEqual(['metric_1', 'metric_2']);
    expect(requests.every(query => query.start === 1699999100000 && query.end === 1700000000000)).toBe(true);
    act(() => view.result.current.setMetricInteracting(true));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(9000);
    });
    expect(view.result.current.activeIndex).toBe(0);
    expect(calls.metric).toHaveBeenCalledTimes(2);
  });
  it('restores service, environment and the exact preview window after leaving and reentering', async () => {
    const first = hook();
    await act(async () => {});
    act(() => {
      first.result.current.setService('checkout');
      first.result.current.setEnvironment('local');
    });
    const end = first.result.current.clock.end;
    first.unmount();
    vi.setSystemTime(1700000010000);
    const returned = hook();
    await act(async () => {});
    expect(returned.result.current.serviceName).toBe('checkout');
    expect(returned.result.current.environment).toBe('local');
    expect(returned.result.current.clock.end).toBe(end);
    expect(returned.result.current.rankScope).toMatchObject({ serviceName: 'checkout', environment: 'local', end });
  });
  it("clears visible scope when the account changes and restores only that account's own visit", async () => {
    const view = hook();
    await act(async () => {});
    act(() => view.result.current.setService('checkout'));
    calls.session = { ...calls.session, username: 'operator' };
    view.rerender();
    expect(view.result.current.serviceName).toBe('');
    act(() => view.result.current.setEnvironment('demo'));
    calls.session = { ...calls.session, username: 'admin' };
    view.rerender();
    expect(view.result.current.serviceName).toBe('checkout');
    expect(view.result.current.environment).toBe('');
  });
  it('keeps the scope through a refresh and persists its newly refreshed anchor', async () => {
    const view = hook();
    await act(async () => {});
    act(() => {
      view.result.current.setService('checkout');
      view.result.current.setEnvironment('local');
    });
    vi.setSystemTime(1700000010000);
    act(() => view.result.current.refresh());
    expect(view.result.current.clock.end).toBe(1700000010000);
    view.unmount();
    const reloaded = hook();
    await act(async () => {});
    expect(reloaded.result.current.serviceName).toBe('checkout');
    expect(reloaded.result.current.environment).toBe('local');
    expect(reloaded.result.current.clock.end).toBe(1700000010000);
  });
  it('moves a frozen evidence window to the new actor even when both scopes are empty', async () => {
    const view = hook();
    await act(async () => {});
    act(() => view.result.current.setRankPaused(true));
    vi.setSystemTime(1700000010000);
    calls.session = { ...calls.session, username: 'operator' };
    view.rerender();
    expect(view.result.current.rankScope.end).toBe(1700000010000);
  });
  it('freezes rank evidence while its independent trend window refreshes', async () => {
    const view = hook();
    await act(async () => {});
    const initial = view.result.current.rankScope.end;
    act(() => view.result.current.setRankPaused(true));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(65000);
    });
    expect(view.result.current.rankScope.end).toBe(initial);
    expect(view.result.current.clock.end).toBeGreaterThan(initial);
    expect(calls.rank).toHaveBeenCalledTimes(1);
    expect(calls.logs).toHaveBeenCalledTimes(2);
  });
  it('clears error samples for changed filters and uses the same scoped preview window on return', async () => {
    const view = hook();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(view.result.current.traceSamples.isSuccess).toBe(true);
    calls.samples.mockImplementation(() => new Promise(() => {}));
    act(() => {
      view.result.current.setService('checkout');
      view.result.current.setEnvironment('production');
    });
    expect(view.result.current.traceSamples.data).toBeUndefined();
    expect(view.result.current.traceSamples.isFetching).toBe(true);
    const request = calls.samples.mock.calls.at(-1)![0];
    expect(request).toMatchObject({
      serviceName: 'checkout',
      environment: 'production',
      start: view.result.current.clock.start,
      end: view.result.current.clock.end
    });
    const end = view.result.current.clock.end;
    view.unmount();
    calls.samples.mockResolvedValue({ state: 'ready', rows: [] });
    const returned = hook();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(calls.samples.mock.calls.at(-1)![0]).toMatchObject({
      serviceName: 'checkout',
      environment: 'production',
      end
    });
    expect(returned.result.current.traceSamples.isSuccess).toBe(true);
  });
});
