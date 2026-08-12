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
import { MonitorContractError, type Monitor } from '../model/monitor-contract';
import { defaultMonitorDetailRefreshSeconds } from '../model/monitor-detail-model';

const api = vi.hoisted(() => ({
  loadFavoriteMetrics: vi.fn(),
  loadHistoryMetric: vi.fn(),
  loadMonitorMetricCatalog: vi.fn(),
  loadRealtimeMetric: vi.fn(),
  updateFavoriteMetric: vi.fn()
}));
const notifications = { success: vi.fn(), error: vi.fn() };
const runtimeStatus = vi.hoisted(() => ({ useRuntimeStatusController: vi.fn() }));
vi.mock('../api/monitor-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/monitor-api')>()),
  ...api
}));
vi.mock('@/features/runtime-status', () => runtimeStatus);

import { useMonitorMetricWorkbenchController } from './use-monitor-metric-workbench-controller';

const monitor = (id = 7): Monitor => ({ id, name: `monitor-${id}`, app: 'website', instance: `host-${id}`, status: 1 });
const catalog = (name = 'summary') => ({
  metrics: [{ name, visible: true, fields: [{ type: 0, field: 'value', unit: 'ms', label: false }] }]
});
const metricValue = (origin: string | null, time: number | null) => ({
  origin,
  mean: null,
  median: null,
  min: null,
  max: null,
  time
});
// URL convergence crosses both the router and asynchronous catalog query, so it
// needs a wider deadline when the complete test suite is sharing worker CPU.
const routeConvergenceWait = { timeout: 10_000 } as const;

