/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, expect, it, vi } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { GlobalTimeProvider, RouteTimeProvider } from '@/shared/time';
import { SessionContext } from '@/core/auth/session-context';
import { parseHertzBeatDashboardDocument } from '@/platform/perses';
import fixture from '@/platform/perses/model/fixtures/supported-dashboard.json';
import { useSignalDashboardController } from './use-signal-dashboard-controller';
import { DashboardPanelRuntime } from '../runtime/dashboard-panel-runtime';
const api = vi.hoisted(() => ({
  loadSignalDashboards: vi.fn(),
  saveSignalDashboard: vi.fn(),
  deleteSignalDashboard: vi.fn()
}));
const request = vi.hoisted(() => vi.fn());
vi.mock('../api/signal-dashboard-api', () => api);
vi.mock('@/platform/perses', async original => ({
  ...(await original<typeof import('@/platform/perses')>()),
  queryHertzBeatData: request
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
const messages = {
  loading: 'Loading',
  inactive: 'Inactive',
  empty: 'Empty',
  truncated: 'Truncated',
  truncationUnknown: 'Unknown',
  runtimeError: 'Failed',
  failures: {
    'perses.query.invalid': 'Invalid',
    'perses.query.permission': 'Permission',
    'perses.query.overloaded': 'Overloaded',
    'perses.query.unavailable': 'Unavailable',
    'perses.query.contract': 'Contract'
  }
};
const routers: ReturnType<typeof createMemoryRouter>[] = [];
afterEach(() => {
  cleanup();
  routers.splice(0).forEach(router => router.dispose());
});
it('rejects invalid staged variables before refreshing the old scope', async () => {
  const document = parseHertzBeatDashboardDocument(fixture);
  api.loadSignalDashboards.mockResolvedValue([
    {
      dashboardKey: document.metadata.name,
      title: document.spec.display.name,
      document,
      version: 'hertzbeat-perses-v1',
      revision: 0
    }
  ]);
  request.mockResolvedValue({ state: 'empty', truncated: false });
  let current!: ReturnType<typeof useSignalDashboardController>;
  function Harness() {
    current = useSignalDashboardController();
    const { state } = current;
    return state.preview && state.timeWindow ? (
      <DashboardPanelRuntime
        panelId="jvm"
        panel={state.preview.spec.panels.jvm!}
        variables={state.preview.spec.variables}
        variableValues={state.variables}
        timeWindow={state.timeWindow}
        refreshRevision={state.refreshRevision}
        enabled
        messages={messages}
      />
    ) : null;
  }
  const router = createMemoryRouter(
    [
      {
        path: '/observability/dashboards',
        element: (
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
            <QueryClientProvider client={new QueryClient()}>
              <GlobalTimeProvider>
                <RouteTimeProvider policy="route_owned" canonicalizeInvalidExact={false}>
                  <Harness />
                </RouteTimeProvider>
              </GlobalTimeProvider>
            </QueryClientProvider>
          </SessionContext.Provider>
        )
      }
    ],
    {
      initialEntries: [
        '/observability/dashboards?dashboard=' +
          document.metadata.name +
          '&start=1780000000000&end=1780000060000&timeZone=UTC'
      ]
    }
  );
  routers.push(router);
  render(<RouterProvider router={router} />);
  await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
  act(() => current.actions.controls({ ...current.state.controls, variables: { serviceName: ' checkout' } }));
  await act(async () => {
    current.actions.query();
    await Promise.resolve();
  });
  expect(current.state.error).toBe('invalidDocument');
  expect(request).toHaveBeenCalledTimes(1);
});
