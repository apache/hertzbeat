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
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SessionQueryRuntime } from '@/app/refine/session-query-runtime';
import {
  anonymousSession,
  getSession,
  loginSession,
  logoutSession,
  sessionQueryKey,
  type UiSession
} from './session-api';
import { useSession } from './session-context';
import { useSessionIdentityBoundary } from './session-identity-context';
import { SessionProvider } from './session-provider';

vi.mock('@/core/auth/session-convergence-channel', () => ({
  createSessionConvergenceChannel: () => ({ broadcast: vi.fn(), close: vi.fn() })
}));

const user: UiSession = {
  authenticated: true,
  username: 'synthetic-operator',
  workspaceId: 'synthetic-workspace',
  roles: ['ADMIN'],
  expiresAt: null
};

function response(data: UiSession | null, code = 0) {
  return new Response(JSON.stringify({ code, msg: null, data }), { status: 200 });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => {
    resolve = done;
  });
  return { promise, resolve };
}

function mount(seed?: UiSession, provider = true, copies = 1) {
  const clients: QueryClient[] = [];
  const createQueryClient = () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
    if (clients.length === 0 && seed) client.setQueryData(sessionQueryKey, seed);
    clients.push(client);
    return client;
  };
  render(
    <SessionQueryRuntime createQueryClient={createQueryClient}>
      {runtime => (
        <QueryClientProvider key={runtime.generation} client={runtime.queryClient}>
          {provider ? (
            <>
              <SessionProvider>
                <Probe />
              </SessionProvider>
              {copies === 2 && (
                <SessionProvider>
                  <Probe />
                </SessionProvider>
              )}
            </>
          ) : (
            <Probe />
          )}
        </QueryClientProvider>
      )}
    </SessionQueryRuntime>
  );
  return clients;
}

function Probe() {
  const { session, failure, loading } = useSession();
  const replaceIdentity = useSessionIdentityBoundary();
  return (
    <>
      <output data-testid="identity">{loading ? 'checking' : (failure ?? session?.username ?? 'anonymous')}</output>
      <button onClick={() => replaceIdentity({ ...user, username: 'new-operator' })}>switch identity</button>
      <button
        onClick={() => {
          void logoutSession().then(() => replaceIdentity(anonymousSession));
        }}
      >
        logout
      </button>
    </>
  );
}

function refreshCount(mock: ReturnType<typeof vi.fn<typeof fetch>>) {
  return mock.mock.calls.filter(([input]) => input === '/api/ui/session/refresh').length;
}

