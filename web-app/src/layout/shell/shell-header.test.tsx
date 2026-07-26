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
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { SessionQueryRuntime } from '@/app/refine/session-query-runtime';
import { AuthGate } from '@/core/auth/auth-gate';
import { anonymousSession, sessionQueryKey } from '@/core/auth/session-api';
import { SessionProvider } from '@/core/auth/session-provider';
import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';

import { ShellHeader } from './shell-header';

const sessionApi = vi.hoisted(() => ({ logoutSession: vi.fn() }));
const monitorImportTasks = vi.hoisted(() => ({ useShellMonitorImportTaskNotifications: vi.fn() }));
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
  useSharedTime: () => ({ headerMode: 'hidden', requestRefresh: vi.fn() })
}));
vi.mock('@/features/alert/shell', () => ({
  useShellAlertNotificationController: () => ({
    count: { kind: 'ready', total: 0 },
    list: { kind: 'empty' },
    sound: { kind: 'ready', muted: true, saving: false, permission: 'default', failure: null },
    toggleSound: vi.fn()
  })
}));
vi.mock('@/features/monitor/shell', () => monitorImportTasks);

describe('ShellHeader logout', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });

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
                      <Route element={<AuthGate />}>
                        <Route
                          path="/dashboard"
                          element={
                            <>
                              <ShellHeader collapsed />
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
  });
});

function LocationProbe() {
  return <output data-testid="location">{useLocation().pathname}</output>;
}
