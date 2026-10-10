/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { cleanup, fireEvent, render, screen, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider, useLocation, useNavigate } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { GlobalTimeProvider, RouteTimeProvider } from '@/shared/time';
import { parseServicesQuery } from '@/shared/navigation/services-path';
import { parseExploreQuery } from '../../explore/model/explore-url-model';
import { exploreHandoffState } from '../../explore/model/explore-query';
import { buildSignalApiPath } from '../../explore/api/explore-api';
import { ServicesPage } from '../pages/services-page';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../api/services-api', () => ({
  loadServices: vi.fn().mockResolvedValue({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 }),
  loadServiceDetail: vi.fn().mockResolvedValue({
    entity: { id: 7, type: 'service', name: 'checkout' },
    identities: [],
    relations: [],
    monitorPreview: { items: [], total: 0, complete: true }
  }),
  loadServiceOperations: vi
    .fn()
    .mockResolvedValue([
      { value: 'GET /failure', traceCount: 12, errorTraceCount: 12, latencyAvgMs: null, latencyP95Ms: null }
    ]),
  loadServiceTraceFreshness: vi.fn().mockResolvedValue(null)
}));
vi.mock('@/features/entity/queries', async original => ({
  ...(await original<typeof import('@/features/entity/queries')>()),
  loadEntityRedSignal: vi.fn().mockRejectedValue(new Error('unavailable'))
}));
afterEach(cleanup);

it('returns a directly entered service detail to its filtered directory without carrying signal identity', async () => {
  const router = createMemoryRouter(
    [
      {
        path: '/observability/services',
        element: (
          <RouteTimeProvider policy="route_owned" canonicalizeInvalidExact={false}>
            <ServicesPage />
          </RouteTimeProvider>
        )
      }
    ],
    {
      initialEntries: [
        '/observability/services?entityId=7&serviceName=checkout&serviceNamespace=commerce&environment=prod&operation=GET%20%2Ffailure&errorsOnly=true&search=check&environmentFilter=prod&pageIndex=2&start=1750000000000&end=1750000060000&timeZone=UTC'
      ]
    }
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <GlobalTimeProvider>
        <RouterProvider router={router} />
      </GlobalTimeProvider>
    </QueryClientProvider>
  );
  expect(screen.queryByRole('region', { name: 'services.directory' })).not.toBeInTheDocument();
  fireEvent.click(await screen.findByRole('button', { name: 'services.backDirectory' }));
  await waitFor(() => expect(screen.getByRole('region', { name: 'services.directory' })).toBeInTheDocument());
  expect(parseServicesQuery(new URLSearchParams(router.state.location.search))).toEqual({
    search: 'check',
    environmentFilter: 'prod',
    pageIndex: 2,
    start: 1750000000000,
    end: 1750000060000,
    timeZone: 'UTC'
  });
  expect(screen.queryByRole('region', { name: 'services.overview' })).not.toBeInTheDocument();
  router.dispose();
});

it('navigates once from the operation button to a lazy Explore route and restores its service context', async () => {
  let completeExplore: () => void = () => {};
  const exploreReady = new Promise<void>(resolve => {
    completeExplore = resolve;
  });
  const initial =
    '/observability/services?entityId=7&serviceName=checkout&serviceNamespace=commerce&environment=prod&search=check&environmentFilter=prod&start=1750000000000&end=1750000060000&timeZone=UTC';
  const router = createMemoryRouter(
    [
      {
        path: '/observability/services',
        element: (
          <RouteTimeProvider policy="route_owned" canonicalizeInvalidExact={false}>
            <ServicesPage />
          </RouteTimeProvider>
        )
      },
      {
        path: '/explore',
        lazy: async () => {
          await exploreReady;
          return { Component: ExploreDestination };
        }
      }
    ],
    { initialEntries: [initial] }
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <GlobalTimeProvider>
        <RouterProvider router={router} />
      </GlobalTimeProvider>
    </QueryClientProvider>
  );
  fireEvent.click(await screen.findByRole('button', { name: 'services.errorAction' }));
  await waitFor(() => expect(router.state.navigation.location?.pathname).toBe('/explore'));
  // Loading the lazy destination must not commit a second navigation back into the source page.
  expect(router.state.location.pathname + router.state.location.search).toBe(initial);
  act(() => completeExplore());
  await waitFor(() => expect(router.state.location.pathname).toBe('/explore'));
  const query = parseExploreQuery(new URLSearchParams(router.state.location.search));
  expect(exploreHandoffState(query)).toBe('scoped');
  expect(Object.fromEntries(new URL(buildSignalApiPath(query), 'https://hertzbeat.local').searchParams)).toMatchObject({
    operationName: 'GET /failure',
    errorOnly: 'true',
    spanScope: 'root',
    entityId: '7',
    serviceName: 'checkout',
    serviceNamespace: 'commerce',
    environment: 'prod',
    start: '1750000000000',
    end: '1750000060000'
  });
  fireEvent.click(screen.getByRole('button', { name: 'Back to services' }));
  await waitFor(() => expect(router.state.location.pathname).toBe('/observability/services'));
  expect(parseServicesQuery(new URLSearchParams(router.state.location.search))).toMatchObject({
    entityId: '7',
    operation: 'GET /failure',
    errorsOnly: true,
    search: 'check',
    environmentFilter: 'prod',
    start: 1750000000000,
    end: 1750000060000
  });
  router.dispose();
});

function ExploreDestination() {
  const location = useLocation();
  const navigate = useNavigate();
  const query = parseExploreQuery(new URLSearchParams(location.search));
  return (
    <button type="button" onClick={() => void navigate(query.servicesReturnTo!)}>
      Back to services
    </button>
  );
}
