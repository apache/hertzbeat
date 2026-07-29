/*
 * Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DashboardContractError, DashboardRequestFailure } from '../model/dashboard-model';
import { dashboardQueryKeys } from './dashboard-query-keys';
import { DASHBOARD_REFRESH_INTERVAL_MS, useDashboardController } from './use-dashboard-controller';

const api = vi.hoisted(() => ({
  loadDashboardSummary: vi.fn(),
  loadDashboardAlertSummary: vi.fn(),
  loadDashboardRecentAlerts: vi.fn()
}));
const collectors = vi.hoisted(() => ({ loadCollectorManagementPage: vi.fn() }));
const labels = vi.hoisted(() => ({ loadLabelSuggestions: vi.fn() }));
vi.mock('../api/dashboard-api', () => api);
vi.mock('@/features/settings', async importOriginal => ({
  ...(await importOriginal<typeof import('@/features/settings')>()),
  loadCollectorManagementPage: collectors.loadCollectorManagementPage,
  loadLabelSuggestions: labels.loadLabelSuggestions
}));

describe('Dashboard recent firing alerts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.loadDashboardSummary.mockResolvedValue({ apps: [app] });
    api.loadDashboardAlertSummary.mockResolvedValue(alertSummary);
    api.loadDashboardRecentAlerts.mockResolvedValue(recentPage([recentAlert]));
    collectors.loadCollectorManagementPage.mockResolvedValue(collectorPage);
    labels.loadLabelSuggestions.mockResolvedValue({ keys: [], valuesByKey: {}, displayNames: [] });
  });
  afterEach(() => vi.useRealTimers());

  it('owns an independent query key, AbortSignal, and ready evidence', async () => {
    const client = queryClient();
    const view = renderController(client);

    await waitFor(() =>
      expect(view.result.current).toMatchObject({
        monitorState: { kind: 'ready' },
        alertState: { kind: 'ready' },
        recentAlertState: { kind: 'ready', records: [{ id: 11 }], total: 1 },
        collectorState: { kind: 'ready' }
      })
    );
    expect(api.loadDashboardRecentAlerts).toHaveBeenCalledWith(expect.any(AbortSignal));
    expect(client.getQueryState(dashboardQueryKeys.recentAlerts())).toBeDefined();
    expect(dashboardQueryKeys.recentAlerts()).toEqual(['dashboard', 'recent-alerts']);
    expect(api.loadDashboardRecentAlerts.mock.calls[0]?.[0]).not.toBe(api.loadDashboardAlertSummary.mock.calls[0]?.[0]);
  });

  it('publishes loading and authoritative empty without hiding ready summaries', async () => {
    const pending = deferred<ReturnType<typeof recentPage>>();
    api.loadDashboardRecentAlerts.mockReturnValue(pending.promise);
    const view = renderController();
    await waitFor(() =>
      expect(view.result.current).toMatchObject({
        recentAlertState: { kind: 'loading' },
        alertState: { kind: 'ready', summary: { total: 3 } }
      })
    );

    act(() => pending.resolve(recentPage([])));
    await waitFor(() => expect(view.result.current.recentAlertState).toEqual({ kind: 'empty' }));
    expect(view.result.current.monitorState.kind).toBe('ready');
  });

  it.each([
    [new DashboardRequestFailure('permission'), 'permission'],
    [new DashboardRequestFailure('unavailable'), 'unavailable'],
    [new DashboardContractError('bad contract'), 'contract'],
    [new Error('private failure'), 'error']
  ] as const)('classifies recent-alert failure as %s independently', async (reason, kind) => {
    api.loadDashboardRecentAlerts.mockRejectedValue(reason);
    const view = renderController();

    await waitFor(() => expect(view.result.current.recentAlertState).toEqual({ kind }));
    expect(view.result.current.monitorState.kind).toBe('ready');
    expect(view.result.current.alertState).toMatchObject({ kind: 'ready', summary: { total: 3 } });
    expect(view.result.current.collectorState.kind).toBe('ready');
  });

  it('keeps recent alerts ready when summary is unavailable and the reverse', async () => {
    api.loadDashboardAlertSummary.mockRejectedValueOnce(new DashboardRequestFailure('unavailable'));
    const recentReady = renderController();
    await waitFor(() =>
      expect(recentReady.result.current).toMatchObject({
        alertState: { kind: 'unavailable' },
        recentAlertState: { kind: 'ready', records: [{ id: 11 }] }
      })
    );
    recentReady.unmount();

    api.loadDashboardAlertSummary.mockResolvedValue(alertSummary);
    api.loadDashboardRecentAlerts.mockRejectedValueOnce(new DashboardRequestFailure('unavailable'));
    const summaryReady = renderController();
    await waitFor(() =>
      expect(summaryReady.result.current).toMatchObject({
        alertState: { kind: 'ready', summary: { total: 3 } },
        recentAlertState: { kind: 'unavailable' }
      })
    );
  });

  it('includes recent alerts in manual all-settled refresh without masking other sources', async () => {
    const view = renderController();
    await waitFor(() => expect(view.result.current.recentAlertState.kind).toBe('ready'));
    api.loadDashboardRecentAlerts.mockRejectedValueOnce(new DashboardRequestFailure('unavailable'));

    await act(async () => view.result.current.refresh());

    expect(api.loadDashboardSummary).toHaveBeenCalledTimes(2);
    expect(api.loadDashboardAlertSummary).toHaveBeenCalledTimes(2);
    expect(api.loadDashboardRecentAlerts).toHaveBeenCalledTimes(2);
    expect(collectors.loadCollectorManagementPage).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(view.result.current.recentAlertState).toEqual({ kind: 'unavailable' }));
    expect(view.result.current.alertState.kind).toBe('ready');
  });

  it('refreshes recent alerts on the shared 30-second cadence', async () => {
    vi.useFakeTimers();
    const view = renderController();
    await act(async () => vi.advanceTimersByTimeAsync(0));
    expect(api.loadDashboardRecentAlerts).toHaveBeenCalledTimes(1);

    await act(async () => vi.advanceTimersByTimeAsync(DASHBOARD_REFRESH_INTERVAL_MS));

    expect(api.loadDashboardSummary).toHaveBeenCalledTimes(2);
    expect(api.loadDashboardAlertSummary).toHaveBeenCalledTimes(2);
    expect(api.loadDashboardRecentAlerts).toHaveBeenCalledTimes(2);
    expect(collectors.loadCollectorManagementPage).toHaveBeenCalledTimes(2);
    expect(view.result.current.recentAlertState.kind).toBe('ready');
  });
});

function renderController(client = queryClient()) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(useDashboardController, { wrapper });
}

function queryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
}

function recentPage(content: (typeof recentAlert)[]) {
  return {
    content,
    totalElements: content.length,
    totalPages: content.length === 0 ? 0 : 1,
    number: 0,
    size: 10
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(complete => {
    resolve = complete;
  });
  return { promise, resolve };
}

const app = { app: 'mysql', category: 'db', size: 1, availableSize: 1, unAvailableSize: 0, unManageSize: 0 };
const alertSummary = {
  total: 3,
  dealNum: 1,
  rate: 33.33,
  priorityWarningNum: 1,
  priorityCriticalNum: 1,
  priorityEmergencyNum: 0
};
const recentAlert = {
  id: 11,
  labels: { alertname: 'HighLatency', severity: 'critical' },
  annotations: null,
  content: 'Checkout latency is high.',
  status: 'firing' as const,
  triggerTimes: 2,
  startAt: 1784250000000,
  activeAt: 1784250060000,
  endAt: null
};
const collectorPage = {
  content: [
    {
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
    }
  ],
  totalElements: 1,
  totalPages: 1,
  number: 0,
  size: 8
};
