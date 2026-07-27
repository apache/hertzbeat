/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SessionContext } from '@/core/auth/session-context';
import type { UiSession } from '@/core/auth/session-api';
import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import { loadPlugins } from '@/features/settings/plugin/api/plugin-api';
import { loadTokens } from '@/features/settings/token/api/token-api';

import { AdministrativeRouteAccess } from './administrative-route-access';
import { LegacyRouteRedirect } from './legacy-route-redirect';
import { getAppRoute, legacyRouteCatalog } from './route-registry';

vi.mock('@/features/settings/plugin/api/plugin-api', () => ({ loadPlugins: vi.fn() }));
vi.mock('@/features/settings/token/api/token-api', () => ({ loadTokens: vi.fn() }));

const featureReads = { plugins: vi.mocked(loadPlugins), tokens: vi.mocked(loadTokens) };

describe('administrative direct-route access', () => {
  beforeEach(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });

  afterEach(() => {
    cleanup();
    featureReads.plugins.mockReset();
    featureReads.tokens.mockReset();
  });

  it.each([
    ['tokens', 'USER'],
    ['tokens', 'GUEST'],
    ['plugins', 'USER'],
    ['plugins', 'GUEST']
  ] as const)('blocks %s for %s before its feature read mounts', async (routeId, role) => {
    renderRoute(getAppRoute(routeId).path, role);

    expect(await screen.findByText('Administrator access required')).toBeInTheDocument();
    expect(screen.getByText('Your account does not have permission to open this page.')).toBeInTheDocument();
    expect(featureReads[routeId]).not.toHaveBeenCalled();
  });

  it.each(['tokens', 'plugins'] as const)('admits ADMIN to %s and mounts its feature read', async routeId => {
    renderRoute(getAppRoute(routeId).path, 'ADMIN');

    await waitFor(() => expect(featureReads[routeId]).toHaveBeenCalledOnce());
    expect(screen.getByTestId(`${routeId}-page`)).toBeInTheDocument();
  });

  it('converges the Plugin legacy path on the guarded canonical route without a feature read', async () => {
    renderRoute('/setting/plugin', 'USER');

    expect(await screen.findByText('Administrator access required')).toBeInTheDocument();
    expect(featureReads.plugins).not.toHaveBeenCalled();
  });
});

function renderRoute(initialEntry: string, role: string) {
  const pluginLegacy = legacyRouteCatalog.find(definition => definition.targetRouteId === 'plugins');
  if (!pluginLegacy) throw new Error('Expected Plugin legacy route.');
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: <Outlet />,
        children: [
          protectedRoute('tokens'),
          protectedRoute('plugins'),
          {
            path: pluginLegacy.path,
            element: <LegacyRouteRedirect definition={pluginLegacy} />
          }
        ]
      }
    ],
    { initialEntries: [initialEntry] }
  );
  render(
    <I18nextProvider i18n={i18n}>
      <SessionContext.Provider value={{ loading: false, retry: vi.fn(), session: session(role) }}>
        <RouterProvider router={router} />
      </SessionContext.Provider>
    </I18nextProvider>
  );
}

function protectedRoute(routeId: 'tokens' | 'plugins') {
  return {
    path: getAppRoute(routeId).path,
    element: <AdministrativeRouteAccess routeId={routeId} />,
    children: [{ index: true, element: <FeatureRead routeId={routeId} /> }]
  };
}

function FeatureRead({ routeId }: { routeId: 'tokens' | 'plugins' }) {
  useEffect(() => {
    if (routeId === 'tokens') void loadTokens();
    else void loadPlugins({ search: '', pageIndex: 0, pageSize: 8 });
  }, [routeId]);
  return <div data-testid={`${routeId}-page`} />;
}

function session(role: string): UiSession {
  return {
    authenticated: true,
    username: 'operator',
    roles: [role],
    workspaceId: 'default',
    expiresAt: null
  };
}
