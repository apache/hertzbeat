/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { App, ConfigProvider } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createMemoryRouter, Link, Outlet, RouterProvider } from 'react-router-dom';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { SessionContext } from '@/core/auth/session-context';
import { initializeI18n, loadLocale, i18n } from '@/core/i18n/i18n';
import { GlobalTimeProvider, RouteTimeProvider } from '@/shared/time';
import fixture from '@/platform/perses/model/fixtures/supported-dashboard.json';
import { SignalDashboardsPage } from '../pages/signal-dashboards-page';

const api = vi.hoisted(() => ({
  loadSignalDashboards: vi.fn(),
  saveSignalDashboard: vi.fn(),
  deleteSignalDashboard: vi.fn()
}));
vi.mock('../api/signal-dashboard-api', () => api);
vi.mock('../runtime/dashboard-panel-runtime', () => ({ DashboardPanelRuntime: () => null }));
const routers: ReturnType<typeof createMemoryRouter>[] = [];
const path = '/observability/dashboards?dashboard=' + fixture.metadata.name;
const record = {
  dashboardKey: fixture.metadata.name,
  title: fixture.spec.display.name,
  version: 'hertzbeat-perses-v1',
  revision: 0,
  document: fixture
};

beforeAll(async () => {
  await initializeI18n();
  await loadLocale('en-US');
});
afterEach(() => {
  cleanup();
  routers.splice(0).forEach(router => router.dispose());
  vi.resetAllMocks();
});

function mount(initialEntries = ['/observability/services', path], initialIndex = 1) {
  api.loadSignalDashboards.mockResolvedValue([record]);
  const router = createMemoryRouter(
    [
      {
        element: (
          <>
            <Link to="/observability/services">Services</Link>
            <Outlet />
          </>
        ),
        children: [
          {
            path: '/observability/dashboards',
            element: (
              <GlobalTimeProvider>
                <RouteTimeProvider policy="route_owned">
                  <SignalDashboardsPage />
                </RouteTimeProvider>
              </GlobalTimeProvider>
            )
          },
          { path: '/observability/services', element: <h1>Services route</h1> },
          { path: '/explore', element: <h1>Explore route</h1> }
        ]
      }
    ],
    { initialEntries, initialIndex }
  );
  routers.push(router);
  render(
    <I18nextProvider i18n={i18n}>
      <ConfigProvider theme={{ token: { motion: false } }}>
        <App>
          <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
            <SessionContext.Provider
              value={{
                session: {
                  authenticated: true,
                  username: 'Operator',
                  roles: ['ADMIN'],
                  workspaceId: 'default',
                  expiresAt: null
                },
                loading: false,
                retry: vi.fn()
              }}
            >
              <RouterProvider router={router} />
            </SessionContext.Provider>
          </QueryClientProvider>
        </App>
      </ConfigProvider>
    </I18nextProvider>
  );
  return router;
}
async function edit() {
  fireEvent.click(await screen.findByRole('button', { name: i18n.t('signalDashboard.edit') }));
}
function changeTitle() {
  fireEvent.change(screen.getByRole('textbox', { name: i18n.t('signalDashboard.name') }), {
    target: { value: 'Audit unsaved' }
  });
}
async function choose(key: 'cancel' | 'discardChanges') {
  const dialog = await screen.findByRole('dialog');
  fireEvent.click(within(dialog).getByRole('button', { name: i18n.t('common.' + key) }));
  await waitFor(() =>
    expect([...routers.at(-1)!.state.blockers.values()].every(blocker => blocker.state !== 'blocked')).toBe(true)
  );
}

it('blocks sidebar leaving, keeps the draft on Cancel, and discards once without writing', async () => {
  const router = mount();
  await edit();
  changeTitle();
  fireEvent.click(screen.getByRole('link', { name: 'Services' }));
  expect(await screen.findByRole('dialog')).toHaveTextContent(i18n.t('common.unsavedChangesConfirm'));
  expect(router.state.location.pathname).toBe('/observability/dashboards');
  await choose('cancel');
  expect(screen.getByRole('textbox', { name: i18n.t('signalDashboard.name') })).toHaveValue('Audit unsaved');
  fireEvent.click(screen.getByRole('link', { name: 'Services' }));
  await choose('discardChanges');
  await screen.findByRole('heading', { name: 'Services route' });
  expect(api.saveSignalDashboard).not.toHaveBeenCalled();
  await act(() => router.navigate(-1));
  await screen.findByRole('button', { name: i18n.t('signalDashboard.edit') });
  expect(screen.getByRole('heading', { name: fixture.spec.display.name })).toBeVisible();
});

it.each([-1, 1])('protects a dirty panel title on history navigation %s', async delta => {
  const entries = delta === -1 ? ['/observability/services', path] : [path, '/observability/services'];
  const router = mount(entries, delta === -1 ? 1 : 0);
  await edit();
  fireEvent.change(screen.getByRole('textbox', { name: i18n.t('signalDashboard.panelTitle') }), {
    target: { value: 'Unsaved panel' }
  });
  await act(() => router.navigate(delta));
  await choose('cancel');
  expect(router.state.location.pathname).toBe('/observability/dashboards');
  expect(screen.getByRole('textbox', { name: i18n.t('signalDashboard.panelTitle') })).toHaveValue('Unsaved panel');
  await act(() => router.navigate(delta));
  await choose('discardChanges');
  await screen.findByRole('heading', { name: 'Services route' });
});

