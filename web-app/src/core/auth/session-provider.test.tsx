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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SessionQueryRuntime } from '@/app/refine/session-query-runtime';
import { apiFetch } from '@/core/http/http-client';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
const sessionApi = vi.hoisted(() => ({ refreshSession: vi.fn() }));
const convergence = vi.hoisted(() => ({
  broadcast: vi.fn(),
  close: vi.fn(),
  notify: undefined as (() => void) | undefined
}));
vi.mock('@/core/auth/session-api', async importOriginal => ({
  ...(await importOriginal<typeof import('@/core/auth/session-api')>()),
  refreshSession: sessionApi.refreshSession
}));
vi.mock('@/core/auth/session-convergence-channel', () => ({
  createSessionConvergenceChannel: (notify: () => void) => {
    convergence.notify = notify;
    return { broadcast: convergence.broadcast, close: convergence.close };
  }
}));

import { anonymousSession, sessionQueryKey, SessionRequestError, type UiSession } from './session-api';
import { useSession } from './session-context';
import { useSessionIdentityBoundary } from './session-identity-context';
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
  beforeEach(() => {
    vi.clearAllMocks();
    sessionApi.refreshSession.mockReset();
    convergence.notify = undefined;
  });

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
  beforeEach(() => {
    vi.clearAllMocks();
    convergence.notify = undefined;
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('refreshes an expiring identity before publishing a new authenticated generation', async () => {
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
    const renewedSession = { ...expiringSession, expiresAt: '2030-01-01T00:30:00.000Z' };
    sessionApi.refreshSession.mockResolvedValue(renewedSession);
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
              <SessionAuthenticationProbe />
            </SessionProvider>
          </QueryClientProvider>
        )}
      </SessionQueryRuntime>
    );

    expect(screen.getByText('authenticated')).toBeInTheDocument();
    clients[0]?.setQueryData(['protected', 'workspace-a'], 'operator-a');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });

    expect(sessionApi.refreshSession).toHaveBeenCalledOnce();
    expect(clients).toHaveLength(2);
    expect(clients[1]?.getQueryData(sessionQueryKey)).toEqual(renewedSession);
    expect(clients[1]?.getQueryData(['protected', 'workspace-a'])).toBeUndefined();
    expect(screen.getByText('authenticated')).toBeInTheDocument();
  });

  it('rotates anonymous only after a definite current-owner refresh failure', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2030-01-01T00:00:00.000Z'));
    const clients: QueryClient[] = [];
    sessionApi.refreshSession.mockRejectedValue(new SessionRequestError('error', { status: 200 }));
    renderExpirySession(clients, expiringSession());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });

    expect(sessionApi.refreshSession).toHaveBeenCalledOnce();
    expect(clients).toHaveLength(2);
    expect(clients[1]?.getQueryData(sessionQueryKey)).toEqual(anonymousSession);
    expect(screen.getByText('anonymous')).toBeInTheDocument();
  });

  it.each([
    ['unavailable', new SessionRequestError('unavailable')],
    ['contract', new SessionRequestError('contract', { status: 200 })]
  ] as const)(
    'fails closed with retryable %s evidence without retiring the identity cache or starting a loop',
    async (expectedFailure, refreshFailure) => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2030-01-01T00:00:00.000Z'));
      const clients: QueryClient[] = [];
      sessionApi.refreshSession.mockRejectedValue(refreshFailure);
      renderExpirySession(clients, expiringSession());
      clients[0]?.setQueryData(['protected', 'workspace-a'], 'private-cache');

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1_000);
      });

      expect(sessionApi.refreshSession).toHaveBeenCalledOnce();
      expect(clients).toHaveLength(1);
      expect(clients[0]?.getQueryData(['protected', 'workspace-a'])).toBe('private-cache');
      expect(screen.getByTestId('failure')).toHaveTextContent(expectedFailure);
      expect(screen.getByTestId('session')).toHaveTextContent('none');

      await act(async () => {
        await vi.advanceTimersByTimeAsync(60_000);
      });
      expect(sessionApi.refreshSession).toHaveBeenCalledOnce();
    }
  );

  it('retries an uncertain expiry renewal through the same coordinator and recovers', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2030-01-01T00:00:00.000Z'));
    const clients: QueryClient[] = [];
    const renewedSession = { ...authenticatedSession, expiresAt: '2030-01-01T00:30:00.000Z' };
    sessionApi.refreshSession
      .mockRejectedValueOnce(new SessionRequestError('unavailable'))
      .mockResolvedValueOnce(renewedSession);
    renderExpirySession(clients, expiringSession());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(screen.getByTestId('failure')).toHaveTextContent('unavailable');

    fireEvent.click(screen.getByRole('button', { name: 'retry session' }));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(sessionApi.refreshSession).toHaveBeenCalledTimes(2);
    expect(clients).toHaveLength(2);
    expect(clients[1]?.getQueryData(sessionQueryKey)).toEqual(renewedSession);
    expect(screen.getByTestId('failure')).toHaveTextContent('none');
    expect(screen.getByTestId('session')).toHaveTextContent('authenticated');
  });

  it('does not let a retired expiry refresh overwrite a newer generation', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2030-01-01T00:00:00.000Z'));
    const clients: QueryClient[] = [];
    const refresh = deferred<UiSession>();
    sessionApi.refreshSession.mockReturnValue(refresh.promise);
    renderExpirySession(clients, expiringSession());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    fireEvent.click(screen.getByRole('button', { name: 'publish user b' }));
    const currentClient = clients.at(-1);
    await act(async () => {
      refresh.resolve({ ...authenticatedSession, expiresAt: '2030-01-01T00:30:00.000Z' });
      await refresh.promise;
    });

    expect(clients.at(-1)).toBe(currentClient);
    expect(currentClient?.getQueryData(sessionQueryKey)).toMatchObject({ username: 'operator-b' });
  });

  it('does not publish a late expiry refresh after runtime unmount', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2030-01-01T00:00:00.000Z'));
    const clients: QueryClient[] = [];
    const refresh = deferred<UiSession>();
    sessionApi.refreshSession.mockReturnValue(refresh.promise);
    const view = renderExpirySession(clients, expiringSession());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    view.unmount();
    await act(async () => {
      refresh.resolve({ ...authenticatedSession, expiresAt: '2030-01-01T00:30:00.000Z' });
      await refresh.promise;
    });

    expect(sessionApi.refreshSession).toHaveBeenCalledOnce();
    expect(clients).toHaveLength(1);
  });

  it('shares one refresh between concurrent timer expiry and a safe-read 401', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2030-01-01T00:00:00.000Z'));
    const clients: QueryClient[] = [];
    const refresh = deferred<UiSession>();
    sessionApi.refreshSession.mockReturnValue(refresh.promise);
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    renderExpirySession(clients, expiringSession());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(sessionApi.refreshSession).toHaveBeenCalledOnce();
    const request = apiFetch('/api/protected');
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    await act(async () => {
      refresh.resolve({ ...authenticatedSession, expiresAt: '2030-01-01T00:30:00.000Z' });
      await refresh.promise;
    });

    await expect(request).resolves.toMatchObject({ status: 200 });
    expect(sessionApi.refreshSession).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(clients).toHaveLength(2);
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

  it('does not echo an external signal when its authoritative session response is already expired', async () => {
    const clients: QueryClient[] = [];
    const currentSession = { ...authenticatedSession, expiresAt: null };
    const expiredSession = { ...authenticatedSession, expiresAt: '2000-01-01T00:00:00.000Z' };
    sessionApi.refreshSession.mockResolvedValue(anonymousSession);
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(sessionResponse(expiredSession)));
    const createQueryClient = () => {
      const client = new QueryClient({
        defaultOptions: { queries: { retry: false, staleTime: Number.POSITIVE_INFINITY } }
      });
      if (clients.length === 0) client.setQueryData(sessionQueryKey, currentSession);
      clients.push(client);
      return client;
    };
    render(
      <SessionQueryRuntime createQueryClient={createQueryClient}>
        {runtime => (
          <QueryClientProvider key={runtime.generation} client={runtime.queryClient}>
            <SessionProvider>
              <SessionAuthenticationProbe />
            </SessionProvider>
          </QueryClientProvider>
        )}
      </SessionQueryRuntime>
    );
    expect(screen.getByText('authenticated')).toBeInTheDocument();

    act(() => convergence.notify?.());

    await waitFor(() => expect(clients).toHaveLength(3));
    expect(clients[1]?.getQueryData(sessionQueryKey)).toBeUndefined();
    expect(clients[2]?.getQueryData(sessionQueryKey)).toEqual(anonymousSession);
    expect(screen.getByText('anonymous')).toBeInTheDocument();
    expect(convergence.broadcast).not.toHaveBeenCalled();
  });
});

function renderExpirySession(clients: QueryClient[], session: UiSession) {
  const createQueryClient = () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Number.POSITIVE_INFINITY } }
    });
    if (clients.length === 0) client.setQueryData(sessionQueryKey, session);
    clients.push(client);
    return client;
  };
  return render(
    <SessionQueryRuntime createQueryClient={createQueryClient}>
      {runtime => (
        <QueryClientProvider key={runtime.generation} client={runtime.queryClient}>
          <SessionProvider>
            <SessionStateProbe />
            <ExpiryIdentityControl />
          </SessionProvider>
        </QueryClientProvider>
      )}
    </SessionQueryRuntime>
  );
}

function ExpiryIdentityControl() {
  const replaceIdentity = useSessionIdentityBoundary();
  return (
    <button
      type="button"
      onClick={() =>
        replaceIdentity({
          authenticated: true,
          username: 'operator-b',
          roles: ['USER'],
          workspaceId: 'workspace-b',
          expiresAt: null
        })
      }
    >
      publish user b
    </button>
  );
}

function expiringSession(): UiSession {
  return { ...authenticatedSession, expiresAt: '2030-01-01T00:00:01.000Z' };
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
