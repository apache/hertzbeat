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

import { useParsed, useRefineContext } from '@refinedev/core';
import { QueryClient, useQueryClient } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useSession } from '@/core/auth/session-context';
import { sessionQueryKey } from '@/core/auth/session-api';
import { initializeI18n } from '@/core/i18n/i18n';

import { AppProviders } from '../providers';
import { appRoutes } from '../router';

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
    render(<AppProviders><RouterProvider router={router} /></AppProviders>);

    await waitFor(() => expect(screen.getByTestId('session-user')).toHaveTextContent('operator'));
    expect(screen.getByTestId('refine-initialized')).toHaveTextContent('true');
    expect(screen.getByTestId('parsed-path')).toHaveTextContent('/runtime-probe');
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
  const parsed = useParsed();
  const { session } = useSession();
  useEffect(() => onClient(queryClient), [onClient, queryClient]);

  return (
    <>
      <output data-testid="session-user">{session?.username}</output>
      <output data-testid="refine-initialized">{String(refine.__initialized)}</output>
      <output data-testid="parsed-path">{parsed.pathname}</output>
    </>
  );
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
