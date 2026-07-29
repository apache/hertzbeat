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
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiMessageError } from '@/core/http/api-message';
import { DashboardContractError, DashboardRequestFailure } from '../model/dashboard-model';
import { dashboardQueryKeys } from './dashboard-query-keys';
import { DASHBOARD_REFRESH_INTERVAL_MS, useDashboardController } from './use-dashboard-controller';

const api = vi.hoisted(() => ({
  loadDashboardSummary: vi.fn(),
  loadDashboardAlertSummary: vi.fn(),
  loadDashboardRecentAlerts: vi.fn()
}));
const collectors = vi.hoisted(() => ({ loadCollectorManagementPage: vi.fn() }));
vi.mock('../api/dashboard-api', () => api);
vi.mock('@/features/settings/collector', async importOriginal => ({
  ...(await importOriginal<typeof import('@/features/settings/collector')>()),
  loadCollectorManagementPage: collectors.loadCollectorManagementPage
}));

describe('dashboard controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.loadDashboardSummary.mockResolvedValue({ apps: [app] });
    api.loadDashboardAlertSummary.mockResolvedValue(alert(2));
    api.loadDashboardRecentAlerts.mockResolvedValue(recentAlertPage());
    collectors.loadCollectorManagementPage.mockResolvedValue(collectorPage([collector]));
  });
  afterEach(() => vi.useRealTimers());

  it('exposes independent ready and authoritative empty evidence', async () => {
    const ready = renderController();
    await waitFor(() =>
      expect(ready.result.current).toMatchObject({
        monitorState: { kind: 'ready', apps: [app] },
        alertState: { kind: 'ready', summary: { total: 2 } }
      })
    );
    ready.unmount();
    api.loadDashboardSummary.mockResolvedValue({ apps: [] });
    api.loadDashboardAlertSummary.mockResolvedValue(alert(0));
    const empty = renderController();
    await waitFor(() =>
      expect(empty.result.current).toMatchObject({
        monitorState: { kind: 'empty', apps: [] },
        alertState: { kind: 'empty', summary: { total: 0 } }
      })
    );
  });

  it('publishes ready alert evidence while monitor evidence is still loading', async () => {
    const monitor = deferred<{ apps: (typeof app)[] }>();
    api.loadDashboardSummary.mockReturnValue(monitor.promise);
    const view = renderController();

    await waitFor(() =>
      expect(view.result.current).toMatchObject({
        monitorState: { kind: 'loading' },
        alertState: { kind: 'ready', summary: { total: 2 } }
      })
    );

    act(() => monitor.resolve({ apps: [app] }));
    await waitFor(() => expect(view.result.current.monitorState.kind).toBe('ready'));
  });

  it('owns a complete collector page query, AbortSignal, and independent ready state', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    const view = renderController(client);

    await waitFor(() =>
      expect(view.result.current).toMatchObject({
        monitorState: { kind: 'ready' },
        alertState: { kind: 'ready' },
        collectorState: { kind: 'ready', records: [{ name: 'edge-a', online: true }], total: 1 }
      })
    );

    expect(collectors.loadCollectorManagementPage).toHaveBeenCalledWith(
      dashboardCollectorQuery,
      expect.any(AbortSignal)
    );
    expect(client.getQueryState(['settings', 'collectors', dashboardCollectorQuery])).toBeDefined();
    const collectorSignal = collectors.loadCollectorManagementPage.mock.calls[0]?.[1];
    expect(collectorSignal).not.toBe(api.loadDashboardSummary.mock.calls[0]?.[0]);
    expect(collectorSignal).not.toBe(api.loadDashboardAlertSummary.mock.calls[0]?.[0]);
  });

  it('keeps ready summaries visible while collector evidence loads, then publishes authoritative empty', async () => {
    const pending = deferred<ReturnType<typeof collectorPage>>();
    collectors.loadCollectorManagementPage.mockReturnValue(pending.promise);
    const view = renderController();

    await waitFor(() =>
      expect(view.result.current).toMatchObject({
        monitorState: { kind: 'ready' },
        alertState: { kind: 'ready' },
        collectorState: { kind: 'loading' }
      })
    );

    act(() => pending.resolve(collectorPage([])));
    await waitFor(() => expect(view.result.current.collectorState).toEqual({ kind: 'empty' }));
  });

  it.each([
    [new ApiMessageError('private', { status: 403 }), 'permission'],
    [new ApiMessageError('offline', { status: 503 }), 'unavailable'],
    [new Error('failed'), 'error']
  ] as const)('classifies collector failure as %s without hiding ready summaries', async (reason, kind) => {
    collectors.loadCollectorManagementPage.mockRejectedValue(reason);
    const view = renderController();

    await waitFor(() => expect(view.result.current.collectorState).toEqual({ kind }));
    expect(view.result.current.monitorState).toEqual({ kind: 'ready', apps: [app] });
    expect(view.result.current.alertState).toMatchObject({ kind: 'ready', summary: { total: 2 } });
  });

  it.each([
    [{ apps: null }, alert(0), 'missing'],
    [new DashboardRequestFailure('permission'), alert(0), 'permission'],
    [new DashboardRequestFailure('unavailable'), alert(0), 'unavailable'],
    [new DashboardContractError('bad'), alert(0), 'contract']
  ] as const)('classifies monitor evidence as %s without hiding ready alerts', async (summary, alerts, kind) => {
    if (summary instanceof Error) api.loadDashboardSummary.mockRejectedValue(summary);
    else api.loadDashboardSummary.mockResolvedValue(summary);
    api.loadDashboardAlertSummary.mockResolvedValue(alerts);
    const view = renderController();
    await waitFor(() => expect(view.result.current.monitorState).toEqual({ kind }));
    expect(view.result.current.alertState).toMatchObject({ kind: 'empty', summary: { total: 0 } });
  });

  it.each([
    [new DashboardRequestFailure('permission'), 'permission'],
    [new DashboardRequestFailure('unavailable'), 'unavailable'],
    [new DashboardContractError('bad'), 'contract'],
    [new Error('bad'), 'error']
  ] as const)('classifies alert evidence as %s without hiding ready monitors', async (reason, kind) => {
    api.loadDashboardAlertSummary.mockRejectedValue(reason);
    const view = renderController();
    await waitFor(() => expect(view.result.current.alertState).toEqual({ kind }));
    expect(view.result.current.monitorState).toEqual({ kind: 'ready', apps: [app] });
  });

  it('refreshes both sources independently and settles after one fails', async () => {
    const view = renderController();
    await waitFor(() => expect(view.result.current.monitorState.kind).toBe('ready'));
    api.loadDashboardSummary.mockRejectedValueOnce(new DashboardRequestFailure('unavailable'));
    api.loadDashboardAlertSummary.mockResolvedValueOnce(alert(9));
    await act(async () => {
      await view.result.current.refresh();
    });
    expect(api.loadDashboardSummary).toHaveBeenCalledTimes(2);
    expect(api.loadDashboardAlertSummary).toHaveBeenCalledTimes(2);
    expect(collectors.loadCollectorManagementPage).toHaveBeenCalledTimes(2);
    expect(api.loadDashboardSummary.mock.calls[1]?.[0]).not.toBe(api.loadDashboardAlertSummary.mock.calls[1]?.[0]);
    await waitFor(() => expect(view.result.current.monitorState).toEqual({ kind: 'unavailable' }));
    expect(view.result.current.alertState).toMatchObject({ kind: 'ready', summary: { total: 9 } });
  });

  it('reuses separate feature-owned monitor and alert cache entries', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: Number.POSITIVE_INFINITY } }
    });
    client.setQueryData(dashboardQueryKeys.monitorSummary(), { apps: [app] });
    client.setQueryData(dashboardQueryKeys.alertSummary(), alert(7));

    const view = renderController(client);

    await waitFor(() =>
      expect(view.result.current).toMatchObject({
        monitorState: { kind: 'ready', apps: [app] },
        alertState: { kind: 'ready', summary: { total: 7 } }
      })
    );
    expect(dashboardQueryKeys.monitorSummary()).toEqual(['dashboard', 'monitor-summary']);
    expect(dashboardQueryKeys.alertSummary()).toEqual(['dashboard', 'alert-summary']);
    expect(api.loadDashboardSummary).not.toHaveBeenCalled();
    expect(api.loadDashboardAlertSummary).not.toHaveBeenCalled();
  });

  it('auto refreshes both independent queries every 30 seconds', async () => {
    expect(DASHBOARD_REFRESH_INTERVAL_MS).toBe(30_000);
    vi.useFakeTimers();
    const view = renderController();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(api.loadDashboardSummary).toHaveBeenCalledTimes(1);
    expect(api.loadDashboardAlertSummary).toHaveBeenCalledTimes(1);
    expect(collectors.loadCollectorManagementPage).toHaveBeenCalledTimes(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(api.loadDashboardSummary).toHaveBeenCalledTimes(2);
    expect(api.loadDashboardAlertSummary).toHaveBeenCalledTimes(2);
    expect(collectors.loadCollectorManagementPage).toHaveBeenCalledTimes(2);
    expect(view.result.current.monitorState).toHaveProperty('apps');
    expect(view.result.current.alertState).toHaveProperty('summary');
  });

  it('keeps auto-refresh failures independent and recovers both sources on the next interval', async () => {
    vi.useFakeTimers();
    api.loadDashboardSummary
      .mockResolvedValueOnce({ apps: [app] })
      .mockRejectedValueOnce(new DashboardRequestFailure('permission'))
      .mockResolvedValueOnce({ apps: [app] });
    api.loadDashboardAlertSummary
      .mockResolvedValueOnce(alert(2))
      .mockResolvedValueOnce(alert(6))
      .mockResolvedValueOnce(alert(2));
    const view = renderController();
    await act(async () => vi.advanceTimersByTimeAsync(1));

    await act(async () => vi.advanceTimersByTimeAsync(DASHBOARD_REFRESH_INTERVAL_MS));
    await act(async () => vi.advanceTimersByTimeAsync(1));
    expect(api.loadDashboardSummary).toHaveBeenCalledTimes(2);
    expect(api.loadDashboardAlertSummary).toHaveBeenCalledTimes(2);
    expect(view.result.current).toMatchObject({
      monitorState: { kind: 'permission' },
      alertState: { kind: 'ready', summary: { total: 6 } }
    });

    await act(async () => vi.advanceTimersByTimeAsync(DASHBOARD_REFRESH_INTERVAL_MS));
    await act(async () => vi.advanceTimersByTimeAsync(0));
    expect(view.result.current).toMatchObject({
      monitorState: { kind: 'ready', apps: [app] },
      alertState: { kind: 'ready', summary: { total: 2 } }
    });
  });

  it('cancels an older manual refresh and ignores its late monitor result', async () => {
    const view = renderController();
    await waitFor(() => expect(view.result.current.monitorState.kind).toBe('ready'));
    const stale = deferred<{ apps: (typeof app)[] }>();
    let staleSignal: AbortSignal | undefined;
    api.loadDashboardSummary
      .mockImplementationOnce((signal: AbortSignal) => {
        staleSignal = signal;
        return stale.promise;
      })
      .mockResolvedValueOnce({ apps: [{ ...app, app: 'current' }] });

    let firstRefresh!: Promise<void>;
    act(() => {
      firstRefresh = view.result.current.refresh();
    });
    await waitFor(() => expect(staleSignal).toBeDefined());
    await act(async () => view.result.current.refresh());

    expect(staleSignal?.aborted).toBe(true);
    await waitFor(() =>
      expect(view.result.current.monitorState).toMatchObject({
        kind: 'ready',
        apps: [{ app: 'current' }]
      })
    );
    act(() => stale.resolve({ apps: [{ ...app, app: 'stale' }] }));
    await act(async () => {
      await stale.promise;
      await firstRefresh;
    });
    expect(view.result.current.monitorState).toMatchObject({ kind: 'ready', apps: [{ app: 'current' }] });
  });

  it('recovers both sources on the next manual refresh after independent failures', async () => {
    const view = renderController();
    await waitFor(() => expect(view.result.current.monitorState.kind).toBe('ready'));
    api.loadDashboardSummary.mockRejectedValueOnce(new DashboardRequestFailure('permission'));
    api.loadDashboardAlertSummary.mockRejectedValueOnce(new DashboardRequestFailure('unavailable'));
    await act(async () => view.result.current.refresh());
    await waitFor(() =>
      expect(view.result.current).toMatchObject({
        monitorState: { kind: 'permission' },
        alertState: { kind: 'unavailable' }
      })
    );

    api.loadDashboardSummary.mockResolvedValueOnce({ apps: [{ ...app, app: 'recovered' }] });
    api.loadDashboardAlertSummary.mockResolvedValueOnce(alert(5));
    await act(async () => view.result.current.refresh());
    await waitFor(() =>
      expect(view.result.current).toMatchObject({
        monitorState: { kind: 'ready', apps: [{ app: 'recovered' }] },
        alertState: { kind: 'ready', summary: { total: 5 } }
      })
    );
  });
});

function renderController(client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(useDashboardController, { wrapper });
}
const app = { app: 'mysql', category: 'db', size: 1, availableSize: 1, unAvailableSize: 0, unManageSize: 0 };
const dashboardCollectorQuery = { name: '', pageIndex: 0, pageSize: 8 };
const collector = {
  name: 'edge-a',
  address: '10.0.0.8',
  version: '2.0.0',
  mode: 'public',
  online: true,
  immutable: false,
  pinMonitorNum: 2,
  dispatchMonitorNum: 3,
  updatedAt: '2026-07-29T10:00:00Z',
  runtimeReport: null,
  instrumentationIntake: { status: 'unavailable', errorCode: 'intake_not_advertised' }
};
function collectorPage(content: (typeof collector)[]) {
  return {
    content,
    totalElements: content.length,
    totalPages: content.length === 0 ? 0 : 1,
    number: 0,
    size: 8
  };
}
function alert(total: number) {
  return {
    total,
    dealNum: 0,
    rate: total === 0 ? 100 : 0,
    priorityWarningNum: 0,
    priorityCriticalNum: 0,
    priorityEmergencyNum: 0
  };
}

function recentAlertPage() {
  return { content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(complete => {
    resolve = complete;
  });
  return { promise, resolve };
}
