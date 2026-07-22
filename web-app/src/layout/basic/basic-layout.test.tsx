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

import { Refine } from '@refinedev/core';
import routerProvider from '@refinedev/react-router';
import { useQuery } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { AppProviders } from '@/app/providers';
import { refineResources, shellAccessControlProvider } from '@/app/refine/refine-resource-registry';
import { SessionContext } from '@/core/auth/session-context';
import { SessionIdentityProvider } from '@/core/auth/session-identity-provider';
import { initializeI18n, loadLocale } from '@/core/i18n/i18n';
import { useSharedTime } from '@/shared/time';

import { BasicLayout } from './basic-layout';

vi.mock('@/features/runtime-status', () => ({
  useRuntimeStatusController: () => ({
    state: 'ready',
    snapshot: {
      observedAt: '2026-07-22T01:02:03Z',
      server: { status: 'available', errorCode: null },
      storage: { kind: 'greptime', status: 'degraded', errorCode: 'storage_query_failed' },
      collectors: {
        status: 'available',
        total: 3,
        online: 2,
        runtimeHealthy: 1,
        lastReportedAt: '2026-07-22T01:02:00Z',
        errorCode: null
      }
    }
  })
}));

describe('BasicLayout shell', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });

  afterEach(cleanup);

  it('renders the official logo as one constrained accessible brand identity', () => {
    renderLayout();

    const logo = screen.getByRole('img', { name: 'HertzBeat' });
    expect(logo).toHaveAttribute('src', '/assets/logo.svg');
    expect(logo).toHaveAttribute('width', '24');
    expect(logo).toHaveAttribute('height', '23');
    expect(screen.getByText('HertzBeat')).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders authoritative runtime status without a global time claim the route API cannot honor', () => {
    renderLayout('/monitors/7');

    expect(screen.getByTestId('shell-status-server')).toHaveTextContent('Available');
    expect(screen.getByTestId('shell-status-greptime')).toHaveTextContent('Degraded');
    expect(screen.getByTestId('shell-status-greptime')).toHaveTextContent('Storage query failed');
    expect(screen.getByTestId('shell-status-collector')).toHaveTextContent('Available');
    expect(screen.queryByTestId('shell-time-policy')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh active data' })).toBeEnabled();
  });

  it('does not render fake shared time or refresh ownership for settings routes', () => {
    renderLayout('/settings/notifications/templates');

    expect(screen.queryByTestId('shell-time-policy')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh active data' })).toBeEnabled();
  });

  it('refreshes Instrumentation queries without claiming its onboarding timestamps are shell time', async () => {
    const fetchActiveData = vi.fn().mockResolvedValue('ready');
    renderLayout(
      '/observability/integration?instrumentationStage=5',
      <ActiveQueryProbe fetchActiveData={fetchActiveData} />
    );

    await waitFor(() => expect(fetchActiveData).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId('shell-time-policy')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh active data' }));

    await waitFor(() => expect(fetchActiveData).toHaveBeenCalledTimes(2));
  });

  it.each(['/dashboard', '/monitors'])(
    'invalidates the active %s query from the header without fake time controls',
    async path => {
      const fetchActiveData = vi.fn().mockResolvedValue('ready');
      renderLayout(path, <ActiveQueryProbe fetchActiveData={fetchActiveData} />);

      await waitFor(() => expect(fetchActiveData).toHaveBeenCalledTimes(1));
      expect(screen.queryByTestId('shell-time-policy')).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Refresh active data' }));

      await waitFor(() => expect(fetchActiveData).toHaveBeenCalledTimes(2));
    }
  );

  it('refreshes monitor detail active queries without publishing a meaningless global revision', async () => {
    const fetchActiveData = vi.fn().mockResolvedValue('ready');
    renderLayout('/monitors/7', <MonitorQueryProbe fetchActiveData={fetchActiveData} />);

    await waitFor(() => expect(fetchActiveData).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId('shell-time-policy')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh active data' }));

    await waitFor(() => expect(fetchActiveData).toHaveBeenCalledTimes(2));
  });

  it.each(['/monitors/new', '/monitors/7/edit'])('does not apply monitor detail global time to %s', path => {
    renderLayout(path);

    expect(screen.queryByTestId('shell-time-policy')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh active data' })).toBeEnabled();
  });

  it('selects the longest Refine route and exposes the collapsed navigation state', () => {
    renderLayout('/settings/notifications/templates');

    const activeLink = screen.getByRole('link', { name: 'Templates' });
    expect(activeLink).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Receivers' })).not.toHaveAttribute('aria-current');
    expect(screen.getByTestId('shell-navigation')).toHaveAttribute('data-collapsed', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'Collapse navigation' }));
    expect(screen.getByTestId('shell-navigation')).toHaveAttribute('data-collapsed', 'true');
  });
});

function renderLayout(path = '/alerts', routeElement: React.ReactNode = <div>Route content</div>) {
  return render(
    <AppProviders>
      <MemoryRouter initialEntries={[path]}>
        <Refine
          accessControlProvider={shellAccessControlProvider}
          resources={refineResources}
          routerProvider={routerProvider}
          options={{ disableTelemetry: true }}
        >
          <SessionIdentityProvider replaceIdentity={() => undefined}>
            <SessionContext.Provider
              value={{
                loading: false,
                retry: () => undefined,
                session: {
                  authenticated: true,
                  username: 'operator',
                  roles: ['ADMIN'],
                  workspaceId: 'default',
                  expiresAt: null
                }
              }}
            >
              <Routes>
                <Route element={<BasicLayout />}>
                  <Route path="/dashboard" element={routeElement} />
                  <Route path="/monitors" element={routeElement} />
                  <Route path="/monitors/new" element={routeElement} />
                  <Route path="/monitors/:monitorId" element={routeElement} />
                  <Route path="/monitors/:monitorId/edit" element={routeElement} />
                  <Route path="/alerts" element={routeElement} />
                  <Route path="/observability/integration" element={routeElement} />
                  <Route path="/settings/notifications/templates" element={routeElement} />
                </Route>
              </Routes>
            </SessionContext.Provider>
          </SessionIdentityProvider>
        </Refine>
      </MemoryRouter>
    </AppProviders>
  );
}

function ActiveQueryProbe({ fetchActiveData }: { fetchActiveData: () => Promise<string> }) {
  useQuery({ queryKey: ['shell-active-query-proof'], queryFn: fetchActiveData, staleTime: Number.POSITIVE_INFINITY });
  return null;
}

function MonitorQueryProbe({ fetchActiveData }: { fetchActiveData: () => Promise<string> }) {
  const time = useSharedTime();
  useQuery({
    queryKey: ['shell-time-query-proof', time.window?.from, time.window?.to, time.refreshRevision],
    queryFn: fetchActiveData,
    staleTime: Number.POSITIVE_INFINITY
  });
  return null;
}
