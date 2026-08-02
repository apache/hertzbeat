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
import en from '@/assets/i18n/en-us.json';
import ja from '@/assets/i18n/ja-jp.json';
import pt from '@/assets/i18n/pt-br.json';
import zhCn from '@/assets/i18n/zh-cn.json';
import zhTw from '@/assets/i18n/zh-tw.json';
import { loadPlugins } from '@/features/settings/plugin/api/plugin-api';
import { loadTokens } from '@/features/settings/token/api/token-api';
import {
  detectInstrumentationSignals,
  renderInstrumentationGuide
} from '@/features/instrumentation/api/instrumentation-api';
import type { DetectionRequest, RenderRequest } from '@/features/instrumentation/model/instrumentation-v2-contract';

import { ResourceRouteAccess } from './resource-route-access';
import { LegacyRouteRedirect } from './legacy-route-redirect';
import { getAppRoute, legacyRouteCatalog } from './route-registry';

vi.mock('@/features/settings/plugin/api/plugin-api', () => ({ loadPlugins: vi.fn() }));
vi.mock('@/features/settings/token/api/token-api', () => ({ loadTokens: vi.fn() }));
vi.mock('@/features/instrumentation/api/instrumentation-api', () => ({
  detectInstrumentationSignals: vi.fn(),
  renderInstrumentationGuide: vi.fn()
}));

const featureReads = {
  instrumentation: {
    detect: vi.mocked(detectInstrumentationSignals),
    render: vi.mocked(renderInstrumentationGuide)
  },
  plugins: vi.mocked(loadPlugins),
  tokens: vi.mocked(loadTokens)
};
const renderRequest: RenderRequest = {
  schemaVersion: 2,
  sourceKind: 'quick_start',
  recipeId: 'opentelemetry_telemetrygen',
  intakeProfileId: 'server',
  service: { name: 'access-proof', namespace: '', environment: '' }
};
const detectionRequest: DetectionRequest = { ...renderRequest, startedAt: 1 };

describe('resource direct-route access', () => {
  beforeEach(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });

  afterEach(() => {
    cleanup();
    featureReads.plugins.mockReset();
    featureReads.tokens.mockReset();
    featureReads.instrumentation.detect.mockReset();
    featureReads.instrumentation.render.mockReset();
  });

  it.each([
    ['tokens', 'USER'],
    ['tokens', 'GUEST'],
    ['plugins', 'USER'],
    ['plugins', 'GUEST']
  ] as const)('blocks %s for %s before its feature read mounts', async (routeId, role) => {
    renderRoute(getAppRoute(routeId).path, role);

    expect(await screen.findByText('Additional permission required')).toBeInTheDocument();
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

    expect(await screen.findByText('Additional permission required')).toBeInTheDocument();
    expect(featureReads.plugins).not.toHaveBeenCalled();
  });

  it('blocks instrumentation for GUEST before render or detect can mount', async () => {
    renderRoute(getAppRoute('instrumentation').path, 'GUEST');

    expect(await screen.findByText('Additional permission required')).toBeInTheDocument();
    expect(featureReads.instrumentation.render).not.toHaveBeenCalled();
    expect(featureReads.instrumentation.detect).not.toHaveBeenCalled();
  });

  it.each(['ADMIN', 'USER'])('admits %s to instrumentation', async role => {
    renderRoute(getAppRoute('instrumentation').path, role);

    await waitFor(() => expect(featureReads.instrumentation.render).toHaveBeenCalledOnce());
    expect(featureReads.instrumentation.detect).toHaveBeenCalledOnce();
  });

  it('provides role-neutral permission copy in every runtime locale', () => {
    expect(en.common.permission.additionalRequiredTitle).toBe('Additional permission required');
    for (const locale of [ja, pt, zhCn, zhTw]) {
      expect(locale.common.permission.additionalRequiredTitle.trim()).not.toBe('');
      expect(locale.common.permission.additionalRequiredTitle).not.toBe(locale.common.permission.roleRequiredTitle);
    }
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
          protectedRoute('instrumentation'),
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

function protectedRoute(routeId: 'tokens' | 'plugins' | 'instrumentation') {
  return {
    path: getAppRoute(routeId).path,
    element: <ResourceRouteAccess routeId={routeId} />,
    children: [{ index: true, element: <FeatureRead routeId={routeId} /> }]
  };
}

function FeatureRead({ routeId }: { routeId: 'tokens' | 'plugins' | 'instrumentation' }) {
  useEffect(() => {
    if (routeId === 'tokens') void loadTokens();
    else if (routeId === 'plugins') void loadPlugins({ search: '', pageIndex: 0, pageSize: 8 });
    else {
      void renderInstrumentationGuide(renderRequest);
      void detectInstrumentationSignals(detectionRequest);
    }
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
