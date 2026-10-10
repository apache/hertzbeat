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

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from 'antd';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import { BasicLayout } from '@/layout/basic/basic-layout';
import { ExplorePage } from '@/features/explore';

vi.mock('@refinedev/core', async original => ({
  ...(await original<typeof import('@refinedev/core')>()),
  useResourceParams: () => ({
    action: 'list',
    resource: {
      meta: {
        shell: {
          capability: 'supported',
          labelKey: 'menu.explore',
          navigation: true,
          order: 1,
          timePolicy: 'route_owned'
        }
      }
    }
  })
}));
// Retain the real shell/context/time ownership; its unrelated status and navigation presentations need no APIs.
vi.mock('@/layout/shell/shell-header', () => ({ ShellHeader: () => <header>Shell</header> }));
vi.mock('@/layout/shell/shell-navigation', () => ({ ShellNavigation: () => <nav /> }));
vi.mock('@/features/explore/api/explore-saved-query-api', () => ({
  loadSavedQueries: () => Promise.resolve([]),
  saveQueryRecord: vi.fn(),
  deleteQueryRecord: vi.fn()
}));
vi.mock('@/features/explore/pages/explore-workspace-results', () => ({ ExploreWorkspaceResults: () => null }));
vi.mock('@/features/explore/api/explore-api', async original => ({
  ...(await original<typeof import('@/features/explore/api/explore-api')>()),
  loadMetricSignal: () => Promise.resolve({ kind: 'selection_required' })
}));
beforeAll(async () => {
  await initializeI18n();
  await loadLocale('en-US');
});
afterEach(cleanup);

it('opens the directory through the real Shell/RouteTime canonicalization and after a fresh mount', async () => {
  const first = mount('/explore#saved-queries');
  await waitFor(() => expect(first.state.location.search).toBe('?signal=metrics&timeRange=last-30m'));
  expect(first.state.location.hash).toBe('#saved-queries');
  expect(await screen.findByRole('dialog', { name: i18n.t('exploreSaved.directory') })).toBeVisible();
  const freshPath = first.state.location.pathname + first.state.location.search + first.state.location.hash;
  cleanup();
  first.dispose();
  const second = mount(freshPath);
  expect(await screen.findByRole('dialog', { name: i18n.t('exploreSaved.directory') })).toBeVisible();
  expect(second.state.location.hash).toBe('#saved-queries');
  second.dispose();
});

function mount(path: string) {
  const router = createMemoryRouter(
    [{ element: <BasicLayout />, children: [{ path: '/explore', element: <ExplorePage /> }] }],
    { initialEntries: [path] }
  );
  render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <App>
          <RouterProvider router={router} />
        </App>
      </QueryClientProvider>
    </I18nextProvider>
  );
  return router;
}
