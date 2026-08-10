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
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { AppProviders } from '@/app/providers';
import { refineResources, shellAccessControlProvider } from '@/app/refine/refine-resource-registry';
import { SessionContext } from '@/core/auth/session-context';
import { SessionIdentityProvider } from '@/core/auth/session-identity-provider';
import { initializeI18n, loadLocale } from '@/core/i18n/i18n';
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
        online: 3,
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
    expect(logo).toHaveAttribute('src', '/assets/hertzbeat-brand-white.svg');
    expect(logo).toHaveAttribute('width', '144');
    expect(logo).toHaveAttribute('height', '36');
    expect(screen.getAllByRole('img', { name: 'HertzBeat' })).toHaveLength(1);
  });

  it('renders authoritative runtime status without a global time claim the route API cannot honor', () => {
    renderLayout('/monitors/7');

    expect(screen.getByTestId('shell-status-server')).toHaveTextContent('Available');
    expect(screen.getByTestId('shell-status-greptime')).toHaveTextContent('Needs attention');
    expect(screen.getByTestId('shell-status-greptime')).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Storage query failed')
    );
    expect(screen.getByTestId('shell-status-collector')).toHaveTextContent('Available');
    expect(screen.queryByTestId('shell-time-policy')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Refresh active data' })).not.toBeInTheDocument();
  });

  it('does not render fake shared time or refresh ownership for settings routes', () => {
    renderLayout('/settings/notifications/templates');

    expect(screen.queryByTestId('shell-time-policy')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Refresh active data' })).not.toBeInTheDocument();
  });

  it('does not claim instrumentation timestamps or refresh ownership in the shell', () => {
    renderLayout('/observability/integration?instrumentationStage=5');

    expect(screen.queryByTestId('shell-time-policy')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Refresh active data' })).not.toBeInTheDocument();
  });

  it.each(['/dashboard', '/monitors'])('does not claim refresh ownership for the active %s route', path => {
    renderLayout(path);

    expect(screen.queryByTestId('shell-time-policy')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Refresh active data' })).not.toBeInTheDocument();
  });

  it('does not publish a global refresh control for monitor detail', () => {
    renderLayout('/monitors/7');

    expect(screen.queryByTestId('shell-time-policy')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Refresh active data' })).not.toBeInTheDocument();
  });

  it.each(['/monitors/new', '/monitors/7/edit'])('does not apply monitor detail global time to %s', path => {
    renderLayout(path);

    expect(screen.queryByTestId('shell-time-policy')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Refresh active data' })).not.toBeInTheDocument();
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
