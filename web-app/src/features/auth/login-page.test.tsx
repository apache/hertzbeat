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
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { SessionProvider } from '@/core/auth/session-provider';
import { anonymousSession, sessionQueryKey, type UiSession } from '@/core/auth/session-api';
import { SessionContext, type SessionState } from '@/core/auth/session-context';
import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';

const sessionApi = vi.hoisted(() => ({ loginSession: vi.fn() }));
vi.mock('@/core/auth/session-api', async () => {
  const actual = await vi.importActual<typeof import('@/core/auth/session-api')>('@/core/auth/session-api');
  return { ...actual, loginSession: sessionApi.loginSession };
});

import { LoginPage } from './login-page';

const authenticated = {
  authenticated: true,
  username: 'operator',
  roles: ['ADMIN'],
  workspaceId: 'default',
  expiresAt: null
};

describe('LoginPage', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  it('locks duplicate submissions until the first login settles', async () => {
    let resolveLogin: (value: typeof authenticated) => void = () => undefined;
    sessionApi.loginSession.mockReturnValue(new Promise(resolve => { resolveLogin = resolve; }));
    renderLogin();

    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'operator' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'credential-value' } });
    const form = screen.getByRole('button', { name: 'Sign in' }).closest('form');
    if (!form) throw new Error('The login form is missing.');
    fireEvent.submit(form);
    fireEvent.submit(form);

    await waitFor(() => expect(sessionApi.loginSession).toHaveBeenCalledTimes(1));
    expect(sessionApi.loginSession).toHaveBeenCalledTimes(1);
    resolveLogin(authenticated);
    await waitFor(() => expect(screen.getByTestId('route')).toHaveTextContent('/dashboard'));
    expect(sessionApi.loginSession).toHaveBeenCalledTimes(1);
  });

  it('redirects an existing authenticated session through a safe local target', async () => {
    renderLogin('/passport/login?redirect=https://outside.example', authenticated);

    await waitFor(() => expect(screen.getByTestId('route')).toHaveTextContent('/dashboard'));
    expect(sessionApi.loginSession).not.toHaveBeenCalled();
  });

  it('never renders a raw backend authentication error', async () => {
    const { SessionRequestError } = await import('@/core/auth/session-api');
    sessionApi.loginSession.mockRejectedValue(new SessionRequestError('invalid-credentials'));
    renderLogin();
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'operator' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'bad-credential' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('The username or password is incorrect.')).toBeInTheDocument();
    expect(screen.queryByText(/internal authentication detail/i)).not.toBeInTheDocument();
  });

  it('shows session checking without exposing the credential form', () => {
    renderLoginWithSessionState({
      session: undefined,
      loading: true,
      unavailable: false,
      retry: vi.fn()
    });

    expect(screen.getByLabelText('Checking the current session')).toBeInTheDocument();
    expect(screen.queryByLabelText('Username')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();
  });

  it('keeps session unavailability distinct from anonymous and retries through the provider', () => {
    const retry = vi.fn();
    renderLoginWithSessionState({
      session: undefined,
      loading: false,
      unavailable: true,
      retry
    });

    expect(screen.getByText('The service is unavailable. Check the backend connection and try again.'))
      .toBeInTheDocument();
    expect(screen.queryByLabelText('Username')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(retry).toHaveBeenCalledOnce();
  });
});

function renderLogin(
  initialEntry = '/passport/login',
  initialSession: UiSession = anonymousSession
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false, staleTime: Number.POSITIVE_INFINITY }
    }
  });
  queryClient.setQueryData(sessionQueryKey, initialSession);
  return render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <MemoryRouter initialEntries={[initialEntry]}>
            <Routes>
              <Route path="/passport/login" element={<><LoginPage /><LocationProbe /></>} />
              <Route path="/dashboard" element={<LocationProbe />} />
            </Routes>
          </MemoryRouter>
        </SessionProvider>
      </QueryClientProvider>
    </I18nextProvider>
  );
}

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="route">{`${location.pathname}${location.search}`}</output>;
}

function renderLoginWithSessionState(sessionState: SessionState) {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <SessionContext.Provider value={sessionState}>
          <MemoryRouter initialEntries={['/passport/login']}>
            <LoginPage />
          </MemoryRouter>
        </SessionContext.Provider>
      </QueryClientProvider>
    </I18nextProvider>
  );
}
