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
import { App } from 'antd';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiMessageError } from '@/core/http/api-message';
import { MonitorContractError, type Monitor } from '../api/monitor-api';

const api = vi.hoisted(() => ({
  loadFavoriteMetrics: vi.fn(), loadHistoryMetric: vi.fn(), loadMonitorMetricCatalog: vi.fn(),
  loadRealtimeMetric: vi.fn(), updateFavoriteMetric: vi.fn()
}));
const notifications = { success: vi.fn(), error: vi.fn() };
vi.mock('../api/monitor-api', async importOriginal => ({
  ...await importOriginal<typeof import('../api/monitor-api')>(), ...api
}));

import { useMonitorMetricWorkbenchController } from './use-monitor-metric-workbench-controller';

const monitor = (id = 7): Monitor => ({ id, name: `monitor-${id}`, app: 'website', instance: `host-${id}`, status: 1 });
const catalog = (name = 'summary') => ({ metrics: [{ name, visible: true,
  fields: [{ type: 0, field: 'value', unit: 'ms', label: false }] }] });
// URL convergence crosses both the router and asynchronous catalog query, so it
// needs a wider deadline when the complete test suite is sharing worker CPU.
const routeConvergenceWait = { timeout: 10_000 } as const;

describe('useMonitorMetricWorkbenchController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.loadMonitorMetricCatalog.mockResolvedValue(catalog());
    api.loadFavoriteMetrics.mockResolvedValue([]);
    api.loadRealtimeMetric.mockResolvedValue({ fields: [], valueRows: [] });
    api.loadHistoryMetric.mockResolvedValue({ values: {} });
    api.updateFavoriteMetric.mockResolvedValue(undefined);
  });
  afterEach(() => cleanup());

  it('converges metric and history from URL Push, Back, and monitor changes', async () => {
    const view = renderController(monitor(), [], '/monitors/7?returnTo=%2Fmonitors%3FpageIndex%3D2&metric=bad.value&history=bad');
    await waitFor(() => expect(view.result.current.controller.state.catalog.kind).toBe('ready'), routeConvergenceWait);
    await waitFor(() => expect(view.result.current.controller.state).toMatchObject({ metricKey: 'summary.value', history: '30m' }), routeConvergenceWait);
    expect(view.result.current.location.search).toContain('returnTo=%2Fmonitors%3FpageIndex%3D2');
    act(() => { void view.result.current.navigate('/monitors/7?metric=summary.value&history=1h'); });
    await waitFor(() => expect(view.result.current.controller.state.history).toBe('1h'), routeConvergenceWait);
    act(() => { void view.result.current.navigate('/monitors/7?metric=summary.value&history=30m'); });
    await waitFor(() => expect(view.result.current.controller.state.history).toBe('30m'), routeConvergenceWait);
    act(() => { void view.result.current.navigate(-1); });
    await waitFor(() => expect(view.result.current.controller.state.history).toBe('1h'), routeConvergenceWait);

    api.loadMonitorMetricCatalog.mockResolvedValue(catalog('other'));
    view.rerender({ monitor: monitor(8), embedded: [] });
    await waitFor(() => expect(view.result.current.controller.state.metricKey).toBe('other.value'), routeConvergenceWait);
    expect(view.result.current.location.search).toContain('metric=other.value');
  });

  it('exposes explicit catalog fallback and favorite unknown evidence', async () => {
    api.loadMonitorMetricCatalog.mockRejectedValue(new ApiMessageError('offline', { status: 503 }));
    api.loadFavoriteMetrics.mockRejectedValue(new ApiMessageError('offline', { status: 503 }));
    const embedded = [{ name: 'embedded', favorited: false }];
    const view = renderController(monitor(), embedded, '/monitors/7');
    await waitFor(() => expect(view.result.current.controller.state.catalog.kind).toBe('fallback'));
    await waitFor(() => expect(view.result.current.controller.state.favorite.kind).toBe('unavailable'));
    expect(view.result.current.controller.state.metricKey).toBe('');
    expect(api.loadRealtimeMetric).not.toHaveBeenCalled();
  });

  it('treats a successful query without its required payload as invalid evidence', async () => {
    api.loadMonitorMetricCatalog.mockResolvedValue(undefined);
    api.loadFavoriteMetrics.mockResolvedValue(undefined);

    const view = renderController(monitor(), [], '/monitors/7');

    await waitFor(() => expect(view.result.current.controller.state.catalog.kind).toBe('error'));
    await waitFor(() => expect(view.result.current.controller.state.favorite.kind).toBe('error'));
  });

  it.each([
    [new ApiMessageError('storage', { status: 200, code: 15 }), 'unavailable'],
    [new MonitorContractError('bad'), 'error']
  ] as const)('keeps realtime and history %s failures honest', async (reason, kind) => {
    api.loadRealtimeMetric.mockRejectedValue(reason);
    api.loadHistoryMetric.mockRejectedValue(reason);
    const view = renderController(monitor(), [], '/monitors/7');
    await waitFor(() => expect(view.result.current.controller.state.realtime.kind).toBe(kind));
    await waitFor(() => expect(view.result.current.controller.state.historical.kind).toBe(kind));
  });

  it('forwards signals and aborts stale monitor requests', async () => {
    const requests: AbortSignal[] = [];
    api.loadMonitorMetricCatalog.mockImplementation((_monitor: Monitor, signal: AbortSignal) => {
      requests.push(signal);
      return new Promise(() => undefined);
    });
    const view = renderController(monitor(), [], '/monitors/7');
    await waitFor(() => expect(requests).toHaveLength(1));
    view.rerender({ monitor: monitor(8), embedded: [] });
    await waitFor(() => expect(requests).toHaveLength(2));
    expect(requests[0]?.aborted).toBe(true);
  });

  it('marks favorite ready only after canonical reread convergence', async () => {
    api.loadFavoriteMetrics.mockResolvedValueOnce([]).mockResolvedValueOnce(['summary.value']);
    const view = renderController(monitor(), [], '/monitors/7');
    await waitFor(() => expect(view.result.current.controller.state.favorite).toMatchObject({ kind: 'ready', value: false }));
    await act(() => view.result.current.controller.actions.toggleFavorite());
    expect(api.updateFavoriteMetric).toHaveBeenCalledWith(7, 'summary.value', true);
    expect(api.loadFavoriteMetrics).toHaveBeenCalledTimes(2);
    expect(view.result.current.controller.state.favorite).toMatchObject({ kind: 'ready', value: true });
  });

  it('fails a favorite mutation without canonical convergence and locks duplicate mutations', async () => {
    let release: (() => void) | undefined;
    api.updateFavoriteMetric.mockImplementation(() => new Promise<void>(resolve => { release = resolve; }));
    api.loadFavoriteMetrics.mockResolvedValue([]);
    const view = renderController(monitor(), [], '/monitors/7');
    await waitFor(() => expect(view.result.current.controller.state.favorite).toMatchObject({ kind: 'ready', value: false }));
    let first!: Promise<void>;
    act(() => { first = view.result.current.controller.actions.toggleFavorite(); });
    await waitFor(() => expect(api.updateFavoriteMetric).toHaveBeenCalledTimes(1));
    await act(() => view.result.current.controller.actions.toggleFavorite());
    expect(api.updateFavoriteMetric).toHaveBeenCalledTimes(1);
    release?.();
    await expect(first).rejects.toThrow('converge');
    expect(view.result.current.controller.state.favorite).toMatchObject({ kind: 'ready', value: false });
  });

  it('drops an old favorite mutation when the monitor source changes', async () => {
    let release: (() => void) | undefined;
    api.updateFavoriteMetric.mockImplementation(() => new Promise<void>(resolve => { release = resolve; }));
    const view = renderController(monitor(), [], '/monitors/7');
    await waitFor(() => expect(view.result.current.controller.state.favorite.kind).toBe('ready'));
    let mutation!: Promise<void>;
    act(() => { mutation = view.result.current.controller.actions.toggleFavorite(); });
    await waitFor(() => expect(api.updateFavoriteMetric).toHaveBeenCalledTimes(1));
    api.loadMonitorMetricCatalog.mockResolvedValue(catalog('other'));
    view.rerender({ monitor: monitor(8), embedded: [] });
    await waitFor(() => expect(view.result.current.controller.state.metricKey).toBe('other.value'));
    release?.();
    await expect(mutation).resolves.toBeUndefined();
    expect(api.loadFavoriteMetrics).toHaveBeenCalledTimes(2);
    expect(notifications.success).not.toHaveBeenCalled();
    expect(notifications.error).not.toHaveBeenCalled();
    expect(view.result.current.controller.state.favorite).toMatchObject({ kind: 'ready', value: false });
    api.loadMonitorMetricCatalog.mockResolvedValue(catalog());
    view.rerender({ monitor: monitor(7), embedded: [] });
    await waitFor(() => expect(view.result.current.controller.state.metricKey).toBe('summary.value'));
    expect(view.result.current.controller.state.favoriteBusy).toBe(false);
    api.updateFavoriteMetric.mockResolvedValue(undefined);
    api.loadFavoriteMetrics.mockResolvedValueOnce(['summary.value']);
    await act(() => view.result.current.controller.actions.toggleFavorite());
    expect(api.updateFavoriteMetric).toHaveBeenCalledTimes(2);
    expect(view.result.current.controller.state.favoriteBusy).toBe(false);
  });
});

function renderController(initialMonitor: Monitor, embedded: Parameters<typeof useMonitorMetricWorkbenchController>[1],
  entry: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderHook(({ monitor: current, embedded: currentEmbedded }) => ({
    controller: useMonitorMetricWorkbenchController(current, currentEmbedded, notifications),
    navigate: useNavigate(), location: useLocation()
  }), {
    initialProps: { monitor: initialMonitor, embedded },
    wrapper: ({ children }: PropsWithChildren) => <QueryClientProvider client={client}><App>
      <MemoryRouter initialEntries={[entry]}>{children}</MemoryRouter>
    </App>
    </QueryClientProvider>
  });
}
