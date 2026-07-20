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
import { act, cleanup, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SessionQueryRuntime } from '@/app/refine/session-query-runtime';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

import { AuthGate } from './auth-gate';
import { anonymousSession, sessionQueryKey, type UiSession } from './session-api';
import { useSession } from './session-context';
import { SessionIdentityProvider } from './session-identity-provider';
import { SessionProvider } from './session-provider';

describe('SessionProvider expiry ownership', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('rotates an expired authenticated identity to a new anonymous client and login route', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2030-01-01T00:00:00.000Z'));
    const clients: QueryClient[] = [];
    const expiringSession: UiSession = {
      authenticated: true,
      username: 'operator-a',
      roles: ['ADMIN'],
      workspaceId: 'workspace-a',
      expiresAt: '2030-01-01T00:00:01.000Z'
    };
    const createQueryClient = () => {
      const client = new QueryClient({
        defaultOptions: { queries: { retry: false, staleTime: Number.POSITIVE_INFINITY } }
      });
      if (clients.length === 0) client.setQueryData(sessionQueryKey, expiringSession);
      clients.push(client);
      return client;
    };

    render(
      <SessionQueryRuntime createQueryClient={createQueryClient}>
        {runtime => (
          <QueryClientProvider key={runtime.generation} client={runtime.queryClient}>
            <SessionProvider>
              <MemoryRouter initialEntries={['/dashboard']}>
                <Routes>
                  <Route element={<AuthGate />}>
                    <Route path="/dashboard" element={<div>protected dashboard</div>} />
                  </Route>
                  <Route path="/passport/login" element={<LocationProbe />} />
                </Routes>
              </MemoryRouter>
            </SessionProvider>
          </QueryClientProvider>
        )}
      </SessionQueryRuntime>
    );

    expect(screen.getByText('protected dashboard')).toBeInTheDocument();
    clients[0]?.setQueryData(['protected', 'workspace-a'], 'operator-a');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });

    expect(screen.getByTestId('location')).toHaveTextContent('/passport/login');
    expect(clients).toHaveLength(2);
    expect(clients[1]?.getQueryData(sessionQueryKey)).toEqual(anonymousSession);
    expect(clients[1]?.getQueryData(['protected', 'workspace-a'])).toBeUndefined();
  });

  it('publishes an already expired cached identity as anonymous on the first render', () => {
    vi.setSystemTime(new Date('2030-01-01T00:00:01.000Z'));
    const expiredSession: UiSession = {
      authenticated: true,
      username: 'operator-a',
      roles: ['ADMIN'],
      workspaceId: 'workspace-a',
      expiresAt: '2030-01-01T00:00:00.000Z'
    };
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(sessionQueryKey, expiredSession);

    const firstRender = renderToString(
      <SessionIdentityProvider replaceIdentity={() => undefined}>
        <QueryClientProvider client={client}>
          <SessionProvider>
            <SessionAuthenticationProbe />
          </SessionProvider>
        </QueryClientProvider>
      </SessionIdentityProvider>
    );

    expect(firstRender).toContain('anonymous');
    expect(firstRender).not.toContain('authenticated');
  });
});

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}</output>;
}

function SessionAuthenticationProbe() {
  const { session } = useSession();
  return <output>{session?.authenticated ? 'authenticated' : 'anonymous'}</output>;
}
