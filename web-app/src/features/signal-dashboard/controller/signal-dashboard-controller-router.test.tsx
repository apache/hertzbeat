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
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import { SessionContext } from '@/core/auth/session-context';
import { initializeI18n, loadLocale, i18n } from '@/core/i18n/i18n';
import { GlobalTimeProvider, RouteTimeProvider } from '@/shared/time';
import fixture from '@/platform/perses/model/fixtures/supported-dashboard.json';
import { parseHertzBeatDashboardDocument } from '@/platform/perses';
import { useSignalDashboardController } from './use-signal-dashboard-controller';

const api = vi.hoisted(() => ({
  loadSignalDashboards: vi.fn(),
  saveSignalDashboard: vi.fn(),
  deleteSignalDashboard: vi.fn()
}));
vi.mock('../api/signal-dashboard-api', () => api);
const routers: ReturnType<typeof createMemoryRouter>[] = [];
const original = {
  dashboardKey: fixture.metadata.name,
  title: fixture.spec.display.name,
  version: 'hertzbeat-perses-v1',
  revision: 0,
  document: fixture
};
const imported = parseHertzBeatDashboardDocument(fixture);
imported.spec.panels.logs!.spec.queries[0].spec.plugin.spec.query = {
  signal: 'logs',
  queryKind: 'table',
  search: 'Changed'
};
const window = { from: 1788632760000, to: 1788632820000 };
function Harness() {
  const { state, actions } = useSignalDashboardController();
  return (
    <>
      <output data-testid="state">
        {JSON.stringify({
          preview: state.preview,
          document: state.document,
          incoming: !!state.incoming,
          busy: state.busy,
          error: state.error,
          window: state.timeWindow
        })}
      </output>
      <button onClick={() => actions.begin('new')}>New</button>
      <button
        onClick={() => {
          if (state.document)
            actions.update({ ...state.document, spec: { ...state.document.spec, timezone: 'Invalid/Zone' } });
        }}
      >
        Invalid timezone
      </button>
      <button onClick={() => actions.importDocument(JSON.stringify(imported), false)}>Import</button>
      <button onClick={() => actions.receive()}>Receive</button>
      <button onClick={() => actions.controls({ ...state.controls, variables: { serviceName: '' } })}>
        Empty service
      </button>
      <button onClick={actions.query}>Query</button>
      <button onClick={() => void actions.save()}>Save</button>
      <button onClick={actions.cancel}>Cancel</button>
    </>
  );
}
function mount(search = '', state: unknown = null) {
  const router = createMemoryRouter(
    [
      {
        path: '/observability/dashboards',
        element: (
          <GlobalTimeProvider>
            <RouteTimeProvider policy="route_owned" canonicalizeInvalidExact={false}>
              <Harness />
            </RouteTimeProvider>
          </GlobalTimeProvider>
        )
      }
    ],
    { initialEntries: [{ pathname: '/observability/dashboards', search, state }] }
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
  return router;
}
function state(): {
  preview?: unknown;
  document?: unknown;
  incoming: boolean;
  busy: boolean;
  error?: string;
  window?: unknown;
} {
  return JSON.parse(screen.getByTestId('state').textContent) as {
    preview?: unknown;
    document?: unknown;
    incoming: boolean;
    busy: boolean;
    error?: string;
    window?: unknown;
  };
}
beforeAll(async () => {
  await initializeI18n();
  await loadLocale('en-US');
});
afterEach(() => {
  cleanup();
  routers.splice(0).forEach(router => router.dispose());
  vi.resetAllMocks();
});
it('suppresses previous evidence after importing a different query with the same panel IDs', async () => {
  api.loadSignalDashboards.mockResolvedValue([original]);
  mount('?dashboard=' + fixture.metadata.name);
  await waitFor(() => expect(state().preview).toEqual(fixture));
  fireEvent.click(screen.getByText('Import'));
  expect(state().document).toEqual(imported);
  expect(state().preview).toBeUndefined();
});
it('consumes an incoming panel once and keeps the committed exact window and empty override through first Save', async () => {
  api.loadSignalDashboards.mockResolvedValue([]);
  api.saveSignalDashboard.mockImplementation(document =>
    Promise.resolve({
      ...original,
      dashboardKey: document.metadata.name,
      title: document.spec.display.name,
      document
    })
  );
  const document = parseHertzBeatDashboardDocument(fixture);
  document.spec.panels = { logs: document.spec.panels.logs! };
  document.spec.layouts[0].spec.items = [{ x: 0, y: 0, width: 24, height: 8, content: { $ref: '#/spec/panels/logs' } }];
  const router = mount('', {
    dashboardPanelHandoff: {
      version: 1,
      document,
      timeWindow: window,
      returnTo: `/explore?signal=logs&start=${window.from}&end=${window.to}&timeZone=UTC`
    }
  });
  await waitFor(() => expect(state().incoming).toBe(true));
  await waitFor(() => expect(router.state.location.state).toBeNull());
  fireEvent.click(screen.getByText('Receive'));
  await waitFor(() => expect(state().window).toEqual(window));
  fireEvent.click(screen.getByText('Empty service'));
  fireEvent.click(screen.getByText('Query'));
  await waitFor(() => expect(new URLSearchParams(router.state.location.search).get('varServiceName')).toBe(''));
  fireEvent.click(screen.getByText('Save'));
  await waitFor(() => expect(api.saveSignalDashboard).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(new URLSearchParams(router.state.location.search).has('dashboard')).toBe(true));
  const params = new URLSearchParams(router.state.location.search);
  expect(params.get('start')).toBe(String(window.from));
  expect(params.get('end')).toBe(String(window.to));
  expect(params.get('timeZone')).toBe('UTC');
  expect(params.get('varServiceName')).toBe('');
  expect(params.has('duration')).toBe(false);
  expect(state().window).toEqual(window);
  expect(state().incoming).toBe(false);
});

it('keeps an invalid new document local without using its invalid timezone as the applied view', async () => {
  api.loadSignalDashboards.mockResolvedValue([original]);
  mount('?dashboard=' + fixture.metadata.name);
  await waitFor(() => expect(state().preview).toEqual(fixture));
  fireEvent.click(screen.getByText('New'));
  fireEvent.click(screen.getByText('Invalid timezone'));
  expect(state().document).toMatchObject({ spec: { timezone: 'Invalid/Zone' } });
  expect(state().preview).toBeUndefined();
  fireEvent.click(screen.getByText('Save'));
  await waitFor(() => expect(state().error).toBe('invalidDocument'));
  expect(api.saveSignalDashboard).not.toHaveBeenCalled();
});
