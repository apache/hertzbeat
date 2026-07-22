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
import { DashboardContractError, DashboardRequestFailure } from '../model/dashboard-model';
import { dashboardQueryKeys } from './dashboard-query-keys';
import { DASHBOARD_REFRESH_INTERVAL_MS, useDashboardController } from './use-dashboard-controller';

const api = vi.hoisted(() => ({ loadDashboardSummary: vi.fn(), loadDashboardAlertSummary: vi.fn() }));
vi.mock('../api/dashboard-api', () => api);

describe('dashboard controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.loadDashboardSummary.mockResolvedValue({ apps: [app] });
    api.loadDashboardAlertSummary.mockResolvedValue(alert(2));
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

  it.each([
    [{ apps: null }, alert(0), 'missing'],
    [new DashboardRequestFailure('unavailable'), alert(0), 'unavailable'],
    [new DashboardContractError('bad'), alert(0), 'error']
  ] as const)('classifies monitor evidence as %s without hiding ready alerts', async (summary, alerts, kind) => {
    if (summary instanceof Error) api.loadDashboardSummary.mockRejectedValue(summary);
    else api.loadDashboardSummary.mockResolvedValue(summary);
    api.loadDashboardAlertSummary.mockResolvedValue(alerts);
    const view = renderController();
    await waitFor(() => expect(view.result.current.monitorState).toEqual({ kind }));
    expect(view.result.current.alertState).toMatchObject({ kind: 'empty', summary: { total: 0 } });
  });

  it.each([
    [new DashboardRequestFailure('unavailable'), 'unavailable'],
    [new DashboardContractError('bad'), 'error'],
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
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(api.loadDashboardSummary).toHaveBeenCalledTimes(2);
    expect(api.loadDashboardAlertSummary).toHaveBeenCalledTimes(2);
    expect(view.result.current.monitorState).toHaveProperty('apps');
    expect(view.result.current.alertState).toHaveProperty('summary');
  });
});

function renderController(client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(useDashboardController, { wrapper });
}
const app = { app: 'mysql', category: 'db', size: 1, availableSize: 1, unAvailableSize: 0, unManageSize: 0 };
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

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(complete => {
    resolve = complete;
  });
  return { promise, resolve };
}