describe('useMonitorMetricWorkbenchController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runtimeStatus.useRuntimeStatusController.mockReturnValue(runtimeStatusEvidence('available'));
    api.loadMonitorMetricCatalog.mockResolvedValue(catalog());
    api.loadFavoriteMetrics.mockResolvedValue([]);
    api.loadRealtimeMetric.mockResolvedValue({ fields: [], valueRows: [] });
    api.loadHistoryMetric.mockResolvedValue({ values: {} });
    api.updateFavoriteMetric.mockResolvedValue(undefined);
  });
  afterEach(() => cleanup());

  it('converges metric and history from URL Push, Back, and monitor changes', async () => {
    const view = renderController(
      monitor(),
      [],
      '/monitors/7?returnTo=%2Fmonitors%3FpageIndex%3D2&metric=bad.value&history=12w'
    );
    await waitFor(() => expect(view.result.current.controller.state.catalog.kind).toBe('ready'), routeConvergenceWait);
    await waitFor(
      () => expect(view.result.current.controller.state).toMatchObject({ metricKey: 'summary.value', history: '30m' }),
      routeConvergenceWait
    );
    await waitFor(() => {
      expect(view.result.current.location.search).toContain('returnTo=%2Fmonitors%3FpageIndex%3D2');
      expect(view.result.current.location.search).toContain('history=30m');
    }, routeConvergenceWait);
    act(() => {
      void view.result.current.navigate('/monitors/7?metric=summary.value&history=1h');
    });
    await waitFor(() => expect(view.result.current.controller.state.history).toBe('1h'), routeConvergenceWait);
    act(() => {
      void view.result.current.navigate('/monitors/7?metric=summary.value&history=30m');
    });
    await waitFor(() => expect(view.result.current.controller.state.history).toBe('30m'), routeConvergenceWait);
    act(() => {
      void view.result.current.navigate(-1);
    });
    await waitFor(() => expect(view.result.current.controller.state.history).toBe('1h'), routeConvergenceWait);
    act(() => {
      void view.result.current.navigate('/monitors/7?metric=summary.value&history=12W');
    });
    await waitFor(() => expect(view.result.current.controller.state.history).toBe('12W'), routeConvergenceWait);
    expect(view.result.current.location.search).toContain('history=12W');

    api.loadMonitorMetricCatalog.mockResolvedValue(catalog('other'));
    view.rerender({ monitor: monitor(8), embedded: [] });
    await waitFor(
      () => expect(view.result.current.controller.state.metricKey).toBe('other.value'),
      routeConvergenceWait
    );
    await waitFor(
      () => expect(view.result.current.location.search).toContain('metric=other.value'),
      routeConvergenceWait
    );
  });

  it('keeps embedded realtime groups available when the history catalog is unavailable', async () => {
    api.loadMonitorMetricCatalog.mockRejectedValue(new ApiMessageError('offline', { status: 503 }));
    api.loadFavoriteMetrics.mockRejectedValue(new ApiMessageError('offline', { status: 503 }));
    const embedded = [{ name: 'embedded', favorited: false }];
    const view = renderController(monitor(), embedded, '/monitors/7');
    await waitFor(() => expect(view.result.current.controller.state.catalog.kind).toBe('fallback'));
    await waitFor(() => expect(view.result.current.controller.state.favorite.kind).toBe('unavailable'));
    expect(view.result.current.controller.state.metricKey).toBe('');
    await waitFor(() => expect(view.result.current.controller.state.realtimeGroups).toHaveLength(1));
    expect(api.loadRealtimeMetric).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ group: 'embedded' }),
      expect.any(AbortSignal)
    );
  });

  it('exposes group favorites without hiding retired field tokens', async () => {
    api.loadFavoriteMetrics.mockResolvedValue(['retired.value', 'summary']);
    const view = renderController(monitor(), [], '/monitors/7');

    await waitFor(() =>
      expect(view.result.current.controller.state.favoriteCollection).toEqual({
        kind: 'ready',
        items: [
          { key: 'retired.value', available: false },
          { key: 'summary', available: true }
        ]
      })
    );
  });

  it('loads realtime metric groups in bounded definition-order pages', async () => {
    api.loadMonitorMetricCatalog.mockResolvedValue({
      metrics: Array.from({ length: 12 }, (_, index) => ({
        name: `group-${index + 1}`,
        visible: true,
        fields: [{ type: 0, field: 'value', unit: null, label: false }]
      }))
    });
    const view = renderController(monitor(), [], '/monitors/7');

    await waitFor(() => expect(view.result.current.controller.state.realtimeGroups).toHaveLength(10));
    expect(api.loadRealtimeMetric.mock.calls.map(call => (call[1] as { group: string }).group)).toEqual(
      expect.arrayContaining(Array.from({ length: 10 }, (_, index) => `group-${index + 1}`))
    );
    expect(view.result.current.controller.state.hasMoreRealtimeGroups).toBe(true);

    act(() => view.result.current.controller.actions.loadMoreRealtimeGroups());
    await waitFor(() => expect(view.result.current.controller.state.realtimeGroups).toHaveLength(12));
    expect(view.result.current.controller.state.hasMoreRealtimeGroups).toBe(false);
  });

  it('loads history charts in six-item pages only after each chart enters the viewport', async () => {
    api.loadMonitorMetricCatalog.mockResolvedValue(numericCatalog(8));
    const view = renderController(monitor(), [], '/monitors/7');

    await waitFor(() => expect(view.result.current.controller.state.historyCharts).toHaveLength(6));
    expect(view.result.current.controller.state.historyAvailability.kind).toBe('available');
    expect(view.result.current.controller.state.hasMoreHistoryCharts).toBe(true);
    expect(api.loadHistoryMetric).not.toHaveBeenCalled();

    act(() => view.result.current.controller.actions.activateHistoryChart('group-1.value'));
    await waitFor(() => expect(api.loadHistoryMetric).toHaveBeenCalledTimes(1));
    expect(api.loadHistoryMetric).toHaveBeenCalledWith(
      expect.objectContaining({ id: 7 }),
      expect.objectContaining({ key: 'group-1.value' }),
      '30m',
      false,
      expect.any(AbortSignal)
    );

    act(() => view.result.current.controller.actions.setHistoryChartRange('group-1.value', '12W'));
    await waitFor(() =>
      expect(api.loadHistoryMetric).toHaveBeenLastCalledWith(
        expect.objectContaining({ id: 7 }),
        expect.objectContaining({ key: 'group-1.value' }),
        '12W',
        false,
        expect.any(AbortSignal)
      )
    );
    expect(view.result.current.controller.state.historyCharts[0]?.history).toBe('12W');
    expect(view.result.current.controller.state.historyCharts[0]?.interval).toBe(false);

    act(() => view.result.current.controller.actions.setHistoryChartMode('group-1.value', true));
    await waitFor(() =>
      expect(api.loadHistoryMetric).toHaveBeenLastCalledWith(
        expect.objectContaining({ id: 7 }),
        expect.objectContaining({ key: 'group-1.value' }),
        '12W',
        true,
        expect.any(AbortSignal)
      )
    );
    expect(view.result.current.controller.state.historyCharts[0]?.interval).toBe(true);

    act(() => view.result.current.controller.actions.loadMoreHistoryCharts());
    await waitFor(() => expect(view.result.current.controller.state.historyCharts).toHaveLength(8));
    expect(view.result.current.controller.state.hasMoreHistoryCharts).toBe(false);
  });

  it('does not revive lazy windows or chart ranges after an A-B-A monitor change', async () => {
    api.loadMonitorMetricCatalog.mockResolvedValue(numericCatalog(12));
    const view = renderController(monitor(7), [], '/monitors/7');
    await waitFor(() => expect(view.result.current.controller.state.realtimeGroups).toHaveLength(10));
    await waitFor(() => expect(view.result.current.controller.state.historyCharts).toHaveLength(6));

    act(() => {
      view.result.current.controller.actions.loadMoreRealtimeGroups();
      view.result.current.controller.actions.loadMoreHistoryCharts();
      view.result.current.controller.actions.setHistoryChartRange('group-1.value', '12W');
    });
    await waitFor(() => expect(view.result.current.controller.state.realtimeGroups).toHaveLength(12));
    await waitFor(() => expect(view.result.current.controller.state.historyCharts).toHaveLength(12));
    expect(view.result.current.controller.state.historyCharts[0]?.history).toBe('12W');

    view.rerender({ monitor: monitor(8), embedded: [] });
    await waitFor(() => expect(view.result.current.controller.state.realtimeGroups).toHaveLength(10));
    await waitFor(() => expect(view.result.current.controller.state.historyCharts).toHaveLength(6));

    view.rerender({ monitor: monitor(7), embedded: [] });
    await waitFor(() => expect(view.result.current.controller.state.realtimeGroups).toHaveLength(10));
    await waitFor(() => expect(view.result.current.controller.state.historyCharts).toHaveLength(6));
    expect(view.result.current.controller.state.historyCharts[0]?.history).toBe('30m');
  });

  it('does not request history while storage is unavailable', async () => {
    runtimeStatus.useRuntimeStatusController.mockReturnValue(runtimeStatusEvidence('unavailable'));
    const view = renderController(monitor(), [], '/monitors/7');

    await waitFor(() => expect(view.result.current.controller.state.catalog.kind).toBe('ready'));
    expect(view.result.current.controller.state.historyAvailability.kind).toBe('unavailable');
    expect(view.result.current.controller.state.historyCharts).toEqual([]);
    act(() => view.result.current.controller.actions.activateHistoryChart('summary.value'));
    expect(api.loadHistoryMetric).not.toHaveBeenCalled();
  });

  it('writes a realtime favorite by its backend group token', async () => {
    api.loadFavoriteMetrics.mockResolvedValueOnce([]).mockResolvedValueOnce(['summary']);
    const view = renderController(monitor(), [], '/monitors/7');
    await waitFor(() =>
      expect(view.result.current.controller.state.realtimeGroups[0]?.favorite).toEqual({
        kind: 'ready',
        value: false
      })
    );

    await act(() => view.result.current.controller.actions.toggleRealtimeFavorite('summary'));

    expect(api.updateFavoriteMetric).toHaveBeenCalledWith(7, 'summary', true);
    await waitFor(() =>
      expect(view.result.current.controller.state.realtimeGroups[0]?.favorite).toEqual({
        kind: 'ready',
        value: true,
        token: 'summary'
      })
    );
  });

  it('does not promote a field token to the whole-group favorite', async () => {
    api.loadFavoriteMetrics.mockResolvedValueOnce(['summary.value']).mockResolvedValueOnce(['summary']);
    const view = renderController(monitor(), [], '/monitors/7');

    await waitFor(() =>
      expect(view.result.current.controller.state.realtimeGroups[0]).toMatchObject({
        group: 'summary',
        favorite: { kind: 'ready', value: false }
      })
    );
    expect(view.result.current.controller.state.favoriteCollection).toEqual({
      kind: 'ready',
      items: [{ key: 'summary.value', available: false }]
    });
    await act(() => view.result.current.controller.actions.toggleRealtimeFavorite('summary'));

    expect(api.updateFavoriteMetric).toHaveBeenCalledWith(7, 'summary', true);
  });

  it('keeps refresh inert until monitor and metric context is available', async () => {
    const view = renderController(undefined, [], '/monitors/7');

    await act(async () => {
      view.result.current.controller.actions.refresh();
      await Promise.resolve();
    });

    expectMetricReadsNotCalled();
    expect(view.refreshDetail).toHaveBeenCalledOnce();
  });

  it('keeps refresh inert when the monitor has no metric selection', async () => {
    api.loadMonitorMetricCatalog.mockResolvedValue({ metrics: [] });
    const view = renderController(monitor(), [], '/monitors/7');
    await waitFor(() => expect(view.result.current.controller.state.catalog.kind).toBe('empty'));
    vi.clearAllMocks();

    await act(async () => {
      view.result.current.controller.actions.refresh();
      await Promise.resolve();
    });

    expectMetricReadsNotCalled();
    expect(view.refreshDetail).toHaveBeenCalledOnce();
  });

  it('reads realtime, skips history, and favorites a realtime-only group by its backend group token', async () => {
    api.loadMonitorMetricCatalog.mockResolvedValue({
      metrics: [
        {
          name: 'identity',
          visible: true,
          fields: [
            { type: 1, field: 'host', unit: null, label: true },
            { type: 1, field: 'version', unit: null, label: false },
            { type: 1, field: 'status', unit: null, label: false }
          ]
        }
      ]
    });
    api.loadRealtimeMetric.mockResolvedValue({
      fields: [
        { name: 'host', type: 1, unit: null, label: true },
        { name: 'version', type: 1, unit: null, label: false },
        { name: 'status', type: 1, unit: null, label: false }
      ],
      valueRows: [
        {
          labels: { host: 'edge-a' },
          values: [metricValue('edge-a', 1000), metricValue('2.0.0', 1000), metricValue('UP', 1000)]
        }
      ]
    });
    api.loadFavoriteMetrics
      .mockResolvedValueOnce(['identity'])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(['identity']);
    const view = renderController(monitor(), [], '/monitors/7');

    await waitFor(() =>
      expect(view.result.current.controller.state.catalog).toMatchObject({
        kind: 'ready',
        options: [
          {
            key: 'identity.version',
            group: 'identity',
            field: 'version',
            historySupported: false
          }
        ]
      })
    );
    await waitFor(() => expect(view.result.current.controller.state.realtime.kind).toBe('ready'));
    expect(view.result.current.controller.state).toMatchObject({
      metricKey: 'identity.version',
      historySupported: false,
      favorite: { kind: 'ready', value: true, token: 'identity' },
      historical: { kind: 'unsupported', rows: [] }
    });
    expect(api.loadRealtimeMetric).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ group: 'identity', field: 'version', historySupported: false }),
      expect.any(AbortSignal)
    );
    expect(api.loadHistoryMetric).not.toHaveBeenCalled();

    expect(view.result.current.controller.state.favoriteCollection).toEqual({
      kind: 'ready',
      items: [{ key: 'identity', available: true }]
    });

    await act(() => view.result.current.controller.actions.toggleFavorite());
    expect(api.updateFavoriteMetric).toHaveBeenNthCalledWith(1, 7, 'identity', false);
    expect(view.result.current.controller.state.favorite).toEqual({ kind: 'ready', value: false });

    await act(() => view.result.current.controller.actions.toggleFavorite());
    expect(api.updateFavoriteMetric).toHaveBeenNthCalledWith(2, 7, 'identity', true);
    expect(view.result.current.controller.state.favorite).toEqual({
      kind: 'ready',
      value: true,
      token: 'identity'
    });

    api.updateFavoriteMetric.mockRejectedValueOnce(new ApiMessageError('write rejected', { status: 500 }));
    await act(() => view.result.current.controller.actions.toggleFavorite());
    expect(api.updateFavoriteMetric).toHaveBeenNthCalledWith(3, 7, 'identity', false);
    expect(notifications.error).toHaveBeenCalledWith('monitorMetrics.favoriteFailed');
    expect(view.result.current.controller.state.favorite).toEqual({
      kind: 'ready',
      value: true,
      token: 'identity'
    });

    act(() => view.result.current.controller.actions.refresh());
    await waitFor(() => expect(api.loadRealtimeMetric.mock.calls.length).toBeGreaterThanOrEqual(2));
    expect(api.loadHistoryMetric).not.toHaveBeenCalled();
  });

  it('manually refreshes active realtime and long-range history even when auto-refresh is Off', async () => {
    const view = renderController(
      monitor(),
      [],
      '/monitors/7?returnTo=%2Fmonitors%3FpageIndex%3D2&refresh=0&history=12W'
    );
    await waitFor(() => expect(view.result.current.controller.state.catalog.kind).toBe('ready'));
    act(() => view.result.current.controller.actions.activateHistoryChart('summary.value'));
    await waitFor(() => expect(api.loadHistoryMetric).toHaveBeenCalledTimes(1));
    expect(api.loadHistoryMetric).toHaveBeenCalledWith(
      expect.objectContaining({ id: 7 }),
      expect.objectContaining({ key: 'summary.value' }),
      '12W',
      true,
      expect.any(AbortSignal)
    );
    vi.clearAllMocks();

    await act(async () => {
      view.result.current.controller.actions.refresh();
      await Promise.resolve();
    });

    expect(api.loadFavoriteMetrics).toHaveBeenCalledTimes(1);
    expect(api.loadRealtimeMetric).toHaveBeenCalledTimes(1);
    expect(api.loadHistoryMetric).toHaveBeenCalledTimes(1);
    expect(view.refreshDetail).toHaveBeenCalledOnce();
    expect(view.result.current.location.search).toContain('returnTo=%2Fmonitors%3FpageIndex%3D2');
    expect(view.result.current.location.search).toContain('history=12W');
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
    act(() => view.result.current.controller.actions.activateHistoryChart('summary.value'));
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
    api.loadFavoriteMetrics.mockResolvedValueOnce([]).mockResolvedValueOnce(['summary']);
    const view = renderController(monitor(), [], '/monitors/7');
    await waitFor(() =>
      expect(view.result.current.controller.state.favorite).toMatchObject({ kind: 'ready', value: false })
    );
    await act(() => view.result.current.controller.actions.toggleFavorite());
    expect(api.updateFavoriteMetric).toHaveBeenCalledWith(7, 'summary', true);
    expect(api.loadFavoriteMetrics).toHaveBeenCalledTimes(2);
    expect(view.result.current.controller.state.favorite).toMatchObject({ kind: 'ready', value: true });
  });

  it('removes a legacy group favorite through its canonical backend token', async () => {
    api.loadFavoriteMetrics.mockResolvedValueOnce(['summary']).mockResolvedValueOnce([]);
    const view = renderController(monitor(), [], '/monitors/7');
    await waitFor(() =>
      expect(view.result.current.controller.state.favorite).toEqual({
        kind: 'ready',
        value: true,
        token: 'summary'
      })
    );

    await act(() => view.result.current.controller.actions.toggleFavorite());

    expect(api.updateFavoriteMetric).toHaveBeenCalledWith(7, 'summary', false);
    expect(view.result.current.controller.state.favorite).toEqual({ kind: 'ready', value: false });
  });

  it('reports favoriteFailed only when the write itself is rejected', async () => {
    const writeFailure = new ApiMessageError('write rejected', { status: 500 });
    api.updateFavoriteMetric.mockRejectedValue(writeFailure);
    const view = renderController(monitor(), [], '/monitors/7');
    await waitFor(() =>
      expect(view.result.current.controller.state.favorite).toMatchObject({ kind: 'ready', value: false })
    );

    await expect(act(() => view.result.current.controller.actions.toggleFavorite())).resolves.toBeUndefined();

    expect(notifications.success).not.toHaveBeenCalled();
    expect(notifications.error).toHaveBeenCalledWith('monitorMetrics.favoriteFailed');
    expect(api.loadFavoriteMetrics).toHaveBeenCalledTimes(1);
  });

  it.each([
    [new ApiMessageError('storage unavailable', { status: 503 }), 'common.unavailable', 'unavailable'],
    [new MonitorContractError('invalid proof'), 'common.routeError.description', 'error']
  ] as const)(
    'keeps an acknowledged favorite write committed when proof becomes %s',
    async (proofFailure, expectedMessage, expectedKind) => {
      api.loadFavoriteMetrics.mockResolvedValueOnce([]).mockRejectedValue(proofFailure);
      const view = renderController(monitor(), [], '/monitors/7');
      await waitFor(() =>
        expect(view.result.current.controller.state.favorite).toMatchObject({ kind: 'ready', value: false })
      );

      await expect(act(() => view.result.current.controller.actions.toggleFavorite())).resolves.toBeUndefined();

      expect(notifications.success).toHaveBeenCalledWith('monitorMetrics.favoriteSaved');
      expect(notifications.error).toHaveBeenCalledWith(expectedMessage);
      expect(notifications.error).not.toHaveBeenCalledWith('monitorMetrics.favoriteFailed');
      await waitFor(() => expect(view.result.current.controller.state.favorite.kind).toBe(expectedKind));

      await act(() => view.result.current.controller.actions.toggleFavorite());
      expect(api.updateFavoriteMetric).toHaveBeenCalledTimes(1);
      expect(api.loadFavoriteMetrics.mock.calls.length).toBeGreaterThanOrEqual(3);
    }
  );

  it('keeps an acknowledged but non-converged favorite write out of the failed-write path', async () => {
    let release: (() => void) | undefined;
    api.updateFavoriteMetric.mockImplementation(
      () =>
        new Promise<void>(resolve => {
          release = resolve;
        })
    );
    api.loadFavoriteMetrics.mockResolvedValue([]);
    const view = renderController(monitor(), [], '/monitors/7');
    await waitFor(() =>
      expect(view.result.current.controller.state.favorite).toMatchObject({ kind: 'ready', value: false })
    );
    let first!: Promise<void>;
    act(() => {
      first = view.result.current.controller.actions.toggleFavorite();
    });
    await waitFor(() => expect(api.updateFavoriteMetric).toHaveBeenCalledTimes(1));
    await act(() => view.result.current.controller.actions.toggleFavorite());
    expect(api.updateFavoriteMetric).toHaveBeenCalledTimes(1);
    release?.();
    await expect(first).resolves.toBeUndefined();
    expect(notifications.success).toHaveBeenCalledWith('monitorMetrics.favoriteSaved');
    expect(notifications.error).toHaveBeenCalledWith('common.routeError.description');
    expect(notifications.error).not.toHaveBeenCalledWith('monitorMetrics.favoriteFailed');
    await waitFor(() => {
      expect(api.loadFavoriteMetrics.mock.calls.length).toBeGreaterThanOrEqual(3);
      expect(view.result.current.controller.state.favorite).toMatchObject({ kind: 'ready', value: false });
    });
    expect(view.result.current.controller.state.favoriteBusy).toBe(true);

    api.loadFavoriteMetrics.mockResolvedValue(['summary']);
    act(() => view.result.current.controller.actions.refresh());
    await waitFor(() => {
      expect(view.result.current.controller.state.favorite).toMatchObject({ kind: 'ready', value: true });
      expect(view.result.current.controller.state.favoriteBusy).toBe(false);
    });
  });

  it('drops an old favorite mutation when the monitor source changes', async () => {
    let release: (() => void) | undefined;
    api.updateFavoriteMetric.mockImplementation(
      () =>
        new Promise<void>(resolve => {
          release = resolve;
        })
    );
    const view = renderController(monitor(), [], '/monitors/7');
    await waitFor(() => expect(view.result.current.controller.state.favorite.kind).toBe('ready'));
    let mutation!: Promise<void>;
    act(() => {
      mutation = view.result.current.controller.actions.toggleFavorite();
    });
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
    api.loadFavoriteMetrics.mockResolvedValueOnce(['summary']);
    await act(() => view.result.current.controller.actions.toggleFavorite());
    expect(api.updateFavoriteMetric).toHaveBeenCalledTimes(2);
    expect(view.result.current.controller.state.favoriteBusy).toBe(false);
  });

  it('does not revive an old favorite mutation after an ABA source change', async () => {
    let release: (() => void) | undefined;
    api.updateFavoriteMetric.mockImplementation(
      () =>
        new Promise<void>(resolve => {
          release = resolve;
        })
    );
    const view = renderController(monitor(7), [], '/monitors/7');
    await waitFor(() => expect(view.result.current.controller.state.favorite.kind).toBe('ready'));
    let mutation!: Promise<void>;
    act(() => {
      mutation = view.result.current.controller.actions.toggleFavorite();
    });
    await waitFor(() => expect(api.updateFavoriteMetric).toHaveBeenCalledTimes(1));

    api.loadMonitorMetricCatalog.mockResolvedValue(catalog('other'));
    view.rerender({ monitor: monitor(8), embedded: [] });
    await waitFor(() => expect(view.result.current.controller.state.metricKey).toBe('other.value'));
    api.loadMonitorMetricCatalog.mockResolvedValue(catalog());
    view.rerender({ monitor: monitor(7), embedded: [] });
    await waitFor(() => expect(view.result.current.controller.state.metricKey).toBe('summary.value'));
    const readsBeforeRelease = api.loadFavoriteMetrics.mock.calls.length;
    release?.();

    await expect(mutation).resolves.toBeUndefined();
    expect(api.loadFavoriteMetrics).toHaveBeenCalledTimes(readsBeforeRelease);
    expect(notifications.success).not.toHaveBeenCalled();
    expect(notifications.error).not.toHaveBeenCalled();
  });

  it('retires a favorite mutation when the controller unmounts', async () => {
    let release: (() => void) | undefined;
    api.updateFavoriteMetric.mockImplementation(
      () =>
        new Promise<void>(resolve => {
          release = resolve;
        })
    );
    const view = renderController(monitor(), [], '/monitors/7');
    await waitFor(() => expect(view.result.current.controller.state.favorite.kind).toBe('ready'));
    let mutation!: Promise<void>;
    act(() => {
      mutation = view.result.current.controller.actions.toggleFavorite();
    });
    await waitFor(() => expect(api.updateFavoriteMetric).toHaveBeenCalledTimes(1));

    view.unmount();
    release?.();

    await expect(mutation).resolves.toBeUndefined();
    expect(api.loadFavoriteMetrics).toHaveBeenCalledTimes(1);
    expect(notifications.success).not.toHaveBeenCalled();
    expect(notifications.error).not.toHaveBeenCalled();
  });
});

