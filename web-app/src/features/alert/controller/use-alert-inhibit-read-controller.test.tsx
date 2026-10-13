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

import {
  AlertInhibitContractError,
  AlertInhibitRequestFailure,
  type AlertInhibitQuery
} from '../model/alert-inhibit-model';
import { alertInhibitPage, deferred } from './alert-inhibit-controller-test-fixtures';
import { useAlertInhibitReadController } from './use-alert-inhibit-read-controller';

const api = vi.hoisted(() => ({ loadAlertInhibits: vi.fn(), loadMatchedAlertInhibits: vi.fn() }));

vi.mock('../api/alert-inhibit-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/alert-inhibit-api')>()),
  ...api
}));
describe('Alert Inhibit read controller', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.loadAlertInhibits.mockImplementation((query: AlertInhibitQuery) =>
      Promise.resolve(alertInhibitPage(query, []))
    );
    api.loadMatchedAlertInhibits.mockResolvedValue({ records: [], missingCount: 0 });
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
    [new AlertInhibitRequestFailure('unavailable', 'uncertain'), 'unavailable'],
    [new AlertInhibitContractError('bad'), 'error']
  ])('keeps list failure distinct as %s', async (reason, kind) => {
    api.loadAlertInhibits.mockRejectedValue(reason);
    const { result } = renderReadController();
    await waitFor(() => expect(result.current.state.list.kind).toBe(kind));
  });

  it('returns authoritative out-of-range evidence to the last populated page', async () => {
    api.loadAlertInhibits.mockImplementation((query: AlertInhibitQuery) => {
      if (query.pageIndex === 2) {
        return Promise.resolve({ ...alertInhibitPage(query, []), totalElements: 5, totalPages: 1 });
      }
      return Promise.resolve({ ...alertInhibitPage(query, []), totalElements: 5, totalPages: 1 });
    });
    const routed = renderRoutedReadController(['/alerts/inhibits?pageIndex=2&pageSize=8']);

    await waitFor(() => expect(routed.current().state.query.pageIndex).toBe(0));
    expect(routed.router.state.location.search).toBe('?pageIndex=0&pageSize=8');
  });

  it('rejects a command projection when the visible query changes while its reread is pending', async () => {
    const pending = deferred<ReturnType<typeof alertInhibitPage>>();
    const routed = renderRoutedReadController(['/alerts/inhibits?search=old&pageIndex=0&pageSize=8']);
    await waitFor(() => expect(routed.current().state.list.kind).toBe('empty'));
    api.loadAlertInhibits.mockReturnValueOnce(pending.promise);

    const proof = routed.current().rereadAuthoritatively();
    const rejection = expect(proof).rejects.toMatchObject({ name: 'AlertInhibitUnavailableError' });
    await act(async () => routed.router.navigate('/alerts/inhibits?search=latest&pageIndex=1&pageSize=8'));
    act(() => pending.resolve(alertInhibitPage({ search: 'old', pageIndex: 0, pageSize: 8 }, [])));

    await rejection;
  });

  it('cancels the retired list request and publishes only the latest route query', async () => {
    const requests: Array<{ query: AlertInhibitQuery; signal: AbortSignal }> = [];
    api.loadAlertInhibits.mockImplementation((query: AlertInhibitQuery, signal: AbortSignal) => {
      requests.push({ query, signal });
      if (query.search === 'latest') return Promise.resolve(alertInhibitPage(query, []));
      return new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(new DOMException('abort', 'AbortError')), { once: true });
      });
    });
    const routed = renderRoutedReadController(['/alerts/inhibits?search=old&pageIndex=0&pageSize=8']);
    await waitFor(() => expect(requests).toHaveLength(1));

    await act(async () => routed.router.navigate('/alerts/inhibits?search=latest&pageIndex=0&pageSize=8'));

    await waitFor(() => expect(routed.current().state.list.kind).toBe('empty'));
    expect(requests[0]?.signal.aborted).toBe(true);
    expect(requests[1]).toMatchObject({ query: { search: 'latest', pageIndex: 0, pageSize: 8 } });
    expect(requests[1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it('forwards an AbortSignal when rereading the visible projection', async () => {
    const { result } = renderReadController();
    await waitFor(() => expect(result.current.state.list.kind).toBe('empty'));
    api.loadAlertInhibits.mockClear();

    await act(async () => result.current.rereadAuthoritatively());

    expect(api.loadAlertInhibits).toHaveBeenCalledWith(
      { search: '', pageIndex: 0, pageSize: 8 },
      expect.any(AbortSignal)
    );
  });

  it('loads and pages only exact entity-matched rules without issuing a global list request', async () => {
    api.loadMatchedAlertInhibits.mockResolvedValue({
      records: [
        { id: 41, name: 'Checkout warning', sourceLabels: {}, targetLabels: {}, equalLabels: [], enable: true },
        { id: 43, name: 'Database warning', sourceLabels: {}, targetLabels: {}, equalLabels: [], enable: true }
      ],
      missingCount: 1
    });
    const { result } = renderReadController(
      '/alerts/inhibits?entityId=7&entityName=Checkout&returnTo=%2Fentities%2F7&matchMode=entity-noise-controls&matchingRuleType=inhibit&matchingRuleIds=41%2C42%2C43&pageIndex=0&pageSize=8&search=checkout'
    );

    await waitFor(() => expect(result.current.state.list.kind).toBe('ready'));
    expect(result.current.state.list).toMatchObject({ records: [{ id: 41 }], total: 1 });
    expect(result.current.state.management).toMatchObject({ context: { mode: 'matched' }, missingCount: 1 });
    expect(api.loadAlertInhibits).not.toHaveBeenCalled();
    expect(api.loadMatchedAlertInhibits).toHaveBeenCalledWith([41, 42, 43], expect.any(AbortSignal));
  });

  it('keeps entity context while switching views and returns only to the validated entity path', async () => {
    const routed = renderRoutedReadController([
      '/alerts/inhibits?entityId=7&entityName=Checkout&returnTo=https%3A%2F%2Fevil.example&matchMode=entity-noise-controls&matchingRuleType=inhibit&matchingRuleIds=41%2C43&pageIndex=0&pageSize=8'
    ]);
    await waitFor(() => expect(routed.current().state.list.kind).toBe('empty'));

    act(() => routed.current().actions.viewAllRules());
    await waitFor(() => expect(routed.current().state.management.context?.mode).toBe('all'));
    expect(new URLSearchParams(routed.router.state.location.search).get('matchingRuleIds')).toBe('41,43');

    act(() => routed.current().actions.viewMatchedRules());
    await waitFor(() => expect(routed.current().state.management.context?.mode).toBe('matched'));
    act(() => routed.current().actions.returnToEntity());
    await waitFor(() => expect(routed.router.state.location.pathname).toBe('/entities/7'));
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
