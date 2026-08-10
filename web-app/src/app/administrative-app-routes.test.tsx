/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import type { ReactNode } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { UiSession } from '@/core/auth/session-api';
import { SessionContext } from '@/core/auth/session-context';
import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';

import { appRoutes } from './app-routes';

const probes = vi.hoisted(() => ({
  deploymentApi: vi.fn(),
  deploymentLoader: vi.fn(),
  pluginApi: vi.fn(),
  pluginLoader: vi.fn(),
  tokenApi: vi.fn(),
  tokenLoader: vi.fn()
}));

vi.mock('@/features/setup', () => ({
  SetupPage: () => null
}));
vi.mock('@/features/setup/route/setup-route-runtime', () => ({
  SetupRouteRuntime: ({ product }: { product: ReactNode }) => product
}));
vi.mock('./refine/refine-runtime', async () => {
  const { Outlet } = await import('react-router-dom');
  return { RefineRuntime: Outlet };
});
vi.mock('@/core/auth/auth-gate', async () => {
  const { Outlet } = await import('react-router-dom');
  return { AuthGate: Outlet };
});
vi.mock('@/layout/basic/basic-layout', async () => {
  const { Outlet } = await import('react-router-dom');
  return { BasicLayout: Outlet };
});
vi.mock('@/features/settings/token', async () => {
  const React = await import('react');
  probes.tokenLoader.mockImplementation(() =>
    Promise.resolve({
      Component: () => {
        React.useEffect(() => {
          probes.tokenApi();
        }, []);
        return React.createElement('div', { 'data-testid': 'tokens-page' });
      }
    })
  );
  return { loadTokenPageRoute: probes.tokenLoader };
});
vi.mock('@/features/settings/plugin', async () => {
  const React = await import('react');
  probes.pluginLoader();
  return {
    PluginPage: () => {
      React.useEffect(() => {
        probes.pluginApi();
      }, []);
      return React.createElement('div', { 'data-testid': 'plugins-page' });
    }
  };
});
vi.mock('@/features/deployment', async () => {
  const React = await import('react');
  probes.deploymentLoader();
  return {
    DeploymentPage: () => {
      React.useEffect(() => {
        probes.deploymentApi();
      }, []);
      return React.createElement('div', { 'data-testid': 'deployment-page' });
    }
  };
});

describe('actual administrative app routes', () => {
  beforeEach(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });

  afterEach(() => {
    cleanup();
    probes.deploymentApi.mockClear();
    probes.deploymentLoader.mockClear();
    probes.pluginApi.mockClear();
    probes.pluginLoader.mockClear();
    probes.tokenApi.mockClear();
    probes.tokenLoader.mockClear();
  });

  it.each([
    ['/settings/tokens', 'USER'],
    ['/settings/tokens', 'GUEST'],
    ['/settings/plugins', 'USER'],
    ['/settings/plugins', 'GUEST'],
    ['/settings/deployment', 'USER'],
    ['/settings/deployment', 'GUEST']
  ])('does not mount the feature loader or API at %s for %s', async (path, role) => {
    renderAppRoute(path, role);

    expect(
      (await screen.findByText(i18n.t('common.permission.additionalRequiredTitle'))).closest('[data-state]')
    ).toHaveAttribute('data-state', 'permission');
    expect(document.querySelector('.ant-alert')).not.toBeInTheDocument();
    expect(probes.tokenLoader).not.toHaveBeenCalled();
    expect(probes.tokenApi).not.toHaveBeenCalled();
    expect(probes.pluginLoader).not.toHaveBeenCalled();
    expect(probes.pluginApi).not.toHaveBeenCalled();
    expect(probes.deploymentLoader).not.toHaveBeenCalled();
    expect(probes.deploymentApi).not.toHaveBeenCalled();
  });

  it('admits ADMIN to the Token loader and page API', async () => {
    renderAppRoute('/settings/tokens', 'ADMIN');

    expect(await screen.findByTestId('tokens-page')).toBeInTheDocument();
    expect(probes.tokenLoader).toHaveBeenCalledOnce();
    await waitFor(() => expect(probes.tokenApi).toHaveBeenCalledOnce());
  });

  it('admits ADMIN to the Plugin loader and page API', async () => {
    renderAppRoute('/settings/plugins', 'ADMIN');

    expect(await screen.findByTestId('plugins-page')).toBeInTheDocument();
    expect(probes.pluginLoader).toHaveBeenCalledOnce();
    await waitFor(() => expect(probes.pluginApi).toHaveBeenCalledOnce());
  });

  it('admits ADMIN to the guarded Deployment loader and page API', async () => {
    renderAppRoute('/settings/deployment', 'ADMIN');

    expect(await screen.findByTestId('deployment-page')).toBeInTheDocument();
    expect(probes.deploymentLoader).toHaveBeenCalledOnce();
    await waitFor(() => expect(probes.deploymentApi).toHaveBeenCalledOnce());
  });

  it('converges the legacy Plugin path on the guarded canonical route', async () => {
    renderAppRoute('/setting/plugin', 'USER');

    expect(await screen.findByText(i18n.t('common.permission.additionalRequiredTitle'))).toBeInTheDocument();
    expect(probes.pluginLoader).not.toHaveBeenCalled();
    expect(probes.pluginApi).not.toHaveBeenCalled();
  });
});

function renderAppRoute(path: string, role: string) {
  const router = createMemoryRouter(appRoutes, { initialEntries: [path] });
  return render(
    <I18nextProvider i18n={i18n}>
      <SessionContext.Provider value={{ loading: false, retry: vi.fn(), session: session(role) }}>
        <RouterProvider router={router} />
      </SessionContext.Provider>
    </I18nextProvider>
  );
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
