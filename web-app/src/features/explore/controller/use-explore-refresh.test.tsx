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
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { GlobalTimeProvider, RouteTimeProvider } from '@/shared/time';
import { useExplorePageController } from './use-explore-page-controller';
import { useMetricInventory } from './use-metric-inventory';

const api = vi.hoisted(() => ({ metric: vi.fn(), inventory: vi.fn() }));
vi.mock('../api/explore-api', async original => ({
  ...(await original<typeof import('../api/explore-api')>()),
  loadMetricSignal: api.metric,
  loadMetricInventory: api.inventory
}));
vi.mock('@/core/auth/session-context', () => ({
  useSession: () => ({
    session: { authenticated: true, username: 'operator', workspaceId: 'default', roles: ['ADMIN'] }
  })
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it.each([true, false])('refreshes exact-window catalog and console once with shared time=%s', async shared => {
  api.metric.mockResolvedValue({
    context: null,
    query: 'process_cpu_usage',
    datasource: 'greptime',
    queryMode: 'explicit',
    results: { status: 200, refId: null, msg: null, frames: [] },
    stats: null,
    emptyStateReason: null,
    errorMessage: null
  });
  api.inventory.mockResolvedValue({
    context: null,
    source: 'greptime-inventory',
    limit: 100,
    truncated: false,
    items: [{ metricName: 'process_cpu_usage', family: null }]
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <MemoryRouter
          initialEntries={[
            '/explore?signal=metrics&query=process_cpu_usage&serviceName=HertzBeat&start=1750000000000&end=1750001800000'
          ]}
        >
          {shared ? (
            <GlobalTimeProvider>
              <RouteTimeProvider policy="route_owned">{children}</RouteTimeProvider>
            </GlobalTimeProvider>
          ) : (
            children
          )}
        </MemoryRouter>
      </QueryClientProvider>
    );
  }
  const { result } = renderHook(
    () => {
      const controller = useExplorePageController();
      const inventory = useMetricInventory(controller.query);
      return { controller, inventory };
    },
    { wrapper: Wrapper }
  );
  await waitFor(() => expect(result.current.inventory.state).toBe('ready'));
  await waitFor(() => expect(result.current.controller.result.kind).toBe('metric'));
  expect(api.metric).toHaveBeenCalledOnce();
  expect(api.inventory).toHaveBeenCalledOnce();
  await act(() => result.current.controller.refresh());
  await waitFor(() => {
    expect(api.metric).toHaveBeenCalledTimes(2);
    expect(api.inventory).toHaveBeenCalledTimes(2);
  });
  expect(api.inventory).toHaveBeenLastCalledWith(
    expect.objectContaining({
      start: 1750000000000,
      end: 1750001800000,
      serviceName: 'HertzBeat'
    }),
    '',
    expect.any(AbortSignal)
  );
  expect(result.current.controller.query).toMatchObject({ start: 1750000000000, end: 1750001800000 });
});
