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
import { DashboardContractError } from '../model/dashboard-model';
const api = vi.hoisted(() => ({ loadDashboardSummary: vi.fn(), loadDashboardAlertSummary: vi.fn() }));
vi.mock('../api/dashboard-api', () => api);
import { useDashboardController } from './use-dashboard-controller';

describe('dashboard controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.loadDashboardSummary.mockResolvedValue({ apps: [app] });
    api.loadDashboardAlertSummary.mockResolvedValue(alert(2));
  });
  afterEach(() => vi.useRealTimers());

  it('exposes ready and authoritative empty without partial or fake data', async () => {
    const ready = renderController();
    await waitFor(() =>
      expect(ready.result.current.state).toMatchObject({ kind: 'ready', data: { alert: { total: 2 } } })
    );
    ready.unmount();
    api.loadDashboardSummary.mockResolvedValue({ apps: [] });
    api.loadDashboardAlertSummary.mockResolvedValue(alert(0));
    const empty = renderController();
    await waitFor(() =>
      expect(empty.result.current.state).toMatchObject({ kind: 'empty', data: { apps: [], alert: { total: 0 } } })
    );
  });

  it.each([
    [{ apps: null }, alert(0), 'missing'],
    [new ApiMessageError('offline', { status: 503 }), alert(0), 'unavailable'],
    [new DashboardContractError('bad'), alert(0), 'error']
  ] as const)('classifies incomplete evidence as %s without Results data', async (summary, alerts, kind) => {
    if (summary instanceof Error) api.loadDashboardSummary.mockRejectedValue(summary);
    else api.loadDashboardSummary.mockResolvedValue(summary);
    api.loadDashboardAlertSummary.mockResolvedValue(alerts);
    const view = renderController();
    await waitFor(() => expect(view.result.current.state).toEqual({ kind }));
  });

  it.each([
    [new ApiMessageError('offline', { status: 503 }), 'unavailable'],
    [new DashboardContractError('bad'), 'error'],
    [new Error('bad'), 'error']
  ] as const)('withholds data when the alert source fails as %s', async (reason, kind) => {
    api.loadDashboardAlertSummary.mockRejectedValue(reason);
    const view = renderController();
    await waitFor(() => expect(view.result.current.state).toEqual({ kind }));
    expect(view.result.current.state).not.toHaveProperty('data');
  });

  it('refreshes both sources and forwards one AbortSignal', async () => {
    const view = renderController();
    await waitFor(() => expect(view.result.current.state.kind).toBe('ready'));
    await act(async () => {
      await view.result.current.refresh();
    });
    expect(api.loadDashboardSummary).toHaveBeenCalledTimes(2);
    expect(api.loadDashboardAlertSummary).toHaveBeenCalledTimes(2);
    expect(api.loadDashboardSummary.mock.calls[1]?.[0]).toBe(api.loadDashboardAlertSummary.mock.calls[1]?.[0]);
  });

  it('auto refreshes the same combined query every 30 seconds', async () => {
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
    expect(view.result.current.state).toHaveProperty('data');
  });
});

function renderController() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
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