function numericCatalog(count: number) {
  return {
    metrics: Array.from({ length: count }, (_, index) => ({
      name: `group-${index + 1}`,
      visible: true,
      fields: [{ type: 0, field: 'value', unit: null, label: false }]
    }))
  };
}

function runtimeStatusEvidence(storage: 'available' | 'unavailable') {
  return {
    state: 'ready',
    snapshot: {
      observedAt: '2026-08-03T00:00:00Z',
      server: { status: 'available', errorCode: null },
      storage: {
        kind: 'greptime',
        status: storage,
        errorCode: storage === 'available' ? null : 'storage_unavailable'
      },
      collectors: {
        status: 'available',
        total: 1,
        online: 1,
        runtimeHealthy: 1,
        lastReportedAt: '2026-08-03T00:00:00Z',
        errorCode: null
      }
    }
  };
}

function renderController(
  initialMonitor: Monitor | undefined,
  embedded: Parameters<typeof useMonitorMetricWorkbenchController>[1],
  entry: string,
  refreshDetail = vi.fn()
) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const rendered = renderHook(
    ({ monitor: current, embedded: currentEmbedded }) => ({
      controller: useMonitorMetricWorkbenchController(current, currentEmbedded, {
        notifications,
        refreshDetail,
        refreshControl: {
          refreshSeconds: defaultMonitorDetailRefreshSeconds,
          setRefreshSeconds: vi.fn()
        }
      }),
      navigate: useNavigate(),
      location: useLocation()
    }),
    {
      initialProps: { monitor: initialMonitor, embedded },
      wrapper: ({ children }: PropsWithChildren) => (
        <QueryClientProvider client={client}>
          <App>
            <MemoryRouter initialEntries={[entry]}>{children}</MemoryRouter>
          </App>
        </QueryClientProvider>
      )
    }
  );
  return { ...rendered, refreshDetail };
}

function expectMetricReadsNotCalled() {
  expect(api.loadMonitorMetricCatalog).not.toHaveBeenCalled();
  expect(api.loadFavoriteMetrics).not.toHaveBeenCalled();
  expect(api.loadRealtimeMetric).not.toHaveBeenCalled();
  expect(api.loadHistoryMetric).not.toHaveBeenCalled();
}
