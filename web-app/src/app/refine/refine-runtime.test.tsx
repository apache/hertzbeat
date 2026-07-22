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

import {
  useDataProvider,
  useIsExistAuthentication,
  useNotification,
  useParsed,
  useRefineContext,
  useResourceParams,
  type DataProvider
} from '@refinedev/core';
import { QueryClient, useQueryClient } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useSession } from '@/core/auth/session-context';
import { sessionQueryKey } from '@/core/auth/session-api';
import { initializeI18n } from '@/core/i18n/i18n';
import { noticeReceiverDataProvider, noticeReceiverResourceName } from '@/features/alert/notice-receiver';
import { noticeRuleDataProvider, noticeRuleResourceName } from '@/features/alert/notice-rule';
import { noticeTemplateDataProvider, noticeTemplateResourceName } from '@/features/alert/notice-template';
import { objectStoreDataProvider } from '@/features/settings/object-store';
import { labelDataProvider, labelResourceName } from '@/features/settings/label/refine';
import { systemConfigDataProvider } from '@/features/settings/system-config/refine';
import { tokenDataProvider } from '@/features/settings/token';

import { AppProviders } from '../providers';
import { appRoutes } from '../router';
import { alertSilenceDataProvider } from './resources/alert-silence-data-provider';

const { authenticatedSession } = vi.hoisted(() => ({
  authenticatedSession: {
    authenticated: true,
    username: 'operator',
    roles: ['ADMIN'],
    workspaceId: 'default',
    expiresAt: null
  }
}));

vi.mock('@/core/auth/session-api', async () => {
  const actual = await vi.importActual<typeof import('@/core/auth/session-api')>('@/core/auth/session-api');
  return { ...actual, getSession: vi.fn().mockResolvedValue(authenticatedSession) };
});

afterEach(() => vi.restoreAllMocks());

describe('production Refine runtime', () => {
  it('shares one Refine-owned QueryClient under the single data router', async () => {
    await initializeI18n();
    const mountSpy = vi.spyOn(QueryClient.prototype, 'mount');
    const observedClients: QueryClient[] = [];

    const routes = withProbeRoute(appRoutes, client => observedClients.push(client));
    const router = createMemoryRouter(routes, { initialEntries: ['/runtime-probe'] });
    render(
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>
    );

    await waitFor(() => expect(screen.getByTestId('session-user')).toHaveTextContent('operator'));
    expect(screen.getByTestId('refine-initialized')).toHaveTextContent('true');
    expect(screen.getByTestId('refine-auth-provider')).toHaveTextContent('false');
    expect(screen.getByTestId('parsed-path')).toHaveTextContent('/runtime-probe');
    expect(screen.getByTestId('mutation-mode')).toHaveTextContent('pessimistic');
    expect(screen.getByTestId('label-resource')).toHaveTextContent('labels|/settings/labels|labels');
    expect(screen.getByTestId('label-provider')).toHaveTextContent('shared');
    expect(screen.getByTestId('object-store-resource')).toHaveTextContent(
      'object-store|/settings/storage/object-store|object-store'
    );
    expect(screen.getByTestId('object-store-provider')).toHaveTextContent('shared');
    expect(screen.getByTestId('system-config-resource')).toHaveTextContent(
      'system-config|/settings/system|system-config'
    );
    expect(screen.getByTestId('system-config-provider')).toHaveTextContent('shared');
    expect(screen.getByTestId('token-resource')).toHaveTextContent('tokens|/settings/tokens|tokens');
    expect(screen.getByTestId('token-provider')).toHaveTextContent('shared');
    expect(screen.getByTestId('notice-template-resource')).toHaveTextContent(
      `${noticeTemplateResourceName}|/settings/notifications/templates|${noticeTemplateResourceName}`
    );
    expect(screen.getByTestId('notice-template-provider')).toHaveTextContent('shared');
    expect(screen.getByTestId('alert-silence-resource')).toHaveTextContent(
      'alert-silences|/alerts/silences|alert-silences'
    );
    expect(screen.getByTestId('alert-silence-provider')).toHaveTextContent('shared');
    expect(screen.getByTestId('notice-receiver-resource')).toHaveTextContent(
      `${noticeReceiverResourceName}|/settings/notifications/receivers|${noticeReceiverResourceName}`
    );
    expect(screen.getByTestId('notice-receiver-provider')).toHaveTextContent('shared');
    expect(screen.getByTestId('notice-rule-resource')).toHaveTextContent(
      `${noticeRuleResourceName}|/settings/notifications/rules|${noticeRuleResourceName}`
    );
    expect(screen.getByTestId('notice-rule-provider')).toHaveTextContent('shared');
    fireEvent.click(screen.getByRole('button', { name: 'Open runtime notification' }));
    expect(await screen.findByText('Runtime notification ready')).toBeInTheDocument();
    const mountedClients = mountSpy.mock.instances;
    expect(mountedClients).toHaveLength(1);
    const observedClient = observedClients.at(-1);
    expect(observedClient).toBe(mountedClients[0]);
    if (!observedClient) throw new Error('The runtime QueryClient was not observed.');
    expect(observedClient.getQueryData(sessionQueryKey)).toEqual(authenticatedSession);
  });
});

