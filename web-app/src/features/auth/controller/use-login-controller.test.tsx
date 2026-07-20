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
import { act, renderHook, waitFor } from '@testing-library/react';
import { StrictMode, type PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SessionRequestError, type UiSession } from '@/core/auth/session-api';
import { applicationRoutePaths } from '@/shared/navigation/app-paths';

const sessionApi = vi.hoisted(() => ({ loginSession: vi.fn() }));

const runtime = vi.hoisted(() => ({
  navigate: vi.fn(),
  redirect: null as string | null,
  replaceIdentity: vi.fn(),
  session: {
    failure: undefined as 'unavailable' | 'contract' | 'error' | undefined,
    loading: false,
    retry: vi.fn(),
    session: { authenticated: true }
  }
}));

vi.mock('react-router-dom', async importOriginal => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => runtime.navigate,
  useSearchParams: () => [new URLSearchParams(runtime.redirect ? { redirect: runtime.redirect } : {})]
}));
vi.mock('@/core/auth/session-context', () => ({ useSession: () => runtime.session }));
vi.mock('@/core/auth/session-identity-context', () => ({
  useSessionIdentityBoundary: () => runtime.replaceIdentity
}));
vi.mock('@/core/auth/session-api', async () => {
  const actual = await vi.importActual<typeof import('@/core/auth/session-api')>('@/core/auth/session-api');
  return { ...actual, loginSession: sessionApi.loginSession };
});
vi.mock('@/shared/navigation/app-paths', () => ({
  applicationRoutePaths: { dashboard: '/canonical-dashboard', login: '/canonical-login' }
}));

import { useLoginController } from './use-login-controller';

describe('login controller navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runtime.redirect = null;
    runtime.session.failure = undefined;
    runtime.session.loading = false;
    runtime.session.session.authenticated = true;
  });

  it('classifies a failed login, admits a retry, and never gives either credential to MutationCache', async () => {
    runtime.session.session.authenticated = false;
    sessionApi.loginSession
      .mockRejectedValueOnce(new SessionRequestError('invalid-credentials'))
      .mockResolvedValueOnce(authenticatedSession);
    const hook = renderLoginController();

    await act(() => hook.result.current.submit({ identifier: 'operator', credential: 'failed-secret' }));

    expect(hook.result.current.errorKey).toBe('auth.invalidCredentials');
    expect(hook.result.current.pending).toBe(false);
    expectMutationCacheNotToContain(hook.client, 'failed-secret');

    await act(() => hook.result.current.submit({ identifier: 'operator', credential: 'retry-secret' }));

    expect(sessionApi.loginSession).toHaveBeenCalledTimes(2);
    expect(runtime.replaceIdentity).toHaveBeenCalledWith(authenticatedSession);
    expect(hook.result.current.errorKey).toBeUndefined();
    expectMutationCacheNotToContain(hook.client, 'failed-secret', 'retry-secret');
  });

  it('publishes successful identity and navigation without giving the credential to MutationCache', async () => {
    runtime.session.session.authenticated = false;
    sessionApi.loginSession.mockResolvedValue(authenticatedSession);
    const hook = renderLoginController();

    await act(() => hook.result.current.submit({ identifier: 'operator', credential: 'success-secret' }));

    expect(runtime.replaceIdentity).toHaveBeenCalledWith(authenticatedSession);
    expectMutationCacheNotToContain(hook.client, 'success-secret');

    runtime.session.session.authenticated = true;
    hook.rerender();
    await waitFor(() =>
      expect(runtime.navigate).toHaveBeenCalledWith(applicationRoutePaths.dashboard, { replace: true })
    );
    expectMutationCacheNotToContain(hook.client, 'success-secret');
  });

  it('does not publish a late login completion after unmount or retain its credential in MutationCache', async () => {
    runtime.session.session.authenticated = false;
    const login = deferred<UiSession>();
    sessionApi.loginSession.mockReturnValue(login.promise);
    const hook = renderLoginController();
    let completion: Promise<void> | undefined;

    act(() => {
      completion = hook.result.current.submit({ identifier: 'operator', credential: 'unmounted-secret' });
    });
    expect(hook.result.current.pending).toBe(true);
    expectMutationCacheNotToContain(hook.client, 'unmounted-secret');

    hook.unmount();
    login.resolve(authenticatedSession);
    await completion;

    expect(runtime.replaceIdentity).not.toHaveBeenCalled();
    expectMutationCacheNotToContain(hook.client, 'unmounted-secret');
  });

  it('navigates once per stable authenticated target under Strict Mode and admits a real target change', async () => {
    runtime.redirect = '/explore?signal=logs';
    const hook = renderLoginController();

    await waitFor(() => expect(runtime.navigate).toHaveBeenCalledWith('/explore?signal=logs', { replace: true }));
    expect(runtime.navigate).toHaveBeenCalledTimes(1);

    hook.rerender();
    expect(runtime.navigate).toHaveBeenCalledTimes(1);

    runtime.session.loading = true;
    hook.rerender();
    runtime.session.loading = false;
    hook.rerender();
    expect(runtime.navigate).toHaveBeenCalledTimes(1);

    runtime.redirect = '/alerts';
    hook.rerender();
    await waitFor(() => expect(runtime.navigate).toHaveBeenCalledTimes(2));
    expect(runtime.navigate).toHaveBeenLastCalledWith('/alerts', { replace: true });
  });

  it('falls back to the canonical dashboard for an unsafe redirect', async () => {
    runtime.redirect = 'https://outside.example/private';
    renderLoginController();

    await waitFor(() =>
      expect(runtime.navigate).toHaveBeenCalledWith(applicationRoutePaths.dashboard, { replace: true })
    );
    expect(runtime.navigate).toHaveBeenCalledTimes(1);
  });
});

function renderLoginController() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const wrapper = ({ children }: PropsWithChildren) => (
    <StrictMode>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </StrictMode>
  );
  return { ...renderHook(() => useLoginController(), { wrapper }), client };
}

const authenticatedSession: UiSession = {
  authenticated: true,
  username: 'operator',
  roles: ['ADMIN'],
  workspaceId: 'default',
  expiresAt: null
};

function expectMutationCacheNotToContain(client: QueryClient, ...credentials: string[]) {
  const cachedVariables = JSON.stringify(
    client
      .getMutationCache()
      .getAll()
      .map(mutation => mutation.state.variables)
  );
  for (const credential of credentials) expect(cachedVariables).not.toContain(credential);
}

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>(settle => {
    resolve = settle;
  });
  return { promise, resolve };
}
