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

import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useSessionIdentityBoundary } from '@/core/auth/session-identity-context';
import { anonymousSession, sessionQueryKey, type UiSession } from '@/core/auth/session-api';
import { apiFetch } from '@/core/http/http-client';

const sessionApi = vi.hoisted(() => ({ refreshSession: vi.fn() }));
vi.mock('@/core/auth/session-api', async () => ({
  ...(await vi.importActual<typeof import('@/core/auth/session-api')>('@/core/auth/session-api')),
  refreshSession: sessionApi.refreshSession
}));

import { SessionQueryRuntime, type SessionQueryRuntimeValue } from './session-query-runtime';

const userA = authenticatedSession('operator-a', 'workspace-a');
const userB = authenticatedSession('operator-b', 'workspace-b');

describe('SessionQueryRuntime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('rotates the mounted client so a late user A mutation cannot reach anonymous or user B', async () => {
    const clients: QueryClient[] = [];
    const createQueryClient = () => {
      const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      clients.push(client);
      return client;
    };
    render(
      <SessionQueryRuntime createQueryClient={createQueryClient}>
        {runtime => (
          <QueryClientProvider key={runtime.generation} client={runtime.queryClient}>
            <RuntimeProbe runtime={runtime} />
          </QueryClientProvider>
        )}
      </SessionQueryRuntime>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Publish user A' }));
    const userAClient = clients.at(-1);
    if (!userAClient) throw new Error('User A QueryClient was not created.');

    let resolveMutation: () => void = () => undefined;
    const mutationResult = new Promise<void>(resolve => {
      resolveMutation = resolve;
    });
    const lateMutation = userAClient
      .getMutationCache()
      .build(userAClient, {
        mutationFn: () => mutationResult,
        onSuccess: () => userAClient.setQueryData(['protected', 'late-a'], 'operator-a')
      })
      .execute(undefined);

    fireEvent.click(screen.getByRole('button', { name: 'Publish anonymous' }));
    const anonymousClient = clients.at(-1);
    expect(anonymousClient).not.toBe(userAClient);
    expect(screen.getByTestId('client-match')).toHaveTextContent('same');
    expect(anonymousClient?.getQueryData(sessionQueryKey)).toEqual(anonymousSession);

    resolveMutation();
    await lateMutation;
    expect(userAClient.getQueryData(['protected', 'late-a'])).toBe('operator-a');
    expect(anonymousClient?.getQueryData(['protected', 'late-a'])).toBeUndefined();

    fireEvent.click(screen.getByRole('button', { name: 'Publish user B' }));
    const userBClient = clients.at(-1);
    expect(userBClient).not.toBe(anonymousClient);
    expect(screen.getByTestId('client-match')).toHaveTextContent('same');
    expect(userBClient?.getQueryData(sessionQueryKey)).toEqual(userB);
    expect(userBClient?.getQueryData(['protected', 'late-a'])).toBeUndefined();
  });

  it('publishes the full refreshed session through a new QueryClient before retrying a safe read', async () => {
    const clients: QueryClient[] = [];
    const refreshed = { ...userA, expiresAt: '2030-01-01T00:30:00.000Z' };
    sessionApi.refreshSession.mockResolvedValue(refreshed);
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    renderRuntime(clients);
    fireEvent.click(screen.getByRole('button', { name: 'Publish user A' }));

    await expect(apiFetch('/api/protected')).resolves.toMatchObject({ status: 200 });

    await waitFor(() => expect(clients.at(-1)?.getQueryData(sessionQueryKey)).toEqual(refreshed));
    expect(sessionApi.refreshSession).toHaveBeenCalledOnce();
    expect(clients).toHaveLength(3);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('converges a failed safe-read refresh to a new anonymous QueryClient', async () => {
    const clients: QueryClient[] = [];
    sessionApi.refreshSession.mockRejectedValue(new Error('refresh unavailable'));
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 401 }));
    vi.stubGlobal('fetch', fetchMock);
    renderRuntime(clients);
    fireEvent.click(screen.getByRole('button', { name: 'Publish user A' }));

    await expect(apiFetch('/api/protected')).resolves.toMatchObject({ status: 401 });

    await waitFor(() => expect(clients.at(-1)?.getQueryData(sessionQueryKey)).toEqual(anonymousSession));
    expect(sessionApi.refreshSession).toHaveBeenCalledOnce();
    expect(clients).toHaveLength(3);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('does not let a refresh from a retired identity overwrite a newer identity', async () => {
    const clients: QueryClient[] = [];
    const refresh = deferred<UiSession>();
    sessionApi.refreshSession.mockReturnValue(refresh.promise);
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 401 }));
    vi.stubGlobal('fetch', fetchMock);
    renderRuntime(clients);
    fireEvent.click(screen.getByRole('button', { name: 'Publish user A' }));

    const request = apiFetch('/api/protected');
    await waitFor(() => expect(sessionApi.refreshSession).toHaveBeenCalledOnce());
    fireEvent.click(screen.getByRole('button', { name: 'Publish anonymous' }));
    const anonymousClient = clients.at(-1);
    refresh.resolve(userB);

    await expect(request).resolves.toMatchObject({ status: 401 });
    expect(clients.at(-1)).toBe(anonymousClient);
    expect(anonymousClient?.getQueryData(sessionQueryKey)).toEqual(anonymousSession);
  });

  it('starts a separate refresh when a new identity receives 401 while the retired refresh is pending', async () => {
    const clients: QueryClient[] = [];
    const retiredRefresh = deferred<UiSession>();
    sessionApi.refreshSession.mockReturnValueOnce(retiredRefresh.promise).mockResolvedValueOnce(userB);
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 401 }));
    vi.stubGlobal('fetch', fetchMock);
    renderRuntime(clients);
    fireEvent.click(screen.getByRole('button', { name: 'Publish user A' }));

    const retiredRequest = apiFetch('/api/protected-a');
    await waitFor(() => expect(sessionApi.refreshSession).toHaveBeenCalledOnce());
    fireEvent.click(screen.getByRole('button', { name: 'Publish anonymous' }));

    const currentRequest = apiFetch('/api/protected-b');
    await waitFor(() => expect(sessionApi.refreshSession).toHaveBeenCalledTimes(2));
    await expect(currentRequest).resolves.toMatchObject({ status: 401 });
    expect(clients.at(-1)?.getQueryData(sessionQueryKey)).toEqual(userB);

    retiredRefresh.resolve(userA);
    await expect(retiredRequest).resolves.toMatchObject({ status: 401 });
    expect(clients.at(-1)?.getQueryData(sessionQueryKey)).toEqual(userB);
  });

  it('retires a pending refresh when the identity runtime unmounts', async () => {
    const clients: QueryClient[] = [];
    const refresh = deferred<UiSession>();
    sessionApi.refreshSession.mockReturnValue(refresh.promise);
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 401 }));
    vi.stubGlobal('fetch', fetchMock);
    const view = renderRuntime(clients);
    fireEvent.click(screen.getByRole('button', { name: 'Publish user A' }));

    const request = apiFetch('/api/protected');
    await waitFor(() => expect(sessionApi.refreshSession).toHaveBeenCalledOnce());
    view.unmount();
    refresh.resolve(userB);

    await expect(request).resolves.toMatchObject({ status: 401 });
    expect(clients).toHaveLength(2);
  });
});

