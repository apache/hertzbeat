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
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useLoginController } from '@/features/auth/use-login-controller';
import { useMonitorListController } from '@/features/monitor/controller/use-monitor-list-controller';
import { buildMonitorRoutePath, safeMonitorReturnTo } from '@/features/monitor/model/monitor-model';
import { useLabelQueryController } from '@/features/settings/label/controller/label-query-controller';
import { buildLabelMonitorPath } from '@/features/settings/label/model/label-model';

import { getAppRoute } from './route-registry';

const canonical = vi.hoisted(() => ({
  application: {
    dashboard: '/canonical-dashboard',
    login: '/canonical-login'
  },
  monitor: {
    list: '/canonical-monitors',
    create: '/canonical-monitors/new',
    detail: '/canonical-monitors/:monitorId',
    edit: '/canonical-monitors/:monitorId/edit'
  },
  labels: '/canonical-labels',
  buildMonitorListPath: vi.fn((query: { app?: string; labels?: string } = {}) => {
    const params = new URLSearchParams();
    if (query.app !== undefined) params.set('app', query.app);
    if (query.labels !== undefined) params.set('labels', query.labels);
    const search = params.toString();
    return search ? `/canonical-monitors?${search}` : '/canonical-monitors';
  }),
  buildMonitorDetailPath: vi.fn((id: number) => `/canonical-monitors/${id}`),
  buildMonitorEditPath: vi.fn((id: number) => `/canonical-monitors/${id}/edit`)
}));
const navigate = vi.hoisted(() => vi.fn());
const monitorApi = vi.hoisted(() => ({
  loadMonitorApps: vi.fn(),
  loadMonitors: vi.fn()
}));

vi.mock('@/shared/navigation/app-paths', async importOriginal => ({
  ...(await importOriginal<typeof import('@/shared/navigation/app-paths')>()),
  applicationRoutePaths: canonical.application,
  monitorRoutePaths: canonical.monitor,
  buildMonitorListPath: canonical.buildMonitorListPath,
  buildMonitorDetailPath: canonical.buildMonitorDetailPath,
  buildMonitorEditPath: canonical.buildMonitorEditPath
}));
vi.mock('@/shared/settings/settings-routes', async importOriginal => {
  const actual = await importOriginal<typeof import('@/shared/settings/settings-routes')>();
  return { ...actual, settingsPaths: { ...actual.settingsPaths, labels: canonical.labels } };
});
vi.mock('@/features/monitor/api/monitor-api', async importOriginal => ({
  ...(await importOriginal<typeof import('@/features/monitor/api/monitor-api')>()),
  ...monitorApi
}));
vi.mock('@/core/auth/session-context', () => ({
  useSession: () => ({
    loading: false,
    retry: vi.fn(),
    session: { authenticated: true },
    unavailable: false
  })
}));
vi.mock('@/core/auth/session-identity-context', () => ({ useSessionIdentityBoundary: () => vi.fn() }));
vi.mock('react-router-dom', async importOriginal => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => navigate
}));

describe('remaining route ownership', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    monitorApi.loadMonitorApps.mockResolvedValue([]);
    monitorApi.loadMonitors.mockResolvedValue({
      content: [],
      totalElements: 0,
      totalPages: 0,
      number: 0,
      size: 10
    });
  });

  it('derives catalog, Monitor builders, and label drilldown from inward contracts', () => {
    expect(getAppRoute('dashboard').path).toBe(canonical.application.dashboard);
    expect(getAppRoute('login').path).toBe(canonical.application.login);
    expect(getAppRoute('monitors').path).toBe(canonical.monitor.list);
    expect(getAppRoute('monitor-new').path).toBe(canonical.monitor.create);
    expect(getAppRoute('monitor-detail').path).toBe(canonical.monitor.detail);
    expect(getAppRoute('monitor-edit').path).toBe(canonical.monitor.edit);
    expect(getAppRoute('labels').path).toBe(canonical.labels);

    expect(safeMonitorReturnTo('/canonical-monitors?app=website')).toBe('/canonical-monitors?app=website');
    expect(buildMonitorRoutePath(7, 'view', '/canonical-monitors?app=website')).toBe(
      '/canonical-monitors/7?returnTo=%2Fcanonical-monitors%3Fapp%3Dwebsite'
    );
    expect(buildMonitorRoutePath(7, 'edit', '/canonical-monitors')).toBe(
      '/canonical-monitors/7/edit?returnTo=%2Fcanonical-monitors'
    );
    expect(buildLabelMonitorPath({ name: 'env', tagValue: 'prod' })).toBe('/canonical-monitors?labels=env%3Aprod');
  });

  it('uses canonical Monitor and login success targets in controllers', async () => {
    const monitor = renderController(canonical.monitor.list, useMonitorListController);
    await waitFor(() => expect(monitor.result.current.state.monitors.kind).toBe('empty'));
    act(() => monitor.result.current.actions.create());
    expect(navigate).toHaveBeenLastCalledWith(canonical.monitor.create);

    renderController(canonical.application.login, useLoginController);
    await waitFor(() => expect(navigate).toHaveBeenLastCalledWith(canonical.application.dashboard, { replace: true }));
  });

  it('canonicalizes the label query only on the shared label route and drops sensitive parameters', async () => {
    render(
      <MemoryRouter initialEntries={[`${canonical.labels}?search=%20env%20&pageIndex=-1&token=private-token`]}>
        <LabelQueryProbe />
      </MemoryRouter>
    );

    await waitFor(() =>
      expect(screen.getByTestId('label-location')).toHaveTextContent(
        `${canonical.labels}?pageIndex=0&pageSize=20&search=env`
      )
    );
    expect(screen.getByTestId('label-location')).not.toHaveTextContent('private-token');
  });
});

function renderController<Result>(entry: string, useController: () => Result) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[entry]}>{children}</MemoryRouter>
    </QueryClientProvider>
  );
  return renderHook(useController, { wrapper });
}

function LabelQueryProbe() {
  const location = useLocation();
  useLabelQueryController();
  return <output data-testid="label-location">{`${location.pathname}${location.search}`}</output>;
}
