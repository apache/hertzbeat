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

import { AlertGroupContractError, AlertGroupMissingError, type AlertGroupConverge, type AlertGroupQuery } from '../alert-group-model';
import { useAlertGroupController } from './use-alert-group-controller';

const api = vi.hoisted(() => ({
  deleteAlertGroup: vi.fn(),
  loadAlertGroup: vi.fn(),
  loadAlertGroups: vi.fn(),
  saveAlertGroup: vi.fn(),
  updateAlertGroupEnabled: vi.fn()
}));
const notify = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn(), warning: vi.fn() }));

vi.mock('../alert-group-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../alert-group-api')>()),
  ...api
}));
vi.mock('antd', async importOriginal => ({
  ...(await importOriginal<typeof import('antd')>()),
  App: { useApp: () => ({ message: notify }) }
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const persisted: AlertGroupConverge = {
  id: 7, name: 'By service', groupLabels: ['service'], groupWait: 30, groupInterval: 300,
  repeatInterval: 0, enable: true, gmtUpdate: '2026-07-17T09:00:00'
};

describe('Alert Group controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.loadAlertGroups.mockImplementation((query: AlertGroupQuery) => Promise.resolve(page(query, [])));
    api.loadAlertGroup.mockResolvedValue(persisted);
    api.saveAlertGroup.mockResolvedValue(undefined);
    api.updateAlertGroupEnabled.mockResolvedValue(undefined);
    api.deleteAlertGroup.mockResolvedValue(undefined);
  });

  it('owns canonical URL search, POP convergence, and page-size reset', async () => {
    const routed = renderRoutedController([
      '/alerts/groups?search=A&pageIndex=1&pageSize=15',
      '/alerts/groups?search=B&pageIndex=2&pageSize=8'
    ]);
    await waitFor(() => expect(routed.current().state.list.kind).toBe('empty'));
    act(() => routed.current().setSearch('draft'));
    await act(async () => routed.router.navigate(1));
    expect(routed.current().state).toMatchObject({ search: 'B', query: { search: 'B', pageIndex: 2, pageSize: 8 } });
    await act(async () => routed.router.navigate(-1));
    expect(routed.current().state.search).toBe('A');

    act(() => routed.current().changePage(3, 25));
    await waitFor(() => expect(routed.current().state.query).toMatchObject({ pageIndex: 0, pageSize: 25 }));
  });

  it.each([
    [new ApiMessageError('offline', { status: 503 }), 'unavailable'],
    [new AlertGroupContractError('invalid'), 'error']
  ])('keeps list failure %s distinct from empty', async (reason, kind) => {
    api.loadAlertGroups.mockRejectedValue(reason);
    const { result } = renderController();
    await waitFor(() => expect(result.current.state.list.kind).toBe(kind));
  });

  it('keeps an out-of-range empty page with a nonzero total ready', async () => {
    api.loadAlertGroups.mockImplementation((query: AlertGroupQuery) => Promise.resolve({
      ...page(query, []), totalElements: 5, totalPages: 1
    }));
    const { result } = renderController('/alerts/groups?pageIndex=2&pageSize=8');

    await waitFor(() => expect(result.current.state.list).toEqual({ kind: 'ready', records: [], total: 5 }));
  });

  it.each([
    [new AlertGroupMissingError(), 'missing'],
    [new ApiMessageError('offline', { status: 503 }), 'unavailable'],
    [new AlertGroupContractError('invalid'), 'error']
  ])('keeps detail failure %s retryable and distinct', async (reason, kind) => {
    api.loadAlertGroup.mockRejectedValueOnce(reason).mockResolvedValueOnce(persisted);
    const { result } = renderController();
    await waitFor(() => expect(result.current.state.list.kind).toBe('empty'));

    await act(async () => result.current.edit(7));
    expect(result.current.state.detail).toEqual({ kind, id: 7 });
    await act(async () => result.current.retryDetail());
    expect(result.current.state.draft).toMatchObject({ id: 7, name: 'By service' });
  });

  it('closes a create only after the void POST and authoritative list reread succeed', async () => {
    const reread = deferred<ReturnType<typeof page>>();
    const { result } = renderController();
    await waitFor(() => expect(result.current.state.list.kind).toBe('empty'));
    api.loadAlertGroups.mockReturnValueOnce(reread.promise);
    act(() => result.current.create());
    act(() => result.current.updateDraft({ name: 'New', groupLabels: ['service'] }));
    let submission!: Promise<void>;
    act(() => { submission = result.current.submit(); });

    await waitFor(() => expect(api.saveAlertGroup).toHaveBeenCalledTimes(1));
    expect(result.current.state.draft).not.toBeNull();
    expect(notify.success).not.toHaveBeenCalled();
    act(() => reread.resolve(page(result.current.state.query, [persisted])));
    await act(async () => submission);
    expect(result.current.state.draft).toBeNull();
    expect(notify.success).toHaveBeenCalledWith('alertGroups.saveSuccess');
  });

  it('keeps the create draft and reports no success when authoritative reread fails', async () => {
    const { result } = renderController();
    await waitFor(() => expect(result.current.state.list.kind).toBe('empty'));
    api.loadAlertGroups.mockRejectedValueOnce(new ApiMessageError('offline', { status: 503 }));
    act(() => result.current.create());
    act(() => result.current.updateDraft({ name: 'New', groupLabels: ['service'] }));
    await act(async () => result.current.submit());

    expect(result.current.state.draft).toMatchObject({ name: 'New' });
    expect(result.current.state.editorFailure).toBe('unavailable');
    expect(notify.success).not.toHaveBeenCalled();
  });

  it('proves exact-id detail and list rereads after PUT and toggle', async () => {
    const { result } = renderController();
    await waitFor(() => expect(result.current.state.list.kind).toBe('empty'));
    await act(async () => result.current.edit(7));
    vi.clearAllMocks();
    api.loadAlertGroup
      .mockResolvedValueOnce(persisted)
      .mockResolvedValueOnce({ ...persisted, enable: false });
    api.loadAlertGroups.mockImplementation((query: AlertGroupQuery) => Promise.resolve(page(query, [persisted])));
    api.saveAlertGroup.mockResolvedValue(undefined);
    api.updateAlertGroupEnabled.mockResolvedValue(undefined);

    await act(async () => result.current.submit());
    expect(api.loadAlertGroup).toHaveBeenCalledWith(7);
    expect(api.loadAlertGroups).toHaveBeenCalledTimes(1);
    expect(result.current.state.draft).toBeNull();

    await act(async () => result.current.toggle(persisted, false));
    expect(api.updateAlertGroupEnabled).toHaveBeenCalledWith(persisted, false);
    expect(api.loadAlertGroup).toHaveBeenLastCalledWith(7);
    expect(api.loadAlertGroups).toHaveBeenCalledTimes(2);
  });

  it('keeps an update draft when exact-id detail does not match the normalized writable payload', async () => {
    const { result } = renderController();
    await waitFor(() => expect(result.current.state.list.kind).toBe('empty'));
    await act(async () => result.current.edit(7));
    act(() => result.current.updateDraft({ name: ' Updated ', groupLabels: ['service', 'service', ' severity '] }));
    api.loadAlertGroup.mockResolvedValue({ ...persisted, name: 'By service' });
    await act(async () => result.current.submit());

    expect(result.current.state.draft).toMatchObject({ id: 7, name: ' Updated ' });
    expect(result.current.state.editorFailure).toBe('error');
    expect(notify.success).not.toHaveBeenCalled();
  });

  it('does not report toggle success when canonical writable fields fail to converge', async () => {
    const { result } = renderController();
    await waitFor(() => expect(result.current.state.list.kind).toBe('empty'));
    api.loadAlertGroup.mockResolvedValue(persisted);

    await act(async () => result.current.toggle(persisted, false));

    expect(api.loadAlertGroups).toHaveBeenCalledTimes(1);
    expect(notify.success).not.toHaveBeenCalled();
    expect(notify.error).toHaveBeenCalledWith('alertGroups.operationFailed');
  });

  it('does not close an update when the detail reread returns another id', async () => {
    const { result } = renderController();
    await waitFor(() => expect(result.current.state.list.kind).toBe('empty'));
    await act(async () => result.current.edit(7));
    api.loadAlertGroup.mockResolvedValue({ ...persisted, id: 8 });
    await act(async () => result.current.submit());

    expect(result.current.state.draft).toMatchObject({ id: 7 });
    expect(result.current.state.editorFailure).toBe('error');
    expect(notify.success).not.toHaveBeenCalled();
  });

  it('deletes only after missing-detail proof and authoritative list absence', async () => {
    const { result } = renderController();
    await waitFor(() => expect(result.current.state.list.kind).toBe('empty'));
    api.loadAlertGroup.mockRejectedValue(new AlertGroupMissingError());
    api.loadAlertGroups.mockImplementation((query: AlertGroupQuery) => Promise.resolve(page(query, [])));

    await act(async () => result.current.remove(7));
    expect(api.deleteAlertGroup).toHaveBeenCalledWith(7);
    expect(api.loadAlertGroup).toHaveBeenCalledWith(7);
    expect(notify.success).toHaveBeenCalledWith('alertGroups.operationSuccess');

    vi.clearAllMocks();
    api.deleteAlertGroup.mockResolvedValue(undefined);
    api.loadAlertGroup.mockRejectedValue(new AlertGroupMissingError());
    api.loadAlertGroups.mockImplementation((query: AlertGroupQuery) => Promise.resolve(page(query, [persisted])));
    await act(async () => result.current.remove(7));
    expect(notify.success).not.toHaveBeenCalled();
    expect(notify.error).toHaveBeenCalledWith('alertGroups.operationFailed');
  });
});

function renderController(entry = '/alerts/groups?pageIndex=0&pageSize=8') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}><MemoryRouter initialEntries={[entry]}>{children}</MemoryRouter></QueryClientProvider>
  );
  return renderHook(() => useAlertGroupController(), { wrapper });
}

function renderRoutedController(entries: string[]) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  let controller: ReturnType<typeof useAlertGroupController> | undefined;
  function Probe() { controller = useAlertGroupController(); return null; }
  const router = createMemoryRouter([{
    path: '/alerts/groups', element: <QueryClientProvider client={client}><Probe /></QueryClientProvider>
  }], { initialEntries: entries, initialIndex: 0 });
  render(<RouterProvider router={router} />);
  return { router, current: () => { if (!controller) throw new Error('not mounted'); return controller; } };
}

function page(query: AlertGroupQuery, content: AlertGroupConverge[]) {
  const totalElements = content.length;
  return { content, totalElements, totalPages: Math.ceil(totalElements / query.pageSize), number: query.pageIndex, size: query.pageSize };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
