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
import { StrictMode, type PropsWithChildren } from 'react';
import { createMemoryRouter, MemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiMessageError } from '@/core/http/api-message';

import { AlertContractError, type AlertPage, type AlertQuery, type AlertSummary } from '../alert-model';
import { useAlertCenterController } from './use-alert-center-controller';

const api = vi.hoisted(() => ({
  loadAlertGroups: vi.fn(),
  loadAlertSummary: vi.fn()
}));

vi.mock('../alert-api', () => ({
  loadAlertGroups: api.loadAlertGroups,
  loadAlertSummary: api.loadAlertSummary
}));

const summary: AlertSummary = {
  total: 3,
  dealNum: 1,
  rate: 33.33,
  priorityWarningNum: 1,
  priorityCriticalNum: 1,
  priorityEmergencyNum: 0
};

describe('Alert Center controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.loadAlertSummary.mockResolvedValue(summary);
    api.loadAlertGroups.mockImplementation((query: AlertQuery) => Promise.resolve(page(query)));
  });

  it('owns URL query, scoped drafts, and discards drafts after Back or Forward changes the URL', async () => {
    const routed = renderRoutedController([
      '/alerts?search=A&serviceName=checkout&serviceNamespace=shop&environment=prod&pageIndex=1&pageSize=15',
      '/alerts?search=B&serviceName=billing&environment=stage&pageIndex=0&pageSize=8'
    ]);
    await waitFor(() => expect(routed.current().state.list.kind).toBe('empty'));

    expect(routed.current().state.query).toMatchObject({
      search: 'A', serviceName: 'checkout', serviceNamespace: 'shop', environment: 'prod', pageIndex: 1, pageSize: 15
    });
    act(() => routed.current().setDraft('search', 'draft'));
    expect(routed.current().state.draft.search).toBe('draft');

    await act(async () => routed.router.navigate(1));
    expect(routed.current().state.draft).toMatchObject({ search: 'B', serviceName: 'billing', environment: 'stage' });

    act(() => routed.current().setDraft('search', 'second draft'));
    await act(async () => routed.router.navigate(-1));
    expect(routed.current().state.draft).toMatchObject({
      search: 'A', serviceName: 'checkout', serviceNamespace: 'shop', environment: 'prod'
    });
  });

  it('resets unsubmitted drafts when POP changes only status and page identity', async () => {
    const routed = renderRoutedController([
      '/alerts?search=A&status=firing&pageIndex=0&pageSize=8',
      '/alerts?search=A&status=resolved&pageIndex=2&pageSize=8'
    ], true);
    await waitFor(() => expect(routed.current().state.query.status).toBe('firing'));
    act(() => routed.current().setDraft('search', 'unsubmitted'));

    await act(async () => routed.router.navigate(1));
    expect(routed.current().state.query).toMatchObject({ search: 'A', status: 'resolved', pageIndex: 2 });
    expect(routed.current().state.draft.search).toBe('A');
  });

  it('resets pagination when the page size changes', async () => {
    const { result } = renderController('/alerts?pageIndex=2&pageSize=8');
    await waitFor(() => expect(result.current.state.list.kind).toBe('empty'));

    act(() => result.current.changePage(3, 15));
    await waitFor(() => expect(result.current.state.query).toMatchObject({ pageIndex: 0, pageSize: 15 }));
  });

  it('keeps summary and list failures independent and preserves an out-of-range ready page', async () => {
    api.loadAlertSummary.mockRejectedValue(new ApiMessageError('offline', { status: 503 }));
    api.loadAlertGroups.mockImplementation((query: AlertQuery) => Promise.resolve({
      ...page(query), totalElements: 5, totalPages: 1
    }));
    const { result } = renderController('/alerts?pageIndex=2&pageSize=8');

    await waitFor(() => expect(result.current.state.summary.kind).toBe('unavailable'));
    expect(result.current.state.list).toEqual({ kind: 'ready', records: [], total: 5 });
  });

  it('classifies malformed data as error instead of unavailable or empty', async () => {
    api.loadAlertSummary.mockResolvedValue(summary);
    api.loadAlertGroups.mockRejectedValue(new AlertContractError('invalid page'));
    const { result } = renderController();

    await waitFor(() => expect(result.current.state.list.kind).toBe('error'));
    expect(result.current.state.summary).toEqual({ kind: 'ready', summary });
  });

  it('classifies a transport status zero as unavailable', async () => {
    api.loadAlertGroups.mockRejectedValue(new ApiMessageError('network unavailable', { status: 0 }));
    const { result } = renderController();

    await waitFor(() => expect(result.current.state.list.kind).toBe('unavailable'));
  });

  it('does not let a late query A response replace query B', async () => {
    const a = deferred<AlertPage>();
    api.loadAlertGroups.mockImplementation((query: AlertQuery) => query.search === 'A'
      ? a.promise
      : Promise.resolve({ ...page(query), totalElements: 1, totalPages: 1 }));
    const { result } = renderController('/alerts?search=A&pageIndex=0&pageSize=8');

    act(() => result.current.setDraft('search', 'B'));
    act(() => result.current.submitFilters());
    await waitFor(() => expect(result.current.state.query.search).toBe('B'));
    await waitFor(() => expect(result.current.state.list).toMatchObject({ kind: 'ready', total: 1 }));

    act(() => a.resolve(page({ ...result.current.state.query, search: 'A' })));
    expect(result.current.state.query.search).toBe('B');
    expect(result.current.state.list).toMatchObject({ kind: 'ready', total: 1 });
  });

  it('provides independent retries and a combined refresh', async () => {
    const { result } = renderController();
    await waitFor(() => expect(result.current.state.list.kind).toBe('empty'));
    vi.clearAllMocks();
    api.loadAlertSummary.mockResolvedValue(summary);
    api.loadAlertGroups.mockImplementation((query: AlertQuery) => Promise.resolve(page(query)));

    await act(async () => result.current.retryList());
    expect(api.loadAlertGroups).toHaveBeenCalledTimes(1);
    expect(api.loadAlertSummary).not.toHaveBeenCalled();
    await act(async () => result.current.retrySummary());
    expect(api.loadAlertSummary).toHaveBeenCalledTimes(1);
    await act(async () => result.current.refresh());
    expect(api.loadAlertGroups).toHaveBeenCalledTimes(2);
    expect(api.loadAlertSummary).toHaveBeenCalledTimes(2);
  });
});

function renderController(entry = '/alerts?pageIndex=0&pageSize=8') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[entry]}>{children}</MemoryRouter>
    </QueryClientProvider>
  );
  return renderHook(() => useAlertCenterController(), { wrapper });
}

function renderRoutedController(entries: string[], strict = false) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  let controller: ReturnType<typeof useAlertCenterController> | undefined;
  function Probe() {
    controller = useAlertCenterController();
    return null;
  }
  const element = <QueryClientProvider client={client}><Probe /></QueryClientProvider>;
  const router = createMemoryRouter([{ path: '/alerts', element: strict ? <StrictMode>{element}</StrictMode> : element }], {
    initialEntries: entries,
    initialIndex: 0
  });
  render(<RouterProvider router={router} />);
  return {
    router,
    current: () => {
      if (!controller) throw new Error('controller is not mounted');
      return controller;
    }
  };
}

function page(query: AlertQuery): AlertPage {
  return { content: [], totalElements: 0, totalPages: 0, number: query.pageIndex, size: query.pageSize };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