it('protects Open Explore but allows Query without abandoning the draft', async () => {
  const router = mount();
  await edit();
  changeTitle();
  fireEvent.click(screen.getByRole('button', { name: i18n.t('signalDashboard.query') }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  fireEvent.click(screen.getAllByRole('link', { name: i18n.t('signalDashboard.openExplore') })[0]!);
  await choose('cancel');
  expect(router.state.location.pathname).toBe('/observability/dashboards');
  fireEvent.click(screen.getAllByRole('link', { name: i18n.t('signalDashboard.openExplore') })[0]!);
  await choose('discardChanges');
  await screen.findByRole('heading', { name: 'Explore route' });
});

it('does not block unchanged edits, explicit Cancel, or successfully saved edits', async () => {
  const router = mount();
  await edit();
  fireEvent.click(screen.getByRole('link', { name: 'Services' }));
  await screen.findByRole('heading', { name: 'Services route' });
  await act(() => router.navigate(path));
  await edit();
  changeTitle();
  fireEvent.click(screen.getByRole('button', { name: i18n.t('common.cancel') }));
  fireEvent.click(screen.getByRole('link', { name: 'Services' }));
  await screen.findByRole('heading', { name: 'Services route' });
  await act(() => router.navigate(path));
  await edit();
  changeTitle();
  api.saveSignalDashboard.mockImplementation(document =>
    Promise.resolve({ ...record, title: document.spec.display.name, document, revision: 1 })
  );
  fireEvent.click(screen.getByRole('button', { name: i18n.t('common.save') }));
  await screen.findByRole('button', { name: i18n.t('signalDashboard.edit') });
  fireEvent.click(screen.getByRole('link', { name: 'Services' }));
  await screen.findByRole('heading', { name: 'Services route' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(api.saveSignalDashboard).toHaveBeenCalledTimes(1);
  await waitFor(() => expect(router.state.location.pathname).toBe('/observability/services'));
});

it('keeps protection after a failed save and removes it after reverting edits', async () => {
  const router = mount();
  await edit();
  changeTitle();
  api.saveSignalDashboard.mockRejectedValue(new Error('Offline'));
  fireEvent.click(screen.getByRole('button', { name: i18n.t('common.save') }));
  await screen.findByRole('alert');
  fireEvent.click(screen.getByRole('link', { name: 'Services' }));
  await choose('cancel');
  expect(screen.getByRole('textbox', { name: i18n.t('signalDashboard.name') })).toHaveValue('Audit unsaved');
  fireEvent.change(screen.getByRole('textbox', { name: i18n.t('signalDashboard.name') }), {
    target: { value: fixture.spec.display.name }
  });
  fireEvent.click(screen.getByRole('link', { name: 'Services' }));
  await screen.findByRole('heading', { name: 'Services route' });
  expect(router.state.location.pathname).toBe('/observability/services');
});

it('allows successful new-dashboard identity navigation and guards document unload only while dirty', async () => {
  const router = mount();
  fireEvent.click(await screen.findByRole('button', { name: i18n.t('signalDashboard.new') }));
  const unload = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(unload);
  expect(unload.defaultPrevented).toBe(true);
  api.saveSignalDashboard.mockImplementation(document =>
    Promise.resolve({ ...record, dashboardKey: document.metadata.name, document, title: document.spec.display.name })
  );
  fireEvent.click(screen.getByRole('button', { name: i18n.t('common.save') }));
  await screen.findByRole('button', { name: i18n.t('signalDashboard.edit') });
  expect(new URLSearchParams(router.state.location.search).get('dashboard')).not.toBe(fixture.metadata.name);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  const savedUnload = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(savedUnload);
  expect(savedUnload.defaultPrevented).toBe(false);
});

it('releases a pending leave when an already requested save succeeds', async () => {
  mount();
  await edit();
  changeTitle();
  let finish!: () => void;
  api.saveSignalDashboard.mockImplementation(
    document =>
      new Promise(resolve => {
        finish = () => resolve({ ...record, document, title: document.spec.display.name, revision: 1 });
      })
  );
  fireEvent.click(screen.getByRole('button', { name: i18n.t('common.save') }));
  fireEvent.click(screen.getByRole('link', { name: 'Services' }));
  await screen.findByRole('dialog');
  act(() => finish());
  await screen.findByRole('heading', { name: 'Services route' });
  expect(api.saveSignalDashboard).toHaveBeenCalledTimes(1);
});

it('cleans up unload listeners and router blockers after dirty leave and remount', async () => {
  const registered = vi.spyOn(window, 'addEventListener');
  const removed = vi.spyOn(window, 'removeEventListener');
  const unload = () => {
    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);
    return event.defaultPrevented;
  };
  try {
    const router = mount();
    await edit();
    expect(unload()).toBe(false);
    changeTitle();
    expect(unload()).toBe(true);
    fireEvent.click(screen.getByRole('link', { name: 'Services' }));
    await choose('discardChanges');
    await screen.findByRole('heading', { name: 'Services route' });
    expect(unload()).toBe(false);
    expect(router.state.blockers.size).toBe(0);
    const callbacks = registered.mock.calls.filter(([type]) => type === 'beforeunload').map(([, listener]) => listener);
    expect(callbacks.length).toBeGreaterThan(0);
    callbacks.forEach(callback =>
      expect(removed.mock.calls.some(([type, listener]) => type === 'beforeunload' && listener === callback)).toBe(true)
    );
    await act(() => router.navigate(path));
    await edit();
    changeTitle();
    expect(unload()).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: i18n.t('common.cancel') }));
    expect(unload()).toBe(false);
    cleanup();
    expect(unload()).toBe(false);
    expect(router.state.blockers.size).toBe(0);
  } finally {
    registered.mockRestore();
    removed.mockRestore();
  }
});
