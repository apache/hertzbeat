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
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { SessionContext } from '@/core/auth/session-context';
import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';

const api = vi.hoisted(() => ({
  deleteMonitorGrafanaDashboard: vi.fn(),
  loadFavoriteMetrics: vi.fn(),
  loadHistoryMetric: vi.fn(),
  loadMonitorApps: vi.fn(),
  loadMonitorDetail: vi.fn(),
  loadMonitorMetricCatalog: vi.fn(),
  loadMonitors: vi.fn(),
  loadRealtimeMetric: vi.fn()
}));
vi.mock('../api/monitor-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/monitor-api')>()),
  ...api
}));

import { MonitorDetailPage } from './monitor-detail-page';
import { MonitorListPage } from './monitor-list-page';

const monitor = {
  id: 7,
  name: 'cached-checkout',
  app: 'website',
  instance: 'prod',
  status: 1,
  type: 0,
  scrape: 'static' as const
};
const detail = {
  monitor,
  params: [],
  collector: null,
  grafanaDashboard: {
    monitorId: 7,
    folderUid: null,
    slug: null,
    status: null,
    uid: 'cached-dashboard',
    url: 'https://grafana.example/d/cached-dashboard',
    version: 1,
    enabled: true,
    template: null
  },
  metrics: [{ name: 'summary', fields: [{ type: 0, field: 'value', unit: 'ms', label: false }] }]
};
const page = {
  content: [monitor],
  totalElements: 1,
  totalPages: 1,
  number: 0,
  size: 10
};

