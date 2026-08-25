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
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { SessionQueryRuntime } from '@/app/refine/session-query-runtime';
import { AuthGate } from '@/core/auth/auth-gate';
import { anonymousSession, sessionQueryKey } from '@/core/auth/session-api';
import { SessionIdentityContext } from '@/core/auth/session-identity-context';
import { SessionProvider } from '@/core/auth/session-provider';
import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import { ShellInvestigationProvider, usePublishShellInvestigation } from '@/shared/investigation';

import { ShellHeader } from './shell-header';

const sessionApi = vi.hoisted(() => ({ logoutSession: vi.fn() }));
const monitorImportTasks = vi.hoisted(() => ({ useShellMonitorImportTaskNotifications: vi.fn() }));
const convergence = vi.hoisted(() => ({ broadcast: vi.fn(), close: vi.fn() }));
vi.mock('@/core/auth/session-api', async () => ({
  ...(await vi.importActual<typeof import('@/core/auth/session-api')>('@/core/auth/session-api')),
  logoutSession: sessionApi.logoutSession
}));
vi.mock('@refinedev/core', async () => ({
  ...(await vi.importActual<typeof import('@refinedev/core')>('@refinedev/core')),
  useGo: () => vi.fn()
}));
vi.mock('@/core/runtime-theme-context', () => ({
  useRuntimeTheme: () => ({ theme: 'dark', setTheme: vi.fn() })
}));
vi.mock('@/shared/time', async () => ({
  ...(await vi.importActual<typeof import('@/shared/time')>('@/shared/time')),
  useSharedTime: () => ({ headerMode: 'hidden', window: { from: 1_000, to: 2_000 }, requestRefresh: vi.fn() })
}));
vi.mock('@/features/alert/shell', () => ({
  useShellAlertNotificationController: () => ({
    count: { kind: 'ready', total: 0 },
    list: { kind: 'empty' },
    sound: { kind: 'ready', canToggle: true, muted: true, saving: false, permission: 'default', failure: null },
    toggleSound: vi.fn()
  })
}));
vi.mock('@/features/monitor/shell', () => monitorImportTasks);
vi.mock('@/core/auth/session-convergence-channel', () => ({
  createSessionConvergenceChannel: () => convergence
}));

