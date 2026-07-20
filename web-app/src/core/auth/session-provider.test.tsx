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
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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

const authenticatedSession: UiSession = {
  authenticated: true,
  username: 'operator-a',
  roles: ['ADMIN'],
  workspaceId: 'workspace-a',
  expiresAt: null
};

describe('SessionProvider read state', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it.each([
    ['unavailable', () => Promise.reject(new TypeError('network detail'))],
    ['contract', () => Promise.resolve(sessionResponse({ authenticated: false }))],
    ['error', () => Promise.resolve(new Response(null, { status: 400 }))]
  ])('publishes a redacted %s failure category from the query owner', async (expected, fetchResult) => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockImplementation(fetchResult));
    renderSessionProvider();

    await waitFor(() => expect(screen.getByTestId('failure')).toHaveTextContent(expected));
    expect(screen.getByTestId('session')).toHaveTextContent('none');
    expect(screen.getByTestId('failure')).not.toHaveTextContent('network detail');
  });

  it('retries through the same Query owner and clears the typed failure after recovery', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new TypeError('network detail'))
      .mockResolvedValueOnce(sessionResponse(anonymousSession));
    vi.stubGlobal('fetch', fetchMock);
    renderSessionProvider();
    await screen.findByText('unavailable');

    fireEvent.click(screen.getByRole('button', { name: 'retry session' }));

    await waitFor(() => expect(screen.getByTestId('session')).toHaveTextContent('anonymous'));
    expect(screen.getByTestId('failure')).toHaveTextContent('none');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not publish a late retry completion after the provider unmounts', async () => {
    const lateResponse = deferred<Response>();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new TypeError('network detail'))
      .mockReturnValueOnce(lateResponse.promise);
    vi.stubGlobal('fetch', fetchMock);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const view = renderSessionProvider(client);
    await screen.findByText('unavailable');
    fireEvent.click(screen.getByRole('button', { name: 'retry session' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    view.unmount();
    await act(async () => {
      lateResponse.resolve(sessionResponse(authenticatedSession));
      await lateResponse.promise;
    });

    expect(client.getQueryData(sessionQueryKey)).toBeUndefined();
  });
});

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

function renderSessionProvider(client = new QueryClient({ defaultOptions: { queries: { retry: false } } })) {
  return render(
    <SessionIdentityProvider replaceIdentity={() => undefined}>
      <QueryClientProvider client={client}>
        <SessionProvider>
          <SessionStateProbe />
        </SessionProvider>
      </QueryClientProvider>
    </SessionIdentityProvider>
  );
}

function SessionStateProbe() {
  const { failure, retry, session } = useSession();
  return (
    <>
      <output data-testid="failure">{failure ?? 'none'}</output>
      <output data-testid="session">
        {session ? (session.authenticated ? 'authenticated' : 'anonymous') : 'none'}
      </output>
      <button type="button" onClick={retry}>
        retry session
      </button>
    </>
  );
}

function sessionResponse(data: unknown) {
  return new Response(JSON.stringify({ code: 0, msg: null, data }), { status: 200 });
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>(fulfill => {
    resolve = fulfill;
  });
  return { promise, resolve };
}
