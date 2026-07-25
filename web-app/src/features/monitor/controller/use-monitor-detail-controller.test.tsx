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
import type { PropsWithChildren } from 'react';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiMessageError } from '@/core/http/api-message';
import { MonitorContractError } from '../model/monitor-contract';

const api = vi.hoisted(() => ({ loadMonitorDetail: vi.fn() }));
vi.mock('../api/monitor-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/monitor-api')>()),
  ...api
}));

import { useMonitorDetailController } from './use-monitor-detail-controller';

const detail = {
  monitor: { id: 7, name: 'checkout', app: 'website', instance: 'prod', status: 1 },
  params: [],
  collector: null,
  grafanaDashboard: null,
  metrics: [{ name: 'summary', favorited: false }]
};

describe('useMonitorDetailController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.loadMonitorDetail.mockResolvedValue(detail);
  });
  afterEach(() => cleanup());

  it.each(['not-a-number', '0', '9007199254740992'])(
    'treats invalid route id %s as missing without requesting data',
    routeId => {
      const view = renderController(`/monitors/${routeId}?returnTo=%2Fmonitors-evil`);
      expect(view.result.current.state.detail.kind).toBe('missing');
      expect(view.result.current.state.returnTo).toBe('/monitors');
      expect(api.loadMonitorDetail).not.toHaveBeenCalled();
    }
  );

  it('loads detail with AbortSignal and preserves canonical back and edit paths', async () => {
    const view = renderController('/monitors/7?returnTo=%2Fmonitors%3Fapp%3Dwebsite');
    await waitFor(() => expect(view.result.current.state.detail.kind).toBe('ready'));
    expect(api.loadMonitorDetail).toHaveBeenCalledWith(7, expect.any(AbortSignal));
    act(() => view.result.current.actions.edit());
    expect(view.location()).toBe('/monitors/7/edit?returnTo=%2Fmonitors%3Fapp%3Dwebsite');
    act(() => view.result.current.actions.back());
    expect(view.location()).toBe('/monitors?app=website');
  });

  it('normalizes refresh state and preserves metric, history, and return context when it changes', async () => {
    const view = renderController(
      '/monitors/7?returnTo=%2Fmonitors%3Fapp%3Dwebsite&metric=summary.value&history=1h&refresh=invalid'
    );

    await waitFor(() => expect(view.result.current.state.refreshSeconds).toBe(90));
    expect(view.location()).toContain('refresh=invalid');
    expect(view.location()).toContain('returnTo=%2Fmonitors%3Fapp%3Dwebsite');
    expect(view.location()).toContain('metric=summary.value');
    expect(view.location()).toContain('history=1h');

    act(() => view.result.current.actions.setRefreshSeconds(30));
    await waitFor(() => expect(view.result.current.state.refreshSeconds).toBe(30));
    expect(view.location()).toContain('refresh=30');
    expect(view.location()).toContain('metric=summary.value');

    act(() => view.result.current.actions.setRefreshSeconds(0));
    await waitFor(() => expect(view.result.current.state.refreshSeconds).toBe(0));
    expect(view.location()).toContain('refresh=0');
  });

  it.each([
    [new ApiMessageError('missing', { status: 404 }), 'missing'],
    [new ApiMessageError('missing', { status: 200, code: 15 }), 'missing'],
    [new ApiMessageError('offline', { status: 503 }), 'unavailable'],
    [new MonitorContractError('bad'), 'error']
  ] as const)('classifies detail failures without inventing empty evidence', async (reason, kind) => {
    api.loadMonitorDetail.mockRejectedValue(reason);
    const view = renderController('/monitors/7');
    await waitFor(() => expect(view.result.current.state.detail.kind).toBe(kind));
  });

  it('aborts the prior route request and ignores its late completion', async () => {
    const requests: Array<{ id: number; signal: AbortSignal; resolve: (value: typeof detail) => void }> = [];
    api.loadMonitorDetail.mockImplementation(
      (id, signal) =>
        new Promise(resolve => {
          requests.push({ id, signal, resolve });
        })
    );
    const view = renderController('/monitors/7');
    await waitFor(() => expect(requests).toHaveLength(1));
    act(() => {
      void view.navigate('/monitors/8');
    });
    await waitFor(() => expect(requests).toHaveLength(2));
    expect(requests[0]?.signal.aborted).toBe(true);
    await act(async () => {
      requests[0]!.resolve(detail);
      await Promise.resolve();
    });
    expect(view.result.current.state.detail.kind).toBe('loading');
    await act(async () => {
      requests[1]!.resolve({ ...detail, monitor: { ...detail.monitor, id: 8, name: 'orders' } });
      await Promise.resolve();
    });
    await waitFor(() =>
      expect(view.result.current.state.detail).toMatchObject({
        kind: 'ready',
        detail: { monitor: { id: 8, name: 'orders' } }
      })
    );
  });
});

function renderController(entry: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  let currentLocation = '';
  let navigate!: ReturnType<typeof useNavigate>;
  function ContextProbe() {
    const location = useLocation();
    navigate = useNavigate();
    currentLocation = `${location.pathname}${location.search}${location.hash}`;
    return null;
  }
  const rendered = renderHook(() => useMonitorDetailController(), {
    wrapper: ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[entry]}>
          <ContextProbe />
          <Routes>
            <Route path="/monitors/:monitorId/*" element={children} />
            <Route path="/monitors" element={null} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )
  });
  return { ...rendered, location: () => currentLocation, navigate: (path: string) => navigate(path) };
}