describe('ShellHeader logout', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });

  afterEach(() => cleanup());

  it('rotates to an anonymous QueryClient after the server logout succeeds', async () => {
    sessionApi.logoutSession.mockResolvedValue(undefined);
    const queryClients: QueryClient[] = [];
    const createQueryClient = () => {
      const client = new QueryClient();
      if (queryClients.length === 0) {
        client.setQueryData(sessionQueryKey, {
          authenticated: true,
          username: 'operator-a',
          roles: ['ADMIN'],
          workspaceId: 'a',
          expiresAt: null
        });
      }
      queryClients.push(client);
      return client;
    };
    render(
      <I18nextProvider i18n={i18n}>
        <App>
          <MemoryRouter initialEntries={['/dashboard']}>
            <SessionQueryRuntime createQueryClient={createQueryClient}>
              {runtime => (
                <QueryClientProvider key={runtime.generation} client={runtime.queryClient}>
                  <SessionProvider>
                    <Routes>
                      <Route element={<AuthGate loadingState={null} failureState={() => null} />}>
                        <Route
                          path="/dashboard"
                          element={
                            <>
                              <ShellHeader />
                              <LocationProbe />
                            </>
                          }
                        />
                      </Route>
                      <Route path="/passport/login" element={<LocationProbe />} />
                    </Routes>
                  </SessionProvider>
                </QueryClientProvider>
              )}
            </SessionQueryRuntime>
          </MemoryRouter>
        </App>
      </I18nextProvider>
    );

    expect(monitorImportTasks.useShellMonitorImportTaskNotifications).toHaveBeenCalledOnce();
    queryClients[0]?.setQueryData(['protected', 'user-a'], 'operator-a');
    fireEvent.click(screen.getByRole('button', { name: i18n.t('shell.actions.user') }));
    fireEvent.click(await screen.findByText(i18n.t('auth.logout')));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/passport/login'));
    expect(queryClients).toHaveLength(2);
    expect(queryClients[1]?.getQueryData(sessionQueryKey)).toEqual(anonymousSession);
    expect(queryClients[1]?.getQueryData(['protected', 'user-a'])).toBeUndefined();
    expect(convergence.broadcast).toHaveBeenCalledOnce();
  });

  it('freezes the selected monitor range at click time and strips unrelated query state', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(sessionQueryKey, {
      authenticated: true,
      username: 'operator-a',
      roles: ['ADMIN'],
      workspaceId: 'a',
      expiresAt: null
    });
    render(
      <I18nextProvider i18n={i18n}>
        <App>
          <MemoryRouter
            initialEntries={[
              '/monitors/42?metric=basic.max_connections&history=30m&returnTo=%2Fmonitors&password=secret'
            ]}
          >
            <QueryClientProvider client={queryClient}>
              <SessionIdentityContext.Provider value={vi.fn()}>
                <SessionProvider>
                  <Routes>
                    <Route element={<AuthGate loadingState={null} failureState={() => null} />}>
                      <Route
                        path="*"
                        element={
                          <>
                            <ShellHeader />
                            <LocationProbe />
                          </>
                        }
                      />
                    </Route>
                  </Routes>
                </SessionProvider>
              </SessionIdentityContext.Provider>
            </QueryClientProvider>
          </MemoryRouter>
        </App>
      </I18nextProvider>
    );

    const now = vi.spyOn(Date, 'now').mockReturnValue(2_000_000);
    fireEvent.click(await screen.findByRole('button', { name: i18n.t('shell.actions.investigate') }));

    await waitFor(() => {
      const location = screen.getByTestId('location').textContent ?? '';
      const url = new URL(location, 'http://localhost');
      expect(url.pathname).toBe('/ai');
      expect(Object.fromEntries(url.searchParams)).toMatchObject({
        monitorId: '42',
        signal: 'metrics',
        query: 'basic.max_connections',
        start: '200000',
        end: '2000000',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        returnTo: '/monitors/42?metric=basic.max_connections&history=30m&returnTo=%2Fmonitors'
      });
      expect(url.searchParams.has('timeRange')).toBe(false);
      expect(location).not.toContain('password');
    });
    now.mockRestore();
  });

  it('opens an exact Entity investigation while preserving a safe return path', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(sessionQueryKey, {
      authenticated: true,
      username: 'operator-a',
      roles: ['USER'],
      workspaceId: 'a',
      expiresAt: null
    });
    render(
      <I18nextProvider i18n={i18n}>
        <App>
          <MemoryRouter initialEntries={['/entities/73?returnTo=%2Fentities&password=secret']}>
            <QueryClientProvider client={queryClient}>
              <SessionIdentityContext.Provider value={vi.fn()}>
                <SessionProvider>
                  <Routes>
                    <Route element={<AuthGate loadingState={null} failureState={() => null} />}>
                      <Route
                        path="*"
                        element={
                          <>
                            <ShellHeader />
                            <LocationProbe />
                          </>
                        }
                      />
                    </Route>
                  </Routes>
                </SessionProvider>
              </SessionIdentityContext.Provider>
            </QueryClientProvider>
          </MemoryRouter>
        </App>
      </I18nextProvider>
    );

    fireEvent.click(await screen.findByRole('button', { name: i18n.t('shell.actions.investigate') }));

    await waitFor(() => {
      const location = screen.getByTestId('location').textContent ?? '';
      const url = new URL(location, 'http://localhost');
      expect(url.pathname).toBe('/ai');
      expect(Object.fromEntries(url.searchParams)).toEqual({
        source: 'entity',
        entityId: '73',
        returnTo: '/entities/73?returnTo=%2Fentities'
      });
      expect(location).not.toContain('password');
    });
  });

  it('opens the exact focused Topology scope and selection while stripping private return state', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(sessionQueryKey, {
      authenticated: true,
      username: 'operator-a',
      roles: ['USER'],
      workspaceId: 'a',
      expiresAt: null
    });
    render(
      <I18nextProvider i18n={i18n}>
        <App>
          <MemoryRouter
            initialEntries={[
              '/topology?focusEntityId=10&depth=2&environment=prod&sourceKind=otlp-trace-call' +
                '&relationType=trace-call&hideInternal=true&pageIndex=1&pageSize=50&nodeId=entity%3A10' +
                '&returnTo=%2Fentities%2F10&apiKey=secret'
            ]}
          >
            <QueryClientProvider client={queryClient}>
              <SessionIdentityContext.Provider value={vi.fn()}>
                <SessionProvider>
                  <Routes>
                    <Route element={<AuthGate loadingState={null} failureState={() => null} />}>
                      <Route
                        path="*"
                        element={
                          <>
                            <ShellHeader />
                            <LocationProbe />
                          </>
                        }
                      />
                    </Route>
                  </Routes>
                </SessionProvider>
              </SessionIdentityContext.Provider>
            </QueryClientProvider>
          </MemoryRouter>
        </App>
      </I18nextProvider>
    );

    fireEvent.click(await screen.findByRole('button', { name: i18n.t('shell.actions.investigate') }));

    await waitFor(() => {
      const location = screen.getByTestId('location').textContent ?? '';
      const url = new URL(location, 'http://localhost');
      expect(url.pathname).toBe('/ai');
      expect(Object.fromEntries(url.searchParams)).toMatchObject({
        source: 'topology',
        focusEntityId: '10',
        nodeId: 'entity:10',
        depth: '2',
        environment: 'prod',
        sourceKind: 'otlp-trace-call',
        start: '1000',
        end: '2000',
        relationType: 'trace-call',
        hideInternal: 'true',
        pageIndex: '1',
        pageSize: '50'
      });
      expect(url.searchParams.get('returnTo')).toContain('/topology?focusEntityId=10');
      expect(location).not.toContain('apiKey');
    });
  });

  it('opens the exact Trace Explore detail scope while stripping private return state', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(sessionQueryKey, {
      authenticated: true,
      username: 'operator-a',
      roles: ['USER'],
      workspaceId: 'a',
      expiresAt: null
    });
    render(
      <I18nextProvider i18n={i18n}>
        <App>
          <MemoryRouter
            initialEntries={[
              '/explore?signal=traces&timeRange=last-30m&traceId=trace-42&spanId=span-7' +
                '&serviceName=checkout&serviceNamespace=commerce&environment=prod' +
                '&resourceFilter=service.version%3D1&attributeFilter=http.status_code%3D503' +
                '&minDurationMs=10&maxDurationMs=20&apiKey=secret'
            ]}
          >
            <QueryClientProvider client={queryClient}>
              <SessionIdentityContext.Provider value={vi.fn()}>
                <SessionProvider>
                  <Routes>
                    <Route element={<AuthGate loadingState={null} failureState={() => null} />}>
                      <Route
                        path="*"
                        element={
                          <ShellInvestigationProvider>
                            <ReadyTraceInvestigation />
                            <ShellHeader />
                            <LocationProbe />
                          </ShellInvestigationProvider>
                        }
                      />
                    </Route>
                  </Routes>
                </SessionProvider>
              </SessionIdentityContext.Provider>
            </QueryClientProvider>
          </MemoryRouter>
        </App>
      </I18nextProvider>
    );

    fireEvent.click(await screen.findByRole('button', { name: i18n.t('shell.actions.investigate') }));

    await waitFor(() => {
      const location = screen.getByTestId('location').textContent ?? '';
      const url = new URL(location, 'http://localhost');
      expect(url.pathname).toBe('/ai');
      expect(Object.fromEntries(url.searchParams)).toMatchObject({
        source: 'trace',
        traceId: 'trace-42',
        spanId: 'span-7',
        start: '1000',
        end: '2000',
        serviceName: 'checkout',
        serviceNamespace: 'commerce',
        environment: 'prod',
        resourceFilter: 'service.version=1',
        attributeFilter: 'http.status_code=503',
        minDurationMs: '10',
        maxDurationMs: '20'
      });
      expect(url.searchParams.get('returnTo')).toContain('/explore?signal=traces');
      expect(location).not.toContain('apiKey');
    });
  });

  it('does not expose Trace investigation from a filter-only route without ready detail evidence', () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(sessionQueryKey, {
      authenticated: true,
      username: 'operator-a',
      roles: ['USER'],
      workspaceId: 'a',
      expiresAt: null
    });
    render(
      <I18nextProvider i18n={i18n}>
        <App>
          <MemoryRouter initialEntries={['/explore?signal=traces&traceId=missing-trace']}>
            <QueryClientProvider client={queryClient}>
              <SessionIdentityContext.Provider value={vi.fn()}>
                <SessionProvider>
                  <Routes>
                    <Route element={<AuthGate loadingState={null} failureState={() => null} />}>
                      <Route path="*" element={<ShellHeader />} />
                    </Route>
                  </Routes>
                </SessionProvider>
              </SessionIdentityContext.Provider>
            </QueryClientProvider>
          </MemoryRouter>
        </App>
      </I18nextProvider>
    );

    expect(screen.queryByRole('button', { name: i18n.t('shell.actions.investigate') })).not.toBeInTheDocument();
  });

  it('opens the exact current Log page scope while stripping private return state', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(sessionQueryKey, {
      authenticated: true,
      username: 'operator-a',
      roles: ['USER'],
      workspaceId: 'a',
      expiresAt: null
    });
    render(
      <I18nextProvider i18n={i18n}>
        <App>
          <MemoryRouter initialEntries={['/explore?signal=logs&traceId=trace-42&apiKey=secret']}>
            <QueryClientProvider client={queryClient}>
              <SessionIdentityContext.Provider value={vi.fn()}>
                <SessionProvider>
                  <Routes>
                    <Route element={<AuthGate loadingState={null} failureState={() => null} />}>
                      <Route
                        path="*"
                        element={
                          <ShellInvestigationProvider>
                            <ReadyLogInvestigation />
                            <ShellHeader />
                            <LocationProbe />
                          </ShellInvestigationProvider>
                        }
                      />
                    </Route>
                  </Routes>
                </SessionProvider>
              </SessionIdentityContext.Provider>
            </QueryClientProvider>
          </MemoryRouter>
        </App>
      </I18nextProvider>
    );

    fireEvent.click(await screen.findByRole('button', { name: i18n.t('shell.actions.investigate') }));

    await waitFor(() => {
      const location = screen.getByTestId('location').textContent ?? '';
      const url = new URL(location, 'http://localhost');
      expect(url.pathname).toBe('/ai');
      expect(Object.fromEntries(url.searchParams)).toMatchObject({
        source: 'log',
        start: '1000',
        end: '2000',
        traceId: 'trace-42',
        severityText: 'WARN',
        search: 'timeout',
        serviceName: 'checkout',
        hideInternal: 'true',
        hideNoise: 'false',
        pageIndex: '0',
        pageSize: '20'
      });
      expect(url.searchParams.get('returnTo')).toContain('/explore?signal=logs');
      expect(location).not.toContain('apiKey');
    });
  });
});

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.search}`}</output>;
}

function ReadyTraceInvestigation() {
  usePublishShellInvestigation(readyTraceInvestigation);
  return null;
}

function ReadyLogInvestigation() {
  usePublishShellInvestigation(readyLogInvestigation);
  return null;
}

const readyLogInvestigation = {
  log: {
    start: 1_000,
    end: 2_000,
    traceId: 'trace-42',
    severityText: 'WARN' as const,
    search: 'timeout',
    serviceName: 'checkout',
    hideInternal: true,
    hideNoise: false,
    pageIndex: 0,
    pageSize: 20
  }
};

const readyTraceInvestigation = {
  trace: {
    traceId: 'trace-42',
    spanId: 'span-7',
    start: 1_000,
    end: 2_000,
    serviceName: 'checkout',
    serviceNamespace: 'commerce',
    environment: 'prod',
    resourceFilter: 'service.version=1',
    attributeFilter: 'http.status_code=503',
    minDurationMs: 10,
    maxDurationMs: 20
  }
};