describe('monitor read page composition', () => {
  beforeAll(async () => {
    Object.defineProperty(globalThis, 'ResizeObserver', { value: ResizeObserverStub, configurable: true });
    await initializeI18n();
    await loadLocale('en-US');
  });

  beforeEach(() => {
    vi.clearAllMocks();
    api.loadMonitorApps.mockResolvedValue([]);
    api.loadMonitors.mockResolvedValue(page);
    api.loadMonitorDetail.mockResolvedValue(detail);
    api.loadMonitorMetricCatalog.mockResolvedValue({ metrics: detail.metrics });
    api.loadFavoriteMetrics.mockResolvedValue([]);
    api.loadRealtimeMetric.mockResolvedValue({ time: null, fields: [], valueRows: [] });
    api.loadHistoryMetric.mockResolvedValue({ values: {} });
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it.each([
    [[], 'list'],
    [[], 'detail'],
    [['OWNER'], 'list'],
    [['OWNER'], 'detail']
  ] as const)('keeps roles %j outside the %s workspace and hides cached assets', async (roles, pageKind) => {
    const view = renderPage(pageKind, [...roles]);

    expect(screen.getByText(i18n.t('monitor.permission.title'))).toBeInTheDocument();
    expect(screen.getByText(i18n.t('monitor.permission.description'))).toBeInTheDocument();
    expect(screen.queryByText('cached-checkout')).not.toBeInTheDocument();
    expect(screen.queryByTitle(i18n.t('monitor.grafana.title'))).not.toBeInTheDocument();
    expect(api.loadMonitorApps).not.toHaveBeenCalled();
    expect(api.loadMonitors).not.toHaveBeenCalled();
    expect(api.loadMonitorDetail).not.toHaveBeenCalled();
    expect(api.loadMonitorMetricCatalog).not.toHaveBeenCalled();
    expect(api.loadFavoriteMetrics).not.toHaveBeenCalled();
    expect(api.loadRealtimeMetric).not.toHaveBeenCalled();
    expect(api.loadHistoryMetric).not.toHaveBeenCalled();
    expect(api.deleteMonitorGrafanaDashboard).not.toHaveBeenCalled();

    view.unmount();
  });

  it.each(['ADMIN', 'USER', 'GUEST'])('preserves list and detail reads for %s', async role => {
    const list = renderPage('list', [role]);
    await waitFor(() => expect(screen.getByText('cached-checkout')).toBeInTheDocument());
    expect(api.loadMonitors).toHaveBeenCalledOnce();
    expect(api.loadMonitorApps).toHaveBeenCalledOnce();
    list.unmount();
    vi.clearAllMocks();
    api.loadMonitorDetail.mockResolvedValue(detail);
    api.loadMonitorMetricCatalog.mockResolvedValue({ metrics: detail.metrics });
    api.loadFavoriteMetrics.mockResolvedValue([]);
    api.loadRealtimeMetric.mockResolvedValue({ time: null, fields: [], valueRows: [] });
    api.loadHistoryMetric.mockResolvedValue({ values: {} });

    const detailPage = renderPage('detail', [role]);
    await waitFor(() => expect(screen.getByText('cached-checkout')).toBeInTheDocument());
    expect(api.loadMonitorDetail).toHaveBeenCalledOnce();
    expect(api.loadMonitorMetricCatalog).toHaveBeenCalledOnce();
    detailPage.unmount();
  });

  it('unmounts list reads, hides cached rows, and stops manual and interval refresh on role loss', async () => {
    const clearInterval = vi.spyOn(globalThis, 'clearInterval');
    let refreshSignal!: AbortSignal;
    let resolveRefresh!: (value: typeof page) => void;
    api.loadMonitors.mockResolvedValueOnce(page).mockImplementationOnce(
      (_query, signal) =>
        new Promise(resolve => {
          refreshSignal = signal;
          resolveRefresh = resolve;
        })
    );
    const view = renderPage('list', ['ADMIN']);
    await waitFor(() => expect(screen.getByText('cached-checkout')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: i18n.t('common.refresh') }));
    await act(async () => {
      await Promise.resolve();
    });
    expect(api.loadMonitors).toHaveBeenCalledTimes(2);
    view.rerenderRoles(['OWNER']);

    expect(refreshSignal.aborted).toBe(true);
    expect(clearInterval).toHaveBeenCalled();
    expect(screen.getByText(i18n.t('monitor.permission.title'))).toBeInTheDocument();
    expect(screen.queryByText('cached-checkout')).not.toBeInTheDocument();
    await act(async () => {
      resolveRefresh({ ...page, content: [{ ...monitor, name: 'late-list' }] });
      await Promise.resolve();
    });
    expect(api.loadMonitors).toHaveBeenCalledTimes(2);
    expect(screen.queryByText('late-list')).not.toBeInTheDocument();
  });

  it('aborts detail and metric reads and hides detail/Grafana cache immediately on role loss', async () => {
    let detailRefreshSignal!: AbortSignal;
    let resolveDetailRefresh!: (value: typeof detail) => void;
    api.loadMonitorDetail.mockResolvedValueOnce(detail).mockImplementationOnce(
      (_id, signal) =>
        new Promise(resolve => {
          detailRefreshSignal = signal;
          resolveDetailRefresh = resolve;
        })
    );
    const favorites = deferred<never[]>();
    const realtime = deferred<{ time: null; fields: never[]; valueRows: never[] }>();
    const history = deferred<{ values: Record<string, never[]> }>();
    api.loadFavoriteMetrics.mockImplementation((_id, signal) => favorites.run(signal));
    api.loadRealtimeMetric.mockImplementation((_id, _metric, signal) => realtime.run(signal));
    api.loadHistoryMetric.mockImplementation((_monitor, _metric, _range, signal) => history.run(signal));
    const view = renderPage('detail', ['GUEST']);
    await waitFor(() => expect(screen.getByText('cached-checkout')).toBeInTheDocument());
    await waitFor(() => expect(api.loadRealtimeMetric).toHaveBeenCalledOnce());

    fireEvent.click(screen.getByRole('button', { name: i18n.t('common.refresh') }));
    await waitFor(() => expect(api.loadMonitorDetail).toHaveBeenCalledTimes(2));
    view.rerenderRoles(['OWNER']);

    expect(detailRefreshSignal.aborted).toBe(true);
    expect(favorites.signal.aborted).toBe(true);
    expect(realtime.signal.aborted).toBe(true);
    expect(history.signal.aborted).toBe(true);
    expect(screen.getByText(i18n.t('monitor.permission.title'))).toBeInTheDocument();
    expect(screen.queryByText('cached-checkout')).not.toBeInTheDocument();
    expect(screen.queryByTitle(i18n.t('monitor.grafana.title'))).not.toBeInTheDocument();

    await act(async () => {
      resolveDetailRefresh({ ...detail, monitor: { ...monitor, name: 'late-detail' } });
      favorites.resolve([]);
      realtime.resolve({ time: null, fields: [], valueRows: [] });
      history.resolve({ values: {} });
      await Promise.resolve();
    });
    expect(screen.queryByText('late-detail')).not.toBeInTheDocument();
  });
});

function renderPage(pageKind: 'list' | 'detail', initialRoles: string[]) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const entry = pageKind === 'list' ? '/monitors' : '/monitors/7?refresh=10';
  const rendered = render(<PageHarness pageKind={pageKind} roles={initialRoles} client={client} entry={entry} />);
  return {
    ...rendered,
    rerenderRoles: (roles: string[]) =>
      rendered.rerender(<PageHarness pageKind={pageKind} roles={roles} client={client} entry={entry} />)
  };
}

function PageHarness({
  pageKind,
  roles,
  client,
  entry
}: {
  pageKind: 'list' | 'detail';
  roles: string[];
  client: QueryClient;
  entry: string;
}) {
  return (
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[entry]}>
          <SessionContext.Provider
            value={{
              session: { authenticated: true, username: 'operator', workspaceId: null, roles, expiresAt: null },
              loading: false,
              retry: () => undefined
            }}
          >
            <App>
              <Routes>
                <Route path="/monitors" element={pageKind === 'list' ? <MonitorListPage /> : null} />
                <Route path="/monitors/:monitorId" element={pageKind === 'detail' ? <MonitorDetailPage /> : null} />
              </Routes>
            </App>
          </SessionContext.Provider>
        </MemoryRouter>
      </QueryClientProvider>
    </I18nextProvider>
  );
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let signal!: AbortSignal;
  return {
    get signal() {
      return signal;
    },
    resolve: (value: T) => resolve(value),
    run: (observedSignal: AbortSignal) =>
      new Promise<T>(settle => {
        signal = observedSignal;
        resolve = settle;
      })
  };
}

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
