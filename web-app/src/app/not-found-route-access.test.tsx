/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import type { ReactNode } from 'react';
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router-dom';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { anonymousSession, type UiSession } from '@/core/auth/session-api';
import { SessionContext, type SessionState } from '@/core/auth/session-context';
import { SessionIdentityProvider } from '@/core/auth/session-identity-provider';
import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';

vi.mock('./refine/refine-runtime', () => ({ RefineRuntime: Outlet }));
vi.mock('@/layout/basic/basic-layout', () => ({ BasicLayout: Outlet }));
vi.mock('@/features/setup', () => ({
  SetupPage: () => null
}));
vi.mock('@/features/setup/route/setup-route-runtime', () => ({
  SetupRouteRuntime: ({ product }: { product: ReactNode }) => product
}));

import { appRoutes } from './app-routes';
import { getAppRoute } from './route-registry';

describe('top-level unknown route boundary', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });
  afterEach(() => {
    cleanup();
    window.sessionStorage.clear();
  });

  it.each([
    ['anonymous', { loading: false, retry: vi.fn(), session: anonymousSession }],
    ['session failure', { failure: 'unavailable', loading: false, retry: vi.fn(), session: undefined }],
    ['authenticated', { loading: false, retry: vi.fn(), session: authenticatedSession }]
  ] satisfies [string, SessionState][])('renders the same 404 for an %s session', async (_label, sessionState) => {
    const router = renderApp(
      '/unknown/deep-link?view=operations&token=must-not-leak&authorization=must-not-leak#details',
      sessionState
    );

    expect(await screen.findByRole('heading', { name: i18n.t('common.notFound.title') })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/unknown/deep-link');
    await waitFor(() => expect(router.state.location.search).toBe('?view=operations'));
    expect(router.state.location.hash).toBe('#details');
    expect(router.state.location.search).not.toContain('must-not-leak');
    expect(screen.queryByLabelText(i18n.t('auth.username'))).not.toBeInTheDocument();
  });

  it('keeps a known protected route behind the sanitized anonymous login redirect', async () => {
    const protectedPath = getAppRoute('topology').path;
    const router = renderApp(`${protectedPath}?view=operations&access_token=private`, {
      loading: false,
      retry: vi.fn(),
      session: anonymousSession
    });

    await waitFor(() => expect(router.state.location.pathname).toBe('/passport/login'), { timeout: 15_000 });
    expect(new URLSearchParams(router.state.location.search).get('redirect')).toBe(`${protectedPath}?view=operations`);
    expect(router.state.location.search).not.toContain('private');
  });
});

function renderApp(path: string, sessionState: SessionState) {
  const router = createMemoryRouter(appRoutes, { initialEntries: [path] });
  render(
    <I18nextProvider i18n={i18n}>
      <SessionIdentityProvider replaceIdentity={vi.fn()}>
        <SessionContext.Provider value={sessionState}>
          <RouterProvider router={router} />
        </SessionContext.Provider>
      </SessionIdentityProvider>
    </I18nextProvider>
  );
  return router;
}

const authenticatedSession: UiSession = {
  authenticated: true,
  username: 'operator',
  roles: ['ADMIN'],
  workspaceId: 'default',
  expiresAt: null
};
