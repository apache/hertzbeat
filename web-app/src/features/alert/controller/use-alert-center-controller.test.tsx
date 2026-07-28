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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  AlertContractError,
  AlertRequestFailure,
  type AlertPage,
  type AlertQuery,
  type AlertSummary
} from '../model/alert-model';
import { useAlertCenterController } from './use-alert-center-controller';

const api = vi.hoisted(() => ({
  deleteAlertGroups: vi.fn(),
  loadAlertGroupEvidence: vi.fn(),
  loadAlertGroups: vi.fn(),
  loadAlertSummary: vi.fn(),
  notification: vi.fn(),
  openAlertGroupStream: vi.fn(),
  updateAlertGroupStatus: vi.fn()
}));

vi.mock('../api/alert-api', () => ({
  deleteAlertGroups: api.deleteAlertGroups,
  loadAlertGroupEvidence: api.loadAlertGroupEvidence,
  loadAlertGroups: api.loadAlertGroups,
  loadAlertSummary: api.loadAlertSummary,
  openAlertGroupStream: api.openAlertGroupStream,
  updateAlertGroupStatus: api.updateAlertGroupStatus
}));
vi.mock('@refinedev/core', () => ({ useNotification: () => ({ open: api.notification }) }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('./use-alert-capabilities', () => ({
  useAlertCapabilities: () => ({ canUpdateStatus: true, canDeleteGroups: true, canSelect: true })
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
    api.deleteAlertGroups.mockResolvedValue(undefined);
    api.loadAlertGroupEvidence.mockImplementation((ids: number[]) => {
      const target = api.updateAlertGroupStatus.mock.calls.at(-1)?.[1] ?? 'firing';
      const deleted = api.deleteAlertGroups.mock.calls.length > 0;
      return Promise.resolve({
        groups: deleted ? [] : ids.map(id => ({ id, status: target })),
        missingIds: deleted ? ids : [],
        observedAt: 1_785_000_000_000
      });
    });
    api.loadAlertSummary.mockResolvedValue(summary);
    api.loadAlertGroups.mockImplementation((query: AlertQuery) => Promise.resolve(page(query)));
    api.openAlertGroupStream.mockReturnValue({ close: vi.fn() });
    api.updateAlertGroupStatus.mockResolvedValue(undefined);
  });

  afterEach(() => vi.restoreAllMocks());

  it('owns URL query, scoped drafts, and discards drafts after Back or Forward changes the URL', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    api.loadAlertGroups.mockImplementation((query: AlertQuery) =>
      Promise.resolve(query.pageIndex === 1 ? { ...page(query), totalElements: 16, totalPages: 2 } : page(query))
    );
    const routed = renderRoutedController(
      [
        '/alerts?search=A&serviceName=checkout&serviceNamespace=shop&environment=prod&pageIndex=1&pageSize=15',
        '/alerts?search=B&serviceName=billing&environment=stage&pageIndex=0&pageSize=8'
      ],
      true
    );
    await waitFor(() => expect(routed.current().state.list.kind).toBe('ready'));

    expect(routed.current().state.query).toMatchObject({
      search: 'A',
      serviceName: 'checkout',
      serviceNamespace: 'shop',
      environment: 'prod',
      pageIndex: 1,
      pageSize: 15
    });
    act(() => routed.current().setDraft('search', 'draft'));
    expect(routed.current().state.draft.search).toBe('draft');

    await act(async () => routed.router.navigate(1));
    expect(routed.current().state.draft).toMatchObject({ search: 'B', serviceName: 'billing', environment: 'stage' });

    await act(async () => routed.router.navigate(-1));
    expect(routed.current().state.draft).toMatchObject({
      search: 'A',
      serviceName: 'checkout',
      serviceNamespace: 'shop',
      environment: 'prod'
    });
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('resets unsubmitted drafts when POP changes only status and page identity', async () => {
    api.loadAlertGroups.mockImplementation((query: AlertQuery) =>
      Promise.resolve(query.pageIndex === 2 ? { ...page(query), totalElements: 17, totalPages: 3 } : page(query))
    );
    const routed = renderRoutedController(
      [
        '/alerts?search=A&status=firing&pageIndex=0&pageSize=8',
        '/alerts?search=A&status=resolved&pageIndex=2&pageSize=8'
      ],
      true
    );
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

  it('returns an authoritative empty alert page to the first page', async () => {
    const { result } = renderController('/alerts?search=missing&pageIndex=2&pageSize=8');

    await waitFor(() => expect(result.current.state.list.kind).toBe('empty'));
    await waitFor(() => expect(result.current.state.query).toMatchObject({ search: 'missing', pageIndex: 0 }));
  });

  it('keeps summary and list failures independent and corrects an out-of-range ready page', async () => {
    api.loadAlertSummary.mockRejectedValue(new AlertRequestFailure('unavailable'));
    api.loadAlertGroups.mockImplementation((query: AlertQuery) =>
      Promise.resolve({
        ...page(query),
        totalElements: 5,
        totalPages: 1
      })
    );
    const { result } = renderController('/alerts?pageIndex=2&pageSize=8');

    await waitFor(() => expect(result.current.state.summary.kind).toBe('unavailable'));
    expect(result.current.state.list).toEqual({ kind: 'ready', records: [], total: 5 });
    await waitFor(() => expect(result.current.state.query.pageIndex).toBe(0));
  });

  it('classifies malformed data as error instead of unavailable or empty', async () => {
    api.loadAlertSummary.mockResolvedValue(summary);
    api.loadAlertGroups.mockRejectedValue(new AlertContractError('invalid page'));
    const { result } = renderController();

    await waitFor(() => expect(result.current.state.list.kind).toBe('error'));
    expect(result.current.state.summary).toEqual({ kind: 'ready', summary });
  });

  it('classifies a transport status zero as unavailable', async () => {
    api.loadAlertGroups.mockRejectedValue(new AlertRequestFailure('unavailable'));
    const { result } = renderController();

    await waitFor(() => expect(result.current.state.list.kind).toBe('unavailable'));
  });

  it('keeps server read permission rejection distinct for list and summary', async () => {
    api.loadAlertSummary.mockRejectedValue(new AlertRequestFailure('permission', 'rejected'));
    api.loadAlertGroups.mockRejectedValue(new AlertRequestFailure('permission', 'rejected'));
    const { result } = renderController();

    await waitFor(() => expect(result.current.state.list.kind).toBe('permission'));
    expect(result.current.state.summary.kind).toBe('permission');
  });

  it('does not let a late query A response replace query B', async () => {
    const a = deferred<AlertPage>();
    api.loadAlertGroups.mockImplementation((query: AlertQuery) =>
      query.search === 'A' ? a.promise : Promise.resolve({ ...page(query), totalElements: 1, totalPages: 1 })
    );
    const { result } = renderController('/alerts?search=A&pageIndex=0&pageSize=8');

    act(() => result.current.setDraft('search', 'B'));
    act(() => result.current.submitFilters());
    await waitFor(() => expect(result.current.state.query.search).toBe('B'));
    await waitFor(() => expect(result.current.state.list).toMatchObject({ kind: 'ready', total: 1 }));

    act(() => a.resolve(page({ ...result.current.state.query, search: 'A' })));
    expect(result.current.state.query.search).toBe('B');
    expect(result.current.state.list).toMatchObject({ kind: 'ready', total: 1 });
  });

  it('aborts the stale list request when route query identity changes', async () => {
    const requests: Array<{ query: AlertQuery; signal: AbortSignal }> = [];
    api.loadAlertGroups.mockImplementation((query: AlertQuery, signal: AbortSignal) => {
      requests.push({ query, signal });
      if (query.search !== 'A') return Promise.resolve(page(query));
      return new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true });
      });
    });
    const { result } = renderController('/alerts?search=A&pageIndex=0&pageSize=8');
    await waitFor(() => expect(requests).toHaveLength(1));

    act(() => result.current.setDraft('search', 'B'));
    act(() => result.current.submitFilters());

    await waitFor(() => expect(requests).toHaveLength(2));
    expect(requests[0]?.signal.aborted).toBe(true);
    expect(requests[1]).toMatchObject({ query: expect.objectContaining({ search: 'B' }) });
    await waitFor(() => expect(result.current.state.list.kind).toBe('empty'));
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

  it('projects a proven group deletion before reporting success', async () => {
    api.loadAlertGroups.mockImplementation((query: AlertQuery) =>
      Promise.resolve(
        api.deleteAlertGroups.mock.calls.length
          ? page(query)
          : {
              ...page(query),
              content: [alertGroup(7, 'firing')],
              totalElements: 1,
              totalPages: 1
            }
      )
    );
    const { result } = renderController();
    await waitFor(() => expect(result.current.state.list.kind).toBe('ready'));

    await act(async () => result.current.remove({ id: 7 }));

    expect(api.deleteAlertGroups).toHaveBeenCalledWith([7]);
    expect(api.notification).toHaveBeenCalledWith({
      type: 'success',
      message: 'alert.deleteSuccess'
    });
    expect(result.current.state).toMatchObject({ command: 'idle', recovery: null });
  });

  it('selects groups and resolves them through one canonical status operation', async () => {
    api.loadAlertGroups.mockImplementation((query: AlertQuery) =>
      Promise.resolve({
        ...page(query),
        content: [
          alertGroup(7, api.updateAlertGroupStatus.mock.calls.length ? 'resolved' : 'firing'),
          alertGroup(9, api.updateAlertGroupStatus.mock.calls.length ? 'resolved' : 'firing')
        ],
        totalElements: 2,
        totalPages: 1
      })
    );
    const { result } = renderController();
    await waitFor(() => expect(result.current.state.list.kind).toBe('ready'));

    act(() => result.current.selectIds([9, 7, 9]));
    expect(result.current.state.selectedIds).toEqual([7, 9]);

    await act(async () => result.current.resolveSelected());

    expect(api.updateAlertGroupStatus).toHaveBeenCalledWith([7, 9], 'resolved');
    expect(api.notification).toHaveBeenCalledWith({ type: 'success', message: 'alert.resolveSuccess' });
    expect(result.current.state).toMatchObject({ command: 'idle', recovery: null, selectedIds: [] });
  });

  it('acknowledges only selected firing groups and unacknowledges only acknowledged groups', async () => {
    const statuses = new Map<number, 'firing' | 'acknowledged' | 'resolved'>([
      [7, 'firing'],
      [9, 'acknowledged'],
      [11, 'resolved']
    ]);
    api.updateAlertGroupStatus.mockImplementation((ids: number[], status: 'firing' | 'acknowledged' | 'resolved') => {
      ids.forEach(id => statuses.set(id, status));
      return Promise.resolve();
    });
    api.loadAlertGroups.mockImplementation((query: AlertQuery) =>
      Promise.resolve({
        ...page(query),
        content: [...statuses].map(([id, status]) => alertGroup(id, status)),
        totalElements: 3,
        totalPages: 1
      })
    );
    const acknowledgeView = renderController();
    await waitFor(() => expect(acknowledgeView.result.current.state.list.kind).toBe('ready'));
    act(() => acknowledgeView.result.current.selectIds([11, 9, 7]));
    await act(() => acknowledgeView.result.current.acknowledgeSelected());
    expect(api.updateAlertGroupStatus).toHaveBeenLastCalledWith([7], 'acknowledged');
    acknowledgeView.unmount();
    statuses.set(7, 'firing');

    const unacknowledgeView = renderController();
    await waitFor(() => expect(unacknowledgeView.result.current.state.list.kind).toBe('ready'));
    act(() => unacknowledgeView.result.current.selectIds([11, 9, 7]));
    await act(() => unacknowledgeView.result.current.unacknowledgeSelected());
    expect(api.updateAlertGroupStatus).toHaveBeenLastCalledWith([9], 'firing');
    expect(api.notification).toHaveBeenLastCalledWith({
      type: 'success',
      message: 'alert.unacknowledgeSuccess'
    });
  });

  it('advances one selected group from firing through acknowledged to resolved', async () => {
    let status: 'firing' | 'acknowledged' | 'resolved' = 'firing';
    api.updateAlertGroupStatus.mockImplementation((_ids: number[], target: 'firing' | 'acknowledged' | 'resolved') => {
      status = target;
      return Promise.resolve();
    });
    api.loadAlertGroups.mockImplementation((query: AlertQuery) =>
      Promise.resolve({
        ...page(query),
        content: [alertGroup(7, status)],
        totalElements: 1,
        totalPages: 1
      })
    );
    const { result } = renderController();
    await waitFor(() => expect(result.current.state.list.kind).toBe('ready'));
    act(() => result.current.selectIds([7]));

    await act(async () => result.current.acknowledgeSelected());
    await waitFor(() =>
      expect(result.current.state.list).toMatchObject({
        kind: 'ready',
        records: [expect.objectContaining({ id: 7, status: 'acknowledged' })]
      })
    );
    act(() => result.current.selectIds([7]));
    await act(async () => result.current.resolveSelected());

    expect(api.updateAlertGroupStatus.mock.calls.map(call => call[1])).toEqual(['acknowledged', 'resolved']);
    expect(result.current.state.list).toMatchObject({
      kind: 'ready',
      records: [expect.objectContaining({ id: 7, status: 'resolved' })]
    });
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
  const element = (
    <QueryClientProvider client={client}>
      <Probe />
    </QueryClientProvider>
  );
  const router = createMemoryRouter(
    [{ path: '/alerts', element: strict ? <StrictMode>{element}</StrictMode> : element }],
    {
      initialEntries: entries,
      initialIndex: 0
    }
  );
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

function alertGroup(id: number, status: 'firing' | 'acknowledged' | 'resolved') {
  return {
    id,
    status,
    groupLabels: null,
    commonLabels: null,
    commonAnnotations: null,
    alertFingerprints: null,
    alerts: [],
    gmtUpdate: null
  } as const;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => {
    resolve = done;
  });
  return { promise, resolve };
}
