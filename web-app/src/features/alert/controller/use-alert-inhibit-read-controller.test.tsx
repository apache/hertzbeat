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
import { act, render, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { createMemoryRouter, MemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiMessageError } from '@/core/http/api-message';

import { AlertInhibitContractError, type AlertInhibitQuery } from '../alert-inhibit-model';
import { alertInhibitPage, deferred } from './alert-inhibit-controller-test-fixtures';
import { useAlertInhibitReadController } from './use-alert-inhibit-read-controller';

const api = vi.hoisted(() => ({ loadAlertInhibits: vi.fn() }));

vi.mock('../alert-inhibit-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../alert-inhibit-api')>()),
  ...api
}));
describe('Alert Inhibit read controller', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.loadAlertInhibits.mockImplementation((query: AlertInhibitQuery) =>
      Promise.resolve(alertInhibitPage(query, []))
    );
  });

  it('owns canonical URL drafts, POP convergence, and page-size reset', async () => {
    const routed = renderRoutedReadController([
      '/alerts/inhibits?search=A&pageIndex=1&pageSize=15',
      '/alerts/inhibits?search=B&pageIndex=2&pageSize=8'
    ]);
    await waitFor(() => expect(routed.current().state.list.kind).toBe('empty'));
    act(() => routed.current().actions.setSearch('draft'));
    await act(async () => routed.router.navigate(1));
    expect(routed.current().state).toMatchObject({ search: 'B', query: { search: 'B', pageIndex: 2, pageSize: 8 } });
    await act(async () => routed.router.navigate(-1));
    expect(routed.current().state.search).toBe('A');
    act(() => routed.current().actions.changePage(3, 25));
    await waitFor(() => expect(routed.current().state.query).toMatchObject({ pageIndex: 0, pageSize: 25 }));
  });

  it.each([
    [new ApiMessageError('offline', { status: 503 }), 'unavailable'],
    [new AlertInhibitContractError('bad'), 'error']
  ])('keeps list failure distinct as %s', async (reason, kind) => {
    api.loadAlertInhibits.mockRejectedValue(reason);
    const { result } = renderReadController();
    await waitFor(() => expect(result.current.state.list.kind).toBe(kind));
  });

  it('keeps out-of-range nonzero evidence ready', async () => {
    api.loadAlertInhibits.mockImplementation((query: AlertInhibitQuery) =>
      Promise.resolve({ ...alertInhibitPage(query, []), totalElements: 5, totalPages: 1 })
    );
    const { result } = renderReadController('/alerts/inhibits?pageIndex=2&pageSize=8');
    await waitFor(() => expect(result.current.state.list).toEqual({ kind: 'ready', records: [], total: 5 }));
  });

  it('rejects a command projection when the visible query changes while its reread is pending', async () => {
    const pending = deferred<ReturnType<typeof alertInhibitPage>>();
    const routed = renderRoutedReadController(['/alerts/inhibits?search=old&pageIndex=0&pageSize=8']);
    await waitFor(() => expect(routed.current().state.list.kind).toBe('empty'));
    api.loadAlertInhibits.mockReturnValueOnce(pending.promise);

    const proof = routed.current().rereadAuthoritatively();
    await act(async () => routed.router.navigate('/alerts/inhibits?search=latest&pageIndex=1&pageSize=8'));
    act(() => pending.resolve(alertInhibitPage({ search: 'old', pageIndex: 0, pageSize: 8 }, [])));

    await expect(proof).rejects.toMatchObject({ name: 'AlertInhibitUnavailableError' });
  });
});

function renderReadController(entry = '/alerts/inhibits?pageIndex=0&pageSize=8') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[entry]}>{children}</MemoryRouter>
    </QueryClientProvider>
  );
  return renderHook(() => useAlertInhibitReadController(), { wrapper });
}

function renderRoutedReadController(entries: string[]) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  let controller: ReturnType<typeof useAlertInhibitReadController> | undefined;
  function Probe() {
    controller = useAlertInhibitReadController();
    return null;
  }
  const router = createMemoryRouter(
    [
      {
        path: '/alerts/inhibits',
        element: (
          <QueryClientProvider client={client}>
            <Probe />
          </QueryClientProvider>
        )
      }
    ],
    { initialEntries: entries, initialIndex: 0 }
  );
  render(<RouterProvider router={router} />);
  return {
    router,
    current: () => {
      if (!controller) throw new Error('not mounted');
      return controller;
    }
  };
}
