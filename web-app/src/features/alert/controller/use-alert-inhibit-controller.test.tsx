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

import { AlertInhibitContractError, AlertInhibitMissingError, type AlertInhibit, type AlertInhibitQuery } from '../alert-inhibit-model';
import { useAlertInhibitController } from './use-alert-inhibit-controller';

const api = vi.hoisted(() => ({
  deleteAlertInhibit: vi.fn(), loadAlertInhibit: vi.fn(), loadAlertInhibits: vi.fn(),
  saveAlertInhibit: vi.fn(), updateAlertInhibitEnabled: vi.fn()
}));
const notify = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn(), warning: vi.fn() }));

vi.mock('../alert-inhibit-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../alert-inhibit-api')>()), ...api
}));
vi.mock('antd', async importOriginal => ({
  ...(await importOriginal<typeof import('antd')>()), App: { useApp: () => ({ message: notify }) }
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const persisted: AlertInhibit = {
  id: 7, name: 'Critical suppresses warning', sourceLabels: { severity: 'critical', service: 'api' },
  targetLabels: { severity: 'warning', service: 'api' }, equalLabels: ['service', 'instance'], enable: true,
  gmtUpdate: '2026-07-17T09:00:00'
};

describe('Alert Inhibit controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.loadAlertInhibits.mockImplementation((query: AlertInhibitQuery) => Promise.resolve(page(query, [])));
    api.loadAlertInhibit.mockResolvedValue(persisted);
    api.saveAlertInhibit.mockResolvedValue(undefined);
    api.updateAlertInhibitEnabled.mockResolvedValue(undefined);
    api.deleteAlertInhibit.mockResolvedValue(undefined);
  });

  it('owns canonical URL drafts, POP convergence, and page-size reset', async () => {
    const routed = renderRoutedController(['/alerts/inhibits?search=A&pageIndex=1&pageSize=15', '/alerts/inhibits?search=B&pageIndex=2&pageSize=8']);
    await waitFor(() => expect(routed.current().state.list.kind).toBe('empty'));
    act(() => routed.current().setSearch('draft'));
    await act(async () => routed.router.navigate(1));
    expect(routed.current().state).toMatchObject({ search: 'B', query: { search: 'B', pageIndex: 2, pageSize: 8 } });
    await act(async () => routed.router.navigate(-1));
    expect(routed.current().state.search).toBe('A');
    act(() => routed.current().changePage(3, 25));
    await waitFor(() => expect(routed.current().state.query).toMatchObject({ pageIndex: 0, pageSize: 25 }));
  });

  it.each([[new ApiMessageError('offline', { status: 503 }), 'unavailable'], [new AlertInhibitContractError('bad'), 'error']])('keeps list failure distinct as %s', async (reason, kind) => {
    api.loadAlertInhibits.mockRejectedValue(reason);
    const { result } = renderController();
    await waitFor(() => expect(result.current.state.list.kind).toBe(kind));
  });

  it('keeps out-of-range nonzero evidence ready', async () => {
    api.loadAlertInhibits.mockImplementation((query: AlertInhibitQuery) => Promise.resolve({ ...page(query, []), totalElements: 5, totalPages: 1 }));
    const { result } = renderController('/alerts/inhibits?pageIndex=2&pageSize=8');
    await waitFor(() => expect(result.current.state.list).toEqual({ kind: 'ready', records: [], total: 5 }));
  });

  it.each([[new AlertInhibitMissingError(), 'missing'], [new ApiMessageError('offline', { status: 503 }), 'unavailable'], [new AlertInhibitContractError('bad'), 'error']])('keeps detail failures retryable as %s', async (reason, kind) => {
    api.loadAlertInhibit.mockRejectedValueOnce(reason).mockResolvedValueOnce(persisted);
    const { result } = renderController();
    await waitFor(() => expect(result.current.state.list.kind).toBe('empty'));
    await act(async () => result.current.edit(7));
    expect(result.current.state.detail).toEqual({ kind, id: 7 });
    await act(async () => result.current.retryDetail());
    expect(result.current.state.draft).toMatchObject({ id: 7 });
  });

  it('keeps create open until authoritative reread and retains it on failure', async () => {
    const reread = deferred<ReturnType<typeof page>>();
    const { result } = renderController();
    await waitFor(() => expect(result.current.state.list.kind).toBe('empty'));
    api.loadAlertInhibits.mockReturnValueOnce(reread.promise);
    act(() => result.current.create());
    act(() => result.current.updateDraft(validDraft()));
    let submission!: Promise<void>;
    act(() => { submission = result.current.submit(); });
    await waitFor(() => expect(api.saveAlertInhibit).toHaveBeenCalled());
    expect(result.current.state.draft).not.toBeNull();
    act(() => reread.resolve(page(result.current.state.query, [persisted])));
    await act(async () => submission);
    expect(result.current.state.draft).toBeNull();
    expect(notify.success).toHaveBeenCalledWith('alertInhibits.saveSuccess');

    api.loadAlertInhibits.mockRejectedValueOnce(new ApiMessageError('offline', { status: 503 }));
    act(() => result.current.create());
    act(() => result.current.updateDraft(validDraft()));
    await act(async () => result.current.submit());
    expect(result.current.state.draft).not.toBeNull();
    expect(result.current.state.editorFailure).toBe('unavailable');
  });

  it('accepts semantic map/set order after PUT and rejects writable drift', async () => {
    const { result } = renderController();
    await waitFor(() => expect(result.current.state.list.kind).toBe('empty'));
    await act(async () => result.current.edit(7));
    act(() => result.current.updateDraft({ equalLabels: ['instance', 'service'] }));
    api.loadAlertInhibit.mockResolvedValueOnce({
      ...persisted, sourceLabels: { service: 'api', severity: 'critical' },
      targetLabels: { service: 'api', severity: 'warning' }, equalLabels: ['service', 'instance']
    });
    await act(async () => result.current.submit());
    expect(result.current.state.draft).toBeNull();

    await act(async () => result.current.edit(7));
    api.loadAlertInhibit.mockResolvedValueOnce({ ...persisted, targetLabels: { severity: 'info', service: 'api' } });
    await act(async () => result.current.submit());
    expect(result.current.state.draft).not.toBeNull();
    expect(result.current.state.editorFailure).toBe('error');
    expect(notify.success).toHaveBeenCalledTimes(1);
  });

  it('proves toggle convergence and exact id before success', async () => {
    const { result } = renderController();
    await waitFor(() => expect(result.current.state.list.kind).toBe('empty'));
    api.loadAlertInhibit.mockResolvedValueOnce({ ...persisted, sourceLabels: { service: 'api', severity: 'critical' }, enable: false });
    await act(async () => result.current.toggle(persisted, false));
    expect(notify.success).toHaveBeenCalledWith('alertInhibits.operationSuccess');
    vi.clearAllMocks();
    api.updateAlertInhibitEnabled.mockResolvedValue(undefined);
    api.loadAlertInhibit.mockResolvedValue({ ...persisted, id: 8, enable: false });
    await act(async () => result.current.toggle(persisted, false));
    expect(notify.success).not.toHaveBeenCalled();
  });

  it('deletes only after missing detail and list absence', async () => {
    const { result } = renderController();
    await waitFor(() => expect(result.current.state.list.kind).toBe('empty'));
    api.loadAlertInhibit.mockRejectedValue(new AlertInhibitMissingError());
    await act(async () => result.current.remove(7));
    expect(notify.success).toHaveBeenCalled();
    vi.clearAllMocks();
    api.deleteAlertInhibit.mockResolvedValue(undefined);
    api.loadAlertInhibit.mockRejectedValue(new AlertInhibitMissingError());
    api.loadAlertInhibits.mockImplementation((query: AlertInhibitQuery) => Promise.resolve(page(query, [persisted])));
    await act(async () => result.current.remove(7));
    expect(notify.success).not.toHaveBeenCalled();
  });
});

function validDraft() {
  return { name: 'Critical suppresses warning', sourceLabelsText: 'severity:critical, service:api',
    targetLabelsText: 'severity:warning, service:api', equalLabels: ['service', 'instance'], enable: true };
}

function renderController(entry = '/alerts/inhibits?pageIndex=0&pageSize=8') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={client}><MemoryRouter initialEntries={[entry]}>{children}</MemoryRouter></QueryClientProvider>;
  return renderHook(() => useAlertInhibitController(), { wrapper });
}

function renderRoutedController(entries: string[]) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  let controller: ReturnType<typeof useAlertInhibitController> | undefined;
  function Probe() { controller = useAlertInhibitController(); return null; }
  const router = createMemoryRouter([{ path: '/alerts/inhibits', element: <QueryClientProvider client={client}><Probe /></QueryClientProvider> }], {
    initialEntries: entries,
    initialIndex: 0
  });
  render(<RouterProvider router={router} />);
  return { router, current: () => { if (!controller) throw new Error('not mounted'); return controller; } };
}

function page(query: AlertInhibitQuery, content: AlertInhibit[]) {
  return { content, totalElements: content.length, totalPages: Math.ceil(content.length / query.pageSize), number: query.pageIndex, size: query.pageSize };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