function renderRuntime(clients: QueryClient[]) {
  const createQueryClient = () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    clients.push(client);
    return client;
  };
  return render(
    <SessionQueryRuntime createQueryClient={createQueryClient}>
      {runtime => (
        <QueryClientProvider key={runtime.generation} client={runtime.queryClient}>
          <RuntimeProbe runtime={runtime} />
        </QueryClientProvider>
      )}
    </SessionQueryRuntime>
  );
}

function RuntimeProbe({ runtime }: { runtime: SessionQueryRuntimeValue }) {
  const mountedClient = useQueryClient();
  const replaceIdentity = useSessionIdentityBoundary();
  return (
    <>
      <output data-testid="client-match">{mountedClient === runtime.queryClient ? 'same' : 'different'}</output>
      <button type="button" onClick={() => replaceIdentity(userA)}>
        Publish user A
      </button>
      <button type="button" onClick={() => replaceIdentity(anonymousSession)}>
        Publish anonymous
      </button>
      <button type="button" onClick={() => replaceIdentity(userB)}>
        Publish user B
      </button>
    </>
  );
}

function authenticatedSession(username: string, workspaceId: string): UiSession {
  return { authenticated: true, username, workspaceId, roles: ['ADMIN'], expiresAt: null };
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>(fulfill => {
    resolve = fulfill;
  });
  return { promise, resolve };
}
