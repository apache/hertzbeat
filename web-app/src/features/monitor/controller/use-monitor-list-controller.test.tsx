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
import { useLayoutEffect, type PropsWithChildren } from 'react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import { ApiMessageError } from '@/core/http/api-message';

const api = vi.hoisted(() => ({
  deleteMonitorGrafanaDashboards: vi.fn(),
  loadMonitorApps: vi.fn(),
  loadMonitorDetail: vi.fn(),
  loadMonitors: vi.fn(),
  mutateMonitors: vi.fn()
}));
vi.mock('../api/monitor-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/monitor-api')>()),
  ...api
}));

import {
  monitorListAutoRefreshMs,
  monitorListQueryOptions,
  useMonitorListController
} from './use-monitor-list-controller';
import { MonitorContractError } from '../model/monitor-contract';
import { monitorQueryKeys } from './monitor-query-keys';

const initialMonitorPage = {
  content: [
    {
      id: 7,
      name: 'epoch',
      app: 'website',
      instance: 'zero',
      status: 1,
      gmtUpdate: 0
    }
  ],
  totalElements: 1
};
const clipboardWrite = vi.fn();

describe('useMonitorListController URL evidence', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });
  beforeEach(() => {
    vi.resetAllMocks();
    api.deleteMonitorGrafanaDashboards.mockResolvedValue(false);
    api.loadMonitorApps.mockResolvedValue([]);
    api.loadMonitorDetail.mockResolvedValue({
      monitor: { id: 7, name: 'epoch', app: 'website', instance: 'zero', status: 1 },
      params: [],
      collector: null,
      grafanaDashboard: null,
      metrics: []
    });
    api.loadMonitors.mockResolvedValue(initialMonitorPage);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: clipboardWrite }
    });
  });
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('converges both drafts on push, Back, and Forward and preserves timestamp zero', async () => {
    const view = renderHook(() => ({ controller: useMonitorListController(), navigate: useNavigate() }), {
      wrapper: wrapper(['/monitors?search=one&labels=env%3Aone', '/monitors?search=two&labels=env%3Atwo'], 1)
    });
    await waitFor(() => expect(view.result.current.controller.state.monitors.kind).toBe('ready'));
    expect(view.result.current.controller.state.draft).toEqual({ search: 'two', labels: 'env:two' });
    expect(view.result.current.controller.state.monitors).toMatchObject({ kind: 'ready', records: [{ gmtUpdate: 0 }] });

    act(() => {
      void view.result.current.navigate('/monitors?search=three&labels=env%3Athree');
    });
    await waitFor(() =>
      expect(view.result.current.controller.state.draft).toEqual({ search: 'three', labels: 'env:three' })
    );
    act(() => {
      void view.result.current.navigate(-1);
    });
    await waitFor(() =>
      expect(view.result.current.controller.state.draft).toEqual({ search: 'two', labels: 'env:two' })
    );
    act(() => {
      void view.result.current.navigate(1);
    });
    await waitFor(() =>
      expect(view.result.current.controller.state.draft).toEqual({ search: 'three', labels: 'env:three' })
    );
  });

  it('does not revive an abandoned filter draft after navigating away and back', async () => {
    const view = renderHook(() => ({ controller: useMonitorListController(), navigate: useNavigate() }), {
      wrapper: wrapper(['/monitors?search=alpha', '/monitors?search=beta'], 0)
    });
    await waitFor(() => expect(view.result.current.controller.state.monitors.kind).toBe('ready'));

    act(() => view.result.current.controller.actions.setSearch('abandoned alpha'));
    expect(view.result.current.controller.state.draft.search).toBe('abandoned alpha');

    act(() => {
      void view.result.current.navigate(1);
    });
    await waitFor(() => expect(view.result.current.controller.state.draft.search).toBe('beta'));

    act(() => {
      void view.result.current.navigate(-1);
    });
    await waitFor(() => expect(view.result.current.controller.state.draft.search).toBe('alpha'));
  });

  it('carries the current application and safe list return target into monitor creation', async () => {
    const view = renderHook(() => ({ controller: useMonitorListController(), location: useLocation() }), {
      wrapper: wrapper(['/monitors?app=website&token=must-not-follow'], 0)
    });
    await waitFor(() => expect(view.result.current.controller.state.monitors.kind).toBe('ready'));

    act(() => view.result.current.controller.actions.create());

    await waitFor(() => expect(view.result.current.location.pathname).toBe('/monitors/new'));
    expect(view.result.current.location.search).toBe('?app=website&returnTo=%2Fmonitors%3Fapp%3Dwebsite');
    expect(view.result.current.location.search).not.toContain('must-not-follow');
  });

  it.each([
    [new ApiMessageError('offline', { status: 503 }), 'unavailable'],
    [new MonitorContractError('bad page'), 'error']
  ] as const)('keeps monitor failure evidence as %s instead of empty', async (reason, kind) => {
    api.loadMonitors.mockRejectedValue(reason);
    const view = renderHook(() => useMonitorListController(), { wrapper: wrapper(['/monitors'], 0) });
    await waitFor(() => expect(view.result.current.state.monitors.kind).toBe(kind));
    expect(view.result.current.state.monitors).not.toHaveProperty('records');
  });

  it.each([
    [new ApiMessageError('offline', { status: 503 }), 'unavailable'],
    [new MonitorContractError('bad apps'), 'error']
  ] as const)('keeps application failure evidence as %s instead of empty options', async (reason, kind) => {
    api.loadMonitorApps.mockRejectedValue(reason);
    const view = renderHook(() => useMonitorListController(), { wrapper: wrapper(['/monitors'], 0) });
    await waitFor(() => expect(view.result.current.state.apps.kind).toBe(kind));
    expect(view.result.current.state.apps).not.toHaveProperty('options');
  });

  it('shows authoritative empty only for a canonical zero page', async () => {
    api.loadMonitors.mockResolvedValue({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 });
    const view = renderHook(() => useMonitorListController(), { wrapper: wrapper(['/monitors'], 0) });
    await waitFor(() => expect(view.result.current.state.monitors.kind).toBe('empty'));
  });

  it('keeps the two-minute interval explicit so automatic reads can be reconciled', () => {
    const sorted = {
      search: '',
      app: '',
      status: '9',
      labels: '',
      sort: 'gmtUpdate' as const,
      order: 'desc' as const,
      pageIndex: 0,
      pageSize: 10
    };
    expect(monitorListAutoRefreshMs).toBe(120_000);
    expect(monitorListQueryOptions(sorted).refetchInterval).toBeUndefined();
  });

  it('copies a static monitor endpoint and contains clipboard failures', async () => {
    clipboardWrite.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('private clipboard failure'));
    const view = renderHook(() => useMonitorListController(), { wrapper: wrapper(['/monitors'], 0) });
    await waitFor(() => expect(view.result.current.state.monitors.kind).toBe('ready'));

    await expect(view.result.current.actions.copyInstance('https://checkout.example')).resolves.toBe(true);
    await expect(view.result.current.actions.copyInstance('https://orders.example')).resolves.toBe(false);

    expect(clipboardWrite).toHaveBeenNthCalledWith(1, 'https://checkout.example');
    expect(clipboardWrite).toHaveBeenNthCalledWith(2, 'https://orders.example');
  });

  it('moves server sorting into the route and resets pagination', async () => {
    const view = renderHook(() => ({ controller: useMonitorListController(), location: useLocation() }), {
      wrapper: wrapper(['/monitors?pageIndex=2&pageSize=20'], 0)
    });
    await waitFor(() => expect(view.result.current.controller.state.monitors.kind).toBe('ready'));

    act(() => view.result.current.controller.actions.changeSort('name', 'asc'));

    await waitFor(() => expect(view.result.current.location.search).toContain('sort=name&order=asc'));
    expect(view.result.current.location.search).toContain('pageIndex=0');
    expect(view.result.current.controller.state.query).toMatchObject({ sort: 'name', order: 'asc', pageIndex: 0 });
  });

  it.each([
    [new ApiMessageError('offline', { status: 503 }), 'unavailable'],
    [new MonitorContractError('bad refresh'), 'error']
  ] as const)('makes a failed %s refresh explicit and recovers with canonical data', async (reason, kind) => {
    const initial = { content: [{ id: 7, name: 'old', app: 'website', instance: 'old', status: 1 }], totalElements: 1 };
    const recovered = {
      content: [{ id: 8, name: 'new', app: 'website', instance: 'new', status: 1 }],
      totalElements: 1
    };
    api.loadMonitors.mockResolvedValueOnce(initial).mockRejectedValueOnce(reason).mockResolvedValueOnce(recovered);
    const view = renderHook(() => useMonitorListController(), { wrapper: wrapper(['/monitors'], 0) });
    await waitFor(() =>
      expect(view.result.current.state.monitors).toMatchObject({
        kind: 'ready',
        records: [{ id: 7 }]
      })
    );

    let failed: boolean | undefined;
    await act(async () => {
      failed = await view.result.current.actions.refresh();
    });
    expect(failed).toBe(false);
    await waitFor(() => expect(view.result.current.state.monitors.kind).toBe(kind));
    expect(view.result.current.state.monitors).not.toHaveProperty('records');

    let succeeded: boolean | undefined;
    await act(async () => {
      succeeded = await view.result.current.actions.refresh();
    });
    expect(succeeded).toBe(true);
    await waitFor(() =>
      expect(view.result.current.state.monitors).toMatchObject({
        kind: 'ready',
        records: [{ id: 8, name: 'new' }]
      })
    );
  });

  it('deduplicates concurrent refreshes through the existing query fetch state', async () => {
    let release!: (value: unknown) => void;
    const refreshed = {
      content: [{ id: 8, name: 'new', app: 'website', instance: 'new', status: 1 }],
      totalElements: 1
    };
    api.loadMonitors
      .mockResolvedValueOnce({
        content: [{ id: 7, name: 'old', app: 'website', instance: 'old', status: 1 }],
        totalElements: 1
      })
      .mockImplementationOnce(
        () =>
          new Promise(resolve => {
            release = resolve;
          })
      );
    const view = renderHook(() => useMonitorListController(), { wrapper: wrapper(['/monitors'], 0) });
    await waitFor(() => expect(view.result.current.state.monitors.kind).toBe('ready'));

    let first!: Promise<boolean>;
    let second!: Promise<boolean>;
    act(() => {
      first = view.result.current.actions.refresh();
      second = view.result.current.actions.refresh();
    });
    await waitFor(() => expect(view.result.current.state.refreshing).toBe(true));
    expect(api.loadMonitors).toHaveBeenCalledTimes(2);
    release(refreshed);
    await expect(Promise.all([first, second])).resolves.toEqual([true, true]);
    await waitFor(() => expect(view.result.current.state.refreshing).toBe(false));
  });

  it('clears scoped selection only after mutation and authoritative reread converge', async () => {
    api.loadMonitors
      .mockResolvedValueOnce({
        content: [{ id: 7, name: 'epoch', app: 'website', instance: 'zero', status: 0 }],
        totalElements: 1
      })
      .mockResolvedValue({
        content: [{ id: 7, name: 'epoch', app: 'website', instance: 'zero', status: 1 }],
        totalElements: 1
      });
    api.mutateMonitors.mockResolvedValue(undefined);
    const view = renderHook(() => useMonitorListController(), { wrapper: wrapper(['/monitors'], 0) });
    await waitFor(() => expect(view.result.current.state.monitors.kind).toBe('ready'));
    act(() => view.result.current.actions.selectIds([7]));
    expect(view.result.current.state.selectedIds).toEqual([7]);
    await act(() => view.result.current.actions.run('enable', [7]));
    await waitFor(() => expect(api.loadMonitors).toHaveBeenCalledTimes(2));
    expect(view.result.current.state.selectedIds).toEqual([]);
  });

  it('accepts filtered disappearance only after exact detail proves the new status', async () => {
    api.loadMonitors
      .mockResolvedValueOnce({
        content: [{ id: 7, name: 'epoch', app: 'website', instance: 'zero', status: 0 }],
        totalElements: 1
      })
      .mockResolvedValueOnce({ content: [], totalElements: 0 });
    api.mutateMonitors.mockResolvedValue(undefined);
    const view = renderHook(() => useMonitorListController(), {
      wrapper: wrapper(['/monitors?status=0'], 0)
    });
    await waitFor(() => expect(view.result.current.state.monitors.kind).toBe('ready'));
    act(() => view.result.current.actions.selectIds([7]));

    await act(() => view.result.current.actions.run('enable', [7]));

    expect(api.loadMonitorDetail).toHaveBeenCalledWith(7, expect.any(AbortSignal));
    expect(view.result.current.state.selectedIds).toEqual([]);
  });

  it('keeps a proven mutation committed when the follow-up list refresh fails', async () => {
    api.loadMonitors
      .mockResolvedValueOnce({
        content: [{ id: 7, name: 'epoch', app: 'website', instance: 'zero', status: 0 }],
        totalElements: 1
      })
      .mockRejectedValueOnce(new ApiMessageError('offline', { status: 503 }));
    api.mutateMonitors.mockResolvedValue(undefined);
    const view = renderHook(() => useMonitorListController(), { wrapper: wrapper(['/monitors'], 0) });
    await waitFor(() => expect(view.result.current.state.monitors.kind).toBe('ready'));
    act(() => view.result.current.actions.selectIds([7]));

    await act(() => view.result.current.actions.run('enable', [7]));

    expect(view.result.current.state.selectedIds).toEqual([]);
    await waitFor(() => expect(view.result.current.state.monitors.kind).toBe('unavailable'));
  });

  it('requires exact paused status before completing a pause command', async () => {
    const pausedDetail = {
      monitor: { id: 7, name: 'epoch', app: 'website', instance: 'zero', status: 0 },
      params: [],
      collector: null,
      grafanaDashboard: null,
      metrics: []
    };
    api.loadMonitorDetail.mockResolvedValue(pausedDetail);
    api.mutateMonitors.mockResolvedValue(undefined);
    const client = testQueryClient();
    client.setQueryData(monitorQueryKeys.detail(7), detailWithStatus(1));
    const view = renderHook(() => useMonitorListController(), { wrapper: wrapper(['/monitors'], 0, client) });
    await waitFor(() => expect(view.result.current.state.monitors.kind).toBe('ready'));
    act(() => view.result.current.actions.selectIds([7]));

    await act(() => view.result.current.actions.run('pause', [7]));

    expect(api.loadMonitorDetail).toHaveBeenCalledWith(7, expect.any(AbortSignal));
    expect(view.result.current.state.selectedIds).toEqual([]);
    expect(client.getQueryData(monitorQueryKeys.detail(7))).toEqual(pausedDetail);
  });

  it('publishes available detail proof when another bulk target is unavailable', async () => {
    const pausedDetail = detailWithStatus(0);
    api.loadMonitorDetail.mockImplementation((id: number) =>
      id === 7 ? Promise.resolve(pausedDetail) : Promise.reject(new ApiMessageError('offline', { status: 503 }))
    );
    api.mutateMonitors.mockResolvedValue(undefined);
    const client = testQueryClient();
    client.setQueryData(monitorQueryKeys.detail(7), detailWithStatus(1));
    client.setQueryData(monitorQueryKeys.detail(8), {
      ...detailWithStatus(1),
      monitor: { ...detailWithStatus(1).monitor, id: 8 }
    });
    const view = renderHook(() => useMonitorListController(), { wrapper: wrapper(['/monitors'], 0, client) });
    await waitFor(() => expect(view.result.current.state.monitors.kind).toBe('ready'));

    await act(() => view.result.current.actions.run('pause', [7, 8]));

    expect(client.getQueryData(monitorQueryKeys.detail(7))).toEqual(pausedDetail);
    expect(client.getQueryData(monitorQueryKeys.detail(8))).toMatchObject({ monitor: { id: 8, status: 1 } });
  });

  it('accepts delete only when exact detail is canonically missing', async () => {
    api.loadMonitorDetail.mockRejectedValue(new ApiMessageError('missing', { status: 200, code: 3 }));
    api.mutateMonitors.mockResolvedValue(undefined);
    api.loadMonitors.mockResolvedValueOnce(initialMonitorPage).mockResolvedValueOnce({
      content: [],
      totalElements: 0
    });
    const client = testQueryClient();
    client.setQueryData(monitorQueryKeys.detail(7), detailWithStatus(1));
    const view = renderHook(() => useMonitorListController(), { wrapper: wrapper(['/monitors'], 0, client) });
    await waitFor(() => expect(view.result.current.state.monitors.kind).toBe('ready'));
    act(() => view.result.current.actions.selectIds([7]));

    await act(() => view.result.current.actions.run('delete', [7]));

    expect(view.result.current.state.selectedIds).toEqual([]);
    expect(client.getQueryData(monitorQueryKeys.detail(7))).toBeUndefined();
    expect(api.deleteMonitorGrafanaDashboards).toHaveBeenCalledWith([7], expect.any(AbortSignal));
  });

  it('keeps a committed monitor delete when Grafana cleanup is unavailable', async () => {
    api.loadMonitorDetail.mockRejectedValue(new ApiMessageError('missing', { status: 200, code: 3 }));
    api.deleteMonitorGrafanaDashboards.mockResolvedValue(true);
    api.mutateMonitors.mockResolvedValue(undefined);
    api.loadMonitors.mockResolvedValueOnce(initialMonitorPage).mockResolvedValueOnce({
      content: [],
      totalElements: 0
    });
    const view = renderHook(() => useMonitorListController(), { wrapper: wrapper(['/monitors'], 0) });
    await waitFor(() => expect(view.result.current.state.monitors.kind).toBe('ready'));
    act(() => view.result.current.actions.selectIds([7]));

    await act(() => view.result.current.actions.run('delete', [7]));

    expect(view.result.current.state.selectedIds).toEqual([]);
    expect(api.loadMonitors).toHaveBeenCalledTimes(2);
  });

  it('returns to the last populated page after deleting the final row on the current page', async () => {
    api.loadMonitorDetail.mockRejectedValue(new ApiMessageError('missing', { status: 200, code: 3 }));
    api.mutateMonitors.mockResolvedValue(undefined);
    api.loadMonitors
      .mockResolvedValueOnce({
        content: [initialMonitorPage.content[0]],
        totalElements: 11,
        totalPages: 2,
        number: 1,
        size: 10
      })
      .mockResolvedValueOnce({
        content: [],
        totalElements: 10,
        totalPages: 1,
        number: 1,
        size: 10
      })
      .mockResolvedValueOnce({
        content: [{ ...initialMonitorPage.content[0], id: 8 }],
        totalElements: 10,
        totalPages: 1,
        number: 0,
        size: 10
      });
    const view = renderHook(
      () => ({
        controller: useMonitorListController(),
        location: useLocation()
      }),
      { wrapper: wrapper(['/monitors?pageIndex=1&pageSize=10'], 0) }
    );
    await waitFor(() => expect(view.result.current.controller.state.monitors.kind).toBe('ready'));

    await act(() => view.result.current.controller.actions.run('delete', [7]));

    await waitFor(() => expect(view.result.current.location.search).toContain('pageIndex=0'));
    expect(api.loadMonitors).toHaveBeenLastCalledWith(
      expect.objectContaining({ pageIndex: 0, pageSize: 10 }),
      expect.any(AbortSignal)
    );
  });

  it('does not delete a Grafana dashboard for non-delete monitor commands', async () => {
    api.mutateMonitors.mockResolvedValue(undefined);
    const view = renderHook(() => useMonitorListController(), { wrapper: wrapper(['/monitors'], 0) });
    await waitFor(() => expect(view.result.current.state.monitors.kind).toBe('ready'));

    await act(() => view.result.current.actions.run('enable', [7]));

    expect(api.deleteMonitorGrafanaDashboards).not.toHaveBeenCalled();
  });

  it.each([
    ['still present', undefined],
    ['storage unavailable', new ApiMessageError('offline', { status: 503 })]
  ] as const)('keeps an acknowledged delete committed when exact detail is %s', async (_label, failure) => {
    if (failure) api.loadMonitorDetail.mockRejectedValue(failure);
    api.mutateMonitors.mockResolvedValue(undefined);
    const view = renderHook(() => useMonitorListController(), { wrapper: wrapper(['/monitors'], 0) });
    await waitFor(() => expect(view.result.current.state.monitors.kind).toBe('ready'));
    act(() => view.result.current.actions.selectIds([7]));

    await act(() => view.result.current.actions.run('delete', [7]));

    expect(view.result.current.state.selectedIds).toEqual([]);
    expect(api.loadMonitors).toHaveBeenCalledTimes(2);
  });

  it('retains selection and skips proof when the mutation write is rejected', async () => {
    api.mutateMonitors.mockRejectedValue(new Error('write rejected'));
    const view = renderHook(() => useMonitorListController(), { wrapper: wrapper(['/monitors'], 0) });
    await waitFor(() => expect(view.result.current.state.monitors.kind).toBe('ready'));
    act(() => view.result.current.actions.selectIds([7]));

    await act(() => view.result.current.actions.run('delete', [7]));

    expect(api.loadMonitorDetail).not.toHaveBeenCalled();
    expect(view.result.current.state.selectedIds).toEqual([7]);
    expect(api.loadMonitors).toHaveBeenCalledTimes(1);
  });

  it('uses the transactional copy acknowledgement and then refreshes the list', async () => {
    api.mutateMonitors.mockResolvedValue(undefined);
    const view = renderHook(() => useMonitorListController(), { wrapper: wrapper(['/monitors'], 0) });
    await waitFor(() => expect(view.result.current.state.monitors.kind).toBe('ready'));
    act(() => view.result.current.actions.selectIds([7]));

    await act(() => view.result.current.actions.run('copy', [7]));

    expect(api.loadMonitorDetail).not.toHaveBeenCalled();
    expect(api.loadMonitors).toHaveBeenCalledTimes(2);
    expect(view.result.current.state.selectedIds).toEqual([]);
  });

  it('locks same-tick duplicate mutations before React publishes busy state', async () => {
    const mutation = deferred<void>();
    api.mutateMonitors.mockReturnValue(mutation.promise);
    const view = renderHook(() => useMonitorListController(), { wrapper: wrapper(['/monitors'], 0) });
    await waitFor(() => expect(view.result.current.state.monitors.kind).toBe('ready'));

    let first!: Promise<void>;
    let second!: Promise<void>;
    act(() => {
      first = view.result.current.actions.run('enable', [7]);
      second = view.result.current.actions.run('enable', [7]);
    });

    expect(api.mutateMonitors).toHaveBeenCalledTimes(1);
    mutation.resolve();
    await act(() => Promise.all([first, second]));
  });

  it('preserves selections made after an operation captured its target ids', async () => {
    const mutation = deferred<void>();
    const pageWithTwoRows = {
      content: [...initialMonitorPage.content, { id: 8, name: 'second', app: 'website', instance: 'one', status: 1 }],
      totalElements: 2
    };
    api.loadMonitors.mockResolvedValue(pageWithTwoRows);
    api.mutateMonitors.mockReturnValue(mutation.promise);
    const view = renderHook(() => useMonitorListController(), { wrapper: wrapper(['/monitors'], 0) });
    await waitFor(() => expect(view.result.current.state.monitors.kind).toBe('ready'));
    act(() => view.result.current.actions.selectIds([7]));
    let operation!: Promise<void>;
    act(() => {
      operation = view.result.current.actions.run('enable', [7]);
    });
    await waitFor(() => expect(view.result.current.state.operating).toBe(true));

    act(() => view.result.current.actions.selectIds([8]));
    mutation.resolve();
    await act(() => operation);

    expect(view.result.current.state.selectedIds).toEqual([8]);
  });

  it('does not reread an abandoned list after unmount', async () => {
    const mutation = deferred<void>();
    api.mutateMonitors.mockReturnValue(mutation.promise);
    const view = renderHook(() => useMonitorListController(), { wrapper: wrapper(['/monitors'], 0) });
    await waitFor(() => expect(view.result.current.state.monitors.kind).toBe('ready'));
    let operation!: Promise<void>;
    act(() => {
      operation = view.result.current.actions.run('enable', [7]);
    });
    await waitFor(() => expect(api.mutateMonitors).toHaveBeenCalledTimes(1));

    view.unmount();
    mutation.resolve();

    await expect(operation).resolves.toBeUndefined();
    expect(api.loadMonitors).toHaveBeenCalledTimes(1);
  });

  it('retires a mutation when navigation changes the list query scope', async () => {
    const mutation = deferred<void>();
    api.mutateMonitors.mockReturnValue(mutation.promise);
    const view = renderHook(() => ({ controller: useMonitorListController(), navigate: useNavigate() }), {
      wrapper: wrapper(['/monitors?search=one'], 0)
    });
    await waitFor(() => expect(view.result.current.controller.state.monitors.kind).toBe('ready'));
    let operation!: Promise<void>;
    act(() => {
      operation = view.result.current.controller.actions.run('enable', [7]);
    });
    await waitFor(() => expect(api.mutateMonitors).toHaveBeenCalledTimes(1));

    act(() => {
      void view.result.current.navigate('/monitors?search=two');
    });
    await waitFor(() => expect(api.loadMonitors).toHaveBeenCalledTimes(2));
    mutation.resolve();

    await expect(operation).resolves.toBeUndefined();
    expect(api.loadMonitors).toHaveBeenCalledTimes(2);
    expect(view.result.current.controller.state.operating).toBe(false);
  });

  it('retires the old list owner before later layout work can complete its mutation', async () => {
    const mutation = deferred<void>();
    api.mutateMonitors.mockReturnValue(mutation.promise);
    const view = renderHook(
      () => {
        const controller = useMonitorListController();
        const navigate = useNavigate();
        const location = useLocation();
        useLayoutEffect(() => {
          if (location.search === '?search=two') mutation.resolve();
        }, [location.search]);
        return { controller, navigate };
      },
      { wrapper: wrapper(['/monitors?search=one'], 0) }
    );
    await waitFor(() => expect(view.result.current.controller.state.monitors.kind).toBe('ready'));
    let operation!: Promise<void>;
    act(() => {
      operation = view.result.current.controller.actions.run('enable', [7]);
    });
    await waitFor(() => expect(api.mutateMonitors).toHaveBeenCalledTimes(1));

    await act(async () => view.result.current.navigate('/monitors?search=two'));
    await expect(operation).resolves.toBeUndefined();

    expect(api.loadMonitorDetail).not.toHaveBeenCalled();
  });

  it('does not revive stale busy state after an ABA query change', async () => {
    const mutation = deferred<void>();
    api.mutateMonitors.mockReturnValue(mutation.promise);
    const view = renderHook(() => ({ controller: useMonitorListController(), navigate: useNavigate() }), {
      wrapper: wrapper(['/monitors?search=one'], 0)
    });
    await waitFor(() => expect(view.result.current.controller.state.monitors.kind).toBe('ready'));
    let operation!: Promise<void>;
    act(() => {
      operation = view.result.current.controller.actions.run('enable', [7]);
    });
    await waitFor(() => expect(view.result.current.controller.state.operating).toBe(true));

    act(() => void view.result.current.navigate('/monitors?search=two'));
    await waitFor(() => expect(view.result.current.controller.state.operating).toBe(false));
    act(() => void view.result.current.navigate('/monitors?search=one'));

    await waitFor(() => expect(view.result.current.controller.state.operating).toBe(false));
    mutation.resolve();
    await expect(operation).resolves.toBeUndefined();
  });
});

function wrapper(entries: string[], initialIndex: number, client = testQueryClient()) {
  return ({ children }: PropsWithChildren) => (
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={entries} initialIndex={initialIndex}>
          <App>{children}</App>
        </MemoryRouter>
      </QueryClientProvider>
    </I18nextProvider>
  );
}

function testQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
}

function detailWithStatus(status: number) {
  return {
    monitor: { id: 7, name: 'epoch', app: 'website', instance: 'zero', status },
    params: [],
    collector: null,
    grafanaDashboard: null,
    metrics: []
  };
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>(release => {
    resolve = release;
  });
  return { promise, resolve };
}