describe('browser session recovery', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('restores a missing access session once on bootstrap using the existing refresh endpoint', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockImplementation(input =>
        Promise.resolve(response(input === '/api/ui/session/refresh' ? user : anonymousSession))
      );
    vi.stubGlobal('fetch', fetchMock);
    const clients = mount();

    await screen.findByText(user.username!);
    expect(refreshCount(fetchMock)).toBe(1);
    expect(clients.at(-1)?.getQueryData(sessionQueryKey)).toEqual(user);
  });

  it('deduplicates concurrent bootstrap observers in the same identity generation', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockImplementation(input =>
        Promise.resolve(response(input === '/api/ui/session/refresh' ? user : anonymousSession))
      );
    vi.stubGlobal('fetch', fetchMock);
    mount(undefined, true, 2);
    await screen.findAllByText(user.username!);
    expect(refreshCount(fetchMock)).toBe(1);
  });

  it.each([401, 403])('does not recover an authoritative HTTP %s session rejection', async status => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status }));
    vi.stubGlobal('fetch', fetchMock);
    mount();
    await screen.findByText('error');
    expect(refreshCount(fetchMock)).toBe(0);
  });

  it.each(['missing', 'expired', 'revoked', 'invalid-signature'])(
    'stays anonymous after a definite %s refresh rejection without looping',
    async () => {
      const fetchMock = vi
        .fn<typeof fetch>()
        .mockImplementation(input =>
          Promise.resolve(input === '/api/ui/session/refresh' ? response(null, -1) : response(anonymousSession))
        );
      vi.stubGlobal('fetch', fetchMock);
      mount();

      await screen.findByText('anonymous');
      expect(refreshCount(fetchMock)).toBe(1);
      fireEvent.focus(window);
      await act(async () => {
        await new Promise<void>(done => setTimeout(done, 0));
      });
      expect(refreshCount(fetchMock)).toBe(1);
    }
  );

  it('reports an uncertain refresh outage without infinite retry or authenticated content', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockImplementation(input =>
        Promise.resolve(
          input === '/api/ui/session/refresh' ? new Response(null, { status: 503 }) : response(anonymousSession)
        )
      );
    vi.stubGlobal('fetch', fetchMock);
    mount();

    await screen.findByText('unavailable');
    expect(refreshCount(fetchMock)).toBe(1);
  });

  it('recovers on foreground even when the background expiry timer never ran', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockImplementation(input =>
        Promise.resolve(response(input === '/api/ui/session/refresh' ? user : anonymousSession))
      );
    vi.stubGlobal('fetch', fetchMock);
    const clients = mount({ ...user, expiresAt: '2000-01-01T00:00:00Z' }, false);
    const current = clients[0];

    fireEvent.focus(window);

    await waitFor(() => expect(current?.getQueryData(sessionQueryKey)).toEqual(user));
    expect(refreshCount(fetchMock)).toBe(1);
    expect(clients).toHaveLength(1);
  });

  it('coalesces concurrent foreground events while one recovery is pending', async () => {
    const refresh = deferred<Response>();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockImplementation(input =>
        input === '/api/ui/session/refresh' ? refresh.promise : Promise.resolve(response(anonymousSession))
      );
    vi.stubGlobal('fetch', fetchMock);
    mount(user, false);
    fireEvent.focus(window);
    fireEvent(document, new Event('visibilitychange'));
    await waitFor(() => expect(refreshCount(fetchMock)).toBe(1));
    fireEvent.focus(window);
    refresh.resolve(response(user));
    await act(async () => {
      await refresh.promise;
    });
    expect(refreshCount(fetchMock)).toBe(1);
  });

  it('never publishes a recovery belonging to a retired identity', async () => {
    const refresh = deferred<Response>();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockImplementation(input =>
        input === '/api/ui/session/refresh' ? refresh.promise : Promise.resolve(response(anonymousSession))
      );
    vi.stubGlobal('fetch', fetchMock);
    const clients = mount();
    await waitFor(() => expect(refreshCount(fetchMock)).toBe(1));
    fireEvent.click(screen.getByText('switch identity'));
    const current = clients.at(-1);
    await act(async () => {
      refresh.resolve(response(user));
      await refresh.promise;
    });
    expect(clients.at(-1)).toBe(current);
    expect(current?.getQueryData<UiSession>(sessionQueryKey)?.username).toBe('new-operator');
  });

  it('orders a late clearing session read before a newly admitted login response', async () => {
    const read = deferred<Response>();
    const events: string[] = [];
    const fetchMock = vi.fn<typeof fetch>().mockImplementation((_input, init) => {
      if (init?.method === 'POST') {
        events.push('login-cookie-write');
        return Promise.resolve(response(user));
      }
      events.push('read-start');
      return read.promise.then(result => {
        events.push('read-cookie-clear');
        return result;
      });
    });
    vi.stubGlobal('fetch', fetchMock);
    const readRequest = getSession();
    await waitFor(() => expect(events).toEqual(['read-start']));
    const loginRequest = loginSession('synthetic-operator', 'synthetic-test-credential');
    expect(events).toEqual(['read-start']);
    read.resolve(response(anonymousSession));
    await Promise.all([readRequest, loginRequest]);
    expect(events).toEqual(['read-start', 'read-cookie-clear', 'login-cookie-write']);
  });

  it('orders logout after a pending refresh so its final cookie clearing cannot be overwritten', async () => {
    const refresh = deferred<Response>();
    let refreshCookiePresent = true;
    const events: string[] = [];
    const fetchMock = vi.fn<typeof fetch>().mockImplementation((input, init) => {
      if (input === '/api/ui/session/refresh') {
        events.push('refresh-start');
        return refresh.promise.then(result => {
          refreshCookiePresent = true;
          events.push('refresh-finish');
          return result;
        });
      }
      if (init?.method === 'DELETE') {
        events.push('logout');
        refreshCookiePresent = false;
        return Promise.resolve(response(null));
      }
      return Promise.resolve(response(anonymousSession));
    });
    vi.stubGlobal('fetch', fetchMock);
    const clients = mount();
    await waitFor(() => expect(refreshCount(fetchMock)).toBe(1));
    fireEvent.click(screen.getByText('logout'));
    expect(events).toEqual(['refresh-start']);
    await act(async () => {
      refresh.resolve(response(user));
      await refresh.promise;
    });
    await screen.findByText('anonymous');
    expect(events).toEqual(['refresh-start', 'refresh-finish', 'logout']);
    expect(refreshCookiePresent).toBe(false);
    expect(clients.at(-1)?.getQueryData(sessionQueryKey)).toEqual(anonymousSession);
    expect(refreshCount(fetchMock)).toBe(1);
  });
});