function RuntimeProbe({ onClient }: { onClient: (client: QueryClient) => void }) {
  const queryClient = useQueryClient();
  const refine = useRefineContext();
  const hasRefineAuthentication = useIsExistAuthentication();
  const parsed = useParsed();
  const dataProvider = useDataProvider();
  const { resources } = useResourceParams();
  const notification = useNotification();
  const { session } = useSession();
  useEffect(() => {
    onClient(queryClient);
  }, [onClient, queryClient]);
  const labelResource = resources.find(resource => resource.name === labelResourceName);
  const objectStoreResource = resources.find(resource => resource.name === 'object-store');
  const systemConfigResource = resources.find(resource => resource.name === 'system-config');
  const tokenResource = resources.find(resource => resource.name === 'tokens');
  const noticeTemplateResource = resources.find(resource => resource.name === noticeTemplateResourceName);
  const alertSilenceResource = resources.find(resource => resource.name === 'alert-silences');
  const noticeReceiverResource = resources.find(resource => resource.name === noticeReceiverResourceName);
  const noticeRuleResource = resources.find(resource => resource.name === noticeRuleResourceName);
  const labelProvider = resolveProviderState(dataProvider, labelResourceName, labelDataProvider, true);
  const objectStoreProvider = resolveProviderState(dataProvider, 'object-store', objectStoreDataProvider, false);
  const labelResourceText = formatResource(labelResource);
  const objectStoreResourceText = formatResource(objectStoreResource);
  const systemConfigProvider = resolveProviderState(dataProvider, 'system-config', systemConfigDataProvider, false);
  const systemConfigResourceText = formatResource(systemConfigResource);
  const tokenProvider = resolveProviderState(dataProvider, 'tokens', tokenDataProvider, false);
  const tokenResourceText = formatResource(tokenResource);
  const noticeTemplateProvider = resolveProviderState(
    dataProvider,
    noticeTemplateResourceName,
    noticeTemplateDataProvider,
    false
  );
  const noticeTemplateResourceText = formatResource(noticeTemplateResource);
  const alertSilenceProvider = resolveProviderState(dataProvider, 'alert-silences', alertSilenceDataProvider, false);
  const alertSilenceResourceText = formatResource(alertSilenceResource);
  const noticeReceiverProvider = resolveProviderState(
    dataProvider,
    noticeReceiverResourceName,
    noticeReceiverDataProvider,
    false
  );
  const noticeReceiverResourceText = formatResource(noticeReceiverResource);
  const noticeRuleProvider = resolveProviderState(dataProvider, noticeRuleResourceName, noticeRuleDataProvider, false);
  const noticeRuleResourceText = formatResource(noticeRuleResource);

  return (
    <>
      <output data-testid="session-user">{session?.username}</output>
      <output data-testid="refine-initialized">{String(refine.__initialized)}</output>
      <output data-testid="refine-auth-provider">{String(hasRefineAuthentication)}</output>
      <output data-testid="parsed-path">{parsed.pathname}</output>
      <output data-testid="mutation-mode">{refine.mutationMode}</output>
      <output data-testid="label-resource">{labelResourceText}</output>
      <output data-testid="label-provider">{labelProvider}</output>
      <output data-testid="object-store-resource">{objectStoreResourceText}</output>
      <output data-testid="object-store-provider">{objectStoreProvider}</output>
      <output data-testid="system-config-resource">{systemConfigResourceText}</output>
      <output data-testid="system-config-provider">{systemConfigProvider}</output>
      <output data-testid="token-resource">{tokenResourceText}</output>
      <output data-testid="token-provider">{tokenProvider}</output>
      <output data-testid="notice-template-resource">{noticeTemplateResourceText}</output>
      <output data-testid="notice-template-provider">{noticeTemplateProvider}</output>
      <output data-testid="alert-silence-resource">{alertSilenceResourceText}</output>
      <output data-testid="alert-silence-provider">{alertSilenceProvider}</output>
      <output data-testid="notice-receiver-resource">{noticeReceiverResourceText}</output>
      <output data-testid="notice-receiver-provider">{noticeReceiverProvider}</output>
      <output data-testid="notice-rule-resource">{noticeRuleResourceText}</output>
      <output data-testid="notice-rule-provider">{noticeRuleProvider}</output>
      <button
        type="button"
        onClick={() => notification.open?.({ message: 'Runtime notification ready', type: 'success' })}
      >
        Open runtime notification
      </button>
    </>
  );
}

function formatResource(resource: ReturnType<typeof useResourceParams>['resources'][number] | undefined) {
  if (!resource) return '||';
  return `${resource.name}|${String(resource.list ?? '')}|${String(resource.meta?.dataProviderName ?? '')}`;
}

function resolveProviderState(
  resolve: ReturnType<typeof useDataProvider>,
  name: string,
  expected: DataProvider,
  alsoDefault: boolean
) {
  try {
    const namedMatches = resolve(name) === expected;
    const defaultMatches = !alsoDefault || resolve() === expected;
    return namedMatches && defaultMatches ? 'shared' : 'different';
  } catch {
    return 'missing';
  }
}

function withProbeRoute(routes: RouteObject[], onClient: (client: QueryClient) => void): RouteObject[] {
  const [root] = routes;
  if (!root) throw new Error('The application root route is missing.');
  if (root.index === true) throw new Error('The application root route cannot be an index route.');
  const rootRoute: RouteObject = {
    ...root,
    children: [{ path: '/runtime-probe', element: <RuntimeProbe onClient={onClient} /> }]
  };
  delete rootRoute.hydrateFallbackElement;
  return [rootRoute];
}
