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

const api = vi.hoisted(() => ({ deleteMonitorGrafanaDashboard: vi.fn(), loadMonitorDetail: vi.fn() }));
const capability = vi.hoisted(() => ({ useMonitorCapabilities: vi.fn() }));
vi.mock('../api/monitor-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/monitor-api')>()),
  ...api
}));
vi.mock('./use-monitor-capabilities', () => capability);

import { useMonitorDetailController } from './use-monitor-detail-controller';
import { monitorQueryKeys } from './monitor-query-keys';

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
    capability.useMonitorCapabilities.mockReturnValue({ canWrite: true, canDeleteGrafanaDashboard: true });
    api.deleteMonitorGrafanaDashboard.mockResolvedValue(undefined);
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

  it('uses the selected detail refresh cadence, disables it for Off, and supports a manual refresh', async () => {
    vi.useFakeTimers();
    try {
      const view = renderController('/monitors/7?refresh=10');
      await act(async () => {
        await Promise.resolve();
      });
      expect(api.loadMonitorDetail).toHaveBeenCalledTimes(1);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(10_000);
      });
      expect(api.loadMonitorDetail).toHaveBeenCalledTimes(2);

      act(() => view.result.current.actions.setRefreshSeconds(0));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10_000);
      });
      expect(api.loadMonitorDetail).toHaveBeenCalledTimes(2);

      act(() => view.result.current.actions.refresh());
      expect(api.loadMonitorDetail).toHaveBeenCalledTimes(3);
    } finally {
      vi.useRealTimers();
    }
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

  it('aborts an in-flight manual detail refresh when the monitor route changes', async () => {
    const view = renderController('/monitors/7');
    await waitFor(() => expect(view.result.current.state.detail.kind).toBe('ready'));
    const requests: Array<{ id: number; signal: AbortSignal; resolve: (value: typeof detail) => void }> = [];
    api.loadMonitorDetail.mockImplementation(
      (id, signal) =>
        new Promise(resolve => {
          requests.push({ id, signal, resolve });
        })
    );

    act(() => view.result.current.actions.refresh());
    await waitFor(() => expect(requests).toHaveLength(1));
    act(() => {
      void view.navigate('/monitors/8');
    });
    await waitFor(() => expect(requests).toHaveLength(2));
    expect(requests[0]).toMatchObject({ id: 7 });
    expect(requests[0]?.signal.aborted).toBe(true);
    await act(async () => {
      requests[0]!.resolve({ ...detail, monitor: { ...detail.monitor, name: 'stale' } });
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

  it('deletes the enabled Grafana dashboard and updates cached detail evidence', async () => {
    api.loadMonitorDetail.mockResolvedValue({
      ...detail,
      grafanaDashboard: {
        monitorId: 7,
        folderUid: null,
        slug: null,
        status: null,
        uid: 'ops',
        url: 'https://grafana.example/d/ops',
        version: 1,
        enabled: true,
        template: null
      }
    });
    const view = renderController('/monitors/7');
    await waitFor(() => expect(view.result.current.state.detail.kind).toBe('ready'));

    await act(() => view.result.current.actions.deleteGrafanaDashboard());

    expect(api.deleteMonitorGrafanaDashboard).toHaveBeenCalledWith(7, expect.any(AbortSignal));
    expect(view.result.current.state).toMatchObject({
      grafanaDeleting: false,
      grafanaDeleteError: false,
      detail: { kind: 'ready', detail: { grafanaDashboard: { enabled: false, url: null } } }
    });
  });

  it('keeps dashboard evidence and exposes a safe failure state when deletion fails', async () => {
    api.deleteMonitorGrafanaDashboard.mockRejectedValue(new Error('private backend failure'));
    const grafanaDashboard = {
      monitorId: 7,
      folderUid: null,
      slug: null,
      status: null,
      uid: 'ops',
      url: 'https://grafana.example/d/ops',
      version: 1,
      enabled: true,
      template: null
    };
    api.loadMonitorDetail.mockResolvedValue({ ...detail, grafanaDashboard });
    const view = renderController('/monitors/7');
    await waitFor(() => expect(view.result.current.state.detail.kind).toBe('ready'));

    await act(() => view.result.current.actions.deleteGrafanaDashboard());

    expect(view.result.current.state).toMatchObject({
      grafanaDeleting: false,
      grafanaDeleteError: true,
      detail: { kind: 'ready', detail: { grafanaDashboard } }
    });
  });

  it.each(['resolve', 'reject'] as const)(
    'retires an in-flight Grafana delete on permission loss before a late %s',
    async completion => {
      const grafanaDashboard = {
        monitorId: 7,
        folderUid: null,
        slug: null,
        status: null,
        uid: 'ops',
        url: 'https://grafana.example/d/ops',
        version: 1,
        enabled: true,
        template: null
      };
      api.loadMonitorDetail.mockResolvedValue({ ...detail, grafanaDashboard });
      let settle!: () => void;
      let deleteSignal!: AbortSignal;
      api.deleteMonitorGrafanaDashboard.mockImplementation(
        (_id, signal) =>
          new Promise<void>((resolve, reject) => {
            deleteSignal = signal;
            settle = () => (completion === 'resolve' ? resolve() : reject(new Error('late failure')));
          })
      );
      const view = renderController('/monitors/7');
      await waitFor(() => expect(view.result.current.state.detail.kind).toBe('ready'));

      act(() => {
        void view.result.current.actions.deleteGrafanaDashboard();
      });
      await waitFor(() => expect(view.result.current.state.grafanaDeleting).toBe(true));
      capability.useMonitorCapabilities.mockReturnValue({ canWrite: true, canDeleteGrafanaDashboard: false });
      view.rerender();

      expect(deleteSignal.aborted).toBe(true);
      expect(view.result.current.state).toMatchObject({
        grafanaDeleting: false,
        grafanaDeleteError: false,
        detail: { kind: 'ready', detail: { grafanaDashboard } }
      });

      await act(async () => {
        settle();
        await Promise.resolve();
      });
      expect(view.result.current.state).toMatchObject({
        grafanaDeleting: false,
        grafanaDeleteError: false,
        detail: { kind: 'ready', detail: { grafanaDashboard } }
      });
    }
  );

  it('retires route ownership before abort and rejects an ABA late completion', async () => {
    const dashboardFor = (monitorId: number) => ({
      monitorId,
      folderUid: null,
      slug: null,
      status: null,
      uid: `ops-${monitorId}`,
      url: `https://grafana.example/d/ops-${monitorId}`,
      version: 1,
      enabled: true,
      template: null
    });
    api.loadMonitorDetail.mockImplementation(id =>
      Promise.resolve({
        ...detail,
        monitor: { ...detail.monitor, id },
        grafanaDashboard: dashboardFor(id)
      })
    );
    const deletes: Array<{ id: number; signal: AbortSignal; resolve: () => void }> = [];
    api.deleteMonitorGrafanaDashboard.mockImplementation(
      (id, signal) =>
        new Promise<void>(resolve => {
          deletes.push({ id, signal, resolve });
        })
    );
    const view = renderController('/monitors/7');
    await waitFor(() => expect(view.result.current.state.detail.kind).toBe('ready'));

    act(() => {
      void view.result.current.actions.deleteGrafanaDashboard();
    });
    await waitFor(() => expect(deletes).toHaveLength(1));
    act(() => {
      void view.navigate('/monitors/8');
    });
    await waitFor(() =>
      expect(view.result.current.state.detail).toMatchObject({
        kind: 'ready',
        detail: { monitor: { id: 8 } }
      })
    );
    expect(deletes[0]?.signal.aborted).toBe(true);
    expect(view.result.current.state.grafanaDeleting).toBe(false);

    act(() => {
      void view.result.current.actions.deleteGrafanaDashboard();
    });
    await waitFor(() => expect(deletes).toHaveLength(2));
    act(() => {
      void view.navigate('/monitors/7');
    });
    await waitFor(() =>
      expect(view.result.current.state.detail).toMatchObject({
        kind: 'ready',
        detail: { monitor: { id: 7 } }
      })
    );
    expect(deletes[1]?.signal.aborted).toBe(true);

    await act(async () => {
      deletes[0]!.resolve();
      deletes[1]!.resolve();
      await Promise.resolve();
    });
    expect(view.result.current.state).toMatchObject({
      grafanaDeleting: false,
      grafanaDeleteError: false,
      detail: { kind: 'ready', detail: { grafanaDashboard: dashboardFor(7) } }
    });
  });

  it('retires and aborts an in-flight Grafana delete on unmount', async () => {
    const grafanaDashboard = {
      monitorId: 7,
      folderUid: null,
      slug: null,
      status: null,
      uid: 'ops',
      url: 'https://grafana.example/d/ops',
      version: 1,
      enabled: true,
      template: null
    };
    api.loadMonitorDetail.mockResolvedValue({ ...detail, grafanaDashboard });
    let deleteSignal!: AbortSignal;
    let resolveDelete!: () => void;
    api.deleteMonitorGrafanaDashboard.mockImplementation(
      (_id, signal) =>
        new Promise<void>(resolve => {
          deleteSignal = signal;
          resolveDelete = resolve;
        })
    );
    const view = renderController('/monitors/7');
    await waitFor(() => expect(view.result.current.state.detail.kind).toBe('ready'));
    act(() => {
      void view.result.current.actions.deleteGrafanaDashboard();
    });
    await waitFor(() => expect(view.result.current.state.grafanaDeleting).toBe(true));

    view.unmount();

    expect(deleteSignal.aborted).toBe(true);
    await act(async () => {
      resolveDelete();
      await Promise.resolve();
    });
    expect(view.client.getQueryData(monitorQueryKeys.detail(7))).toMatchObject({ grafanaDashboard });
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
  return { ...rendered, client, location: () => currentLocation, navigate: (path: string) => navigate(path) };
}
