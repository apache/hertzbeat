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

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';
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
const routers: ReturnType<typeof createMemoryRouter>[] = [];
beforeAll(async () => {
  await initializeI18n();
  await loadLocale('en-US');
});
afterEach(() => {
  cleanup();
  routers.splice(0).forEach(router => router.dispose());
  vi.clearAllMocks();
});

it('opens the persisted document, edits locally and cancels without any write', async () => {
  api.loadSignalDashboards.mockResolvedValue([
    {
      dashboardKey: fixture.metadata.name,
      title: fixture.spec.display.name,
      version: 'hertzbeat-perses-v1',
      revision: 0,
      document: fixture
    }
  ]);
  const router = createMemoryRouter(
    [
      {
        path: '/observability/dashboards',
        element: (
          <GlobalTimeProvider>
            <RouteTimeProvider policy="route_owned" canonicalizeInvalidExact={false}>
              <SignalDashboardsPage />
            </RouteTimeProvider>
          </GlobalTimeProvider>
        )
      }
    ],
    { initialEntries: ['/observability/dashboards?dashboard=' + fixture.metadata.name] }
  );
  routers.push(router);
  render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <SessionContext.Provider
          value={{
            session: {
              authenticated: true,
              username: 'Operator',
              workspaceId: 'default',
              expiresAt: null,
              roles: ['ADMIN']
            },
            loading: false,
            retry: () => undefined
          }}
        >
          <RouterProvider router={router} />
        </SessionContext.Provider>
      </QueryClientProvider>
    </I18nextProvider>
  );
  fireEvent.click(await screen.findByRole('button', { name: i18n.t('signalDashboard.edit') }));
  const settingsSummary = screen.getByText(i18n.t('signalDashboard.settings'));
  const settings = settingsSummary.closest('details')!;
  expect(settings).not.toHaveAttribute('open');
  expect(screen.getByRole('textbox', { name: i18n.t('signalDashboard.panelTitle') })).toBeVisible();
  expect(screen.getByLabelText(i18n.t('signalDashboard.description'))).not.toBeVisible();
  expect(api.saveSignalDashboard).not.toHaveBeenCalled();
  fireEvent.click(settingsSummary);
  expect(settings).toHaveAttribute('open');
  fireEvent.change(screen.getByRole('textbox', { name: i18n.t('signalDashboard.description') }), {
    target: { value: 'Canceled settings' }
  });
  fireEvent.click(screen.getByText(i18n.t('signalDashboard.variables')));
  expect(
    screen
      .getByRole('combobox', {
        name: i18n.t('signalDashboard.variableKind', { name: i18n.t('signalDashboard.serviceName') })
      })
      .closest('.ant-select')
  ).toBeVisible();
  fireEvent.click(settingsSummary);
  expect(settings).not.toHaveAttribute('open');
  expect(screen.getByRole('textbox', { name: i18n.t('signalDashboard.panelTitle') })).toBeVisible();
  fireEvent.change(screen.getByRole('textbox', { name: i18n.t('signalDashboard.name') }), {
    target: { value: 'Canceled title' }
  });
  fireEvent.click(
    within(screen.getByRole('heading', { name: 'Canceled title' }).closest('header')!).getByRole('button', {
      name: i18n.t('common.cancel')
    })
  );
  expect(await screen.findByText(fixture.spec.display.name)).toBeVisible();
  expect(api.saveSignalDashboard).not.toHaveBeenCalled();
  expect(api.deleteSignalDashboard).not.toHaveBeenCalled();
  expect(router.state.location.search).toContain(fixture.metadata.name);
});
