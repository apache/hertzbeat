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
import { App } from 'antd';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import { ApiMessageError } from '@/core/http/api-message';

const api = vi.hoisted(() => ({ loadMonitorApps: vi.fn(), loadMonitors: vi.fn(), mutateMonitors: vi.fn() }));
vi.mock('../api/monitor-api', async importOriginal => ({
  ...await importOriginal<typeof import('../api/monitor-api')>(), ...api
}));

import { useMonitorListController } from './use-monitor-list-controller';
import { MonitorContractError } from '../api/monitor-api';

describe('useMonitorListController URL evidence', () => {
  beforeAll(async () => { await initializeI18n(); await loadLocale('en-US'); });
  beforeEach(() => {
    api.loadMonitorApps.mockResolvedValue([]);
    api.loadMonitors.mockResolvedValue({ content: [{
      id: 7, name: 'epoch', app: 'website', instance: 'zero', status: 1, gmtUpdate: 0
    }], totalElements: 1 });
  });
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it('converges both drafts on push, Back, and Forward and preserves timestamp zero', async () => {
    const view = renderHook(() => ({ controller: useMonitorListController(), navigate: useNavigate() }), {
      wrapper: wrapper(['/monitors?search=one&labels=env%3Aone', '/monitors?search=two&labels=env%3Atwo'], 1)
    });
    await waitFor(() => expect(view.result.current.controller.state.monitors.kind).toBe('ready'));
    expect(view.result.current.controller.state.draft).toEqual({ search: 'two', labels: 'env:two' });
    expect(view.result.current.controller.state.monitors).toMatchObject({ kind: 'ready', records: [{ gmtUpdate: 0 }] });

    act(() => { void view.result.current.navigate('/monitors?search=three&labels=env%3Athree'); });
    await waitFor(() => expect(view.result.current.controller.state.draft).toEqual({ search: 'three', labels: 'env:three' }));
    act(() => { void view.result.current.navigate(-1); });
    await waitFor(() => expect(view.result.current.controller.state.draft).toEqual({ search: 'two', labels: 'env:two' }));
    act(() => { void view.result.current.navigate(1); });
    await waitFor(() => expect(view.result.current.controller.state.draft).toEqual({ search: 'three', labels: 'env:three' }));
  });

  it.each([
    [new ApiMessageError('offline', { status: 503 }), 'unavailable'],
    [new MonitorContractError('bad page'), 'error']
  ] as const)('keeps monitor failure evidence as %s instead of empty', async (reason, kind) => {
    api.loadMonitors.mockRejectedValue(reason);
    const view = renderHook(() => useMonitorListController(), { wrapper: wrapper(['/monitors'], 0) });
    await waitFor(() => expect(view.result.current.state.monitors.kind).toBe(kind));
    expect(view.result.current.state.monitors).not.toHaveProperty('records');
  });

  it.each([
    [new ApiMessageError('offline', { status: 503 }), 'unavailable'],
    [new MonitorContractError('bad apps'), 'error']
  ] as const)('keeps application failure evidence as %s instead of empty options', async (reason, kind) => {
    api.loadMonitorApps.mockRejectedValue(reason);
    const view = renderHook(() => useMonitorListController(), { wrapper: wrapper(['/monitors'], 0) });
    await waitFor(() => expect(view.result.current.state.apps.kind).toBe(kind));
    expect(view.result.current.state.apps).not.toHaveProperty('options');
  });

  it('shows authoritative empty only for a canonical zero page', async () => {
    api.loadMonitors.mockResolvedValue({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 });
    const view = renderHook(() => useMonitorListController(), { wrapper: wrapper(['/monitors'], 0) });
    await waitFor(() => expect(view.result.current.state.monitors.kind).toBe('empty'));
  });

  it('clears scoped selection only after mutation and authoritative reread converge', async () => {
    api.loadMonitors
      .mockResolvedValueOnce({ content: [{ id: 7, name: 'epoch', app: 'website', instance: 'zero', status: 0 }], totalElements: 1 })
      .mockResolvedValue({ content: [{ id: 7, name: 'epoch', app: 'website', instance: 'zero', status: 1 }], totalElements: 1 });
    api.mutateMonitors.mockResolvedValue(undefined);
    const view = renderHook(() => useMonitorListController(), { wrapper: wrapper(['/monitors'], 0) });
    await waitFor(() => expect(view.result.current.state.monitors.kind).toBe('ready'));
    act(() => view.result.current.actions.selectIds([7]));
    expect(view.result.current.state.selectedIds).toEqual([7]);
    await act(() => view.result.current.actions.run('enable', [7]));
    await waitFor(() => expect(api.loadMonitors).toHaveBeenCalledTimes(2));
    expect(view.result.current.state.selectedIds).toEqual([]);
  });
});

function wrapper(entries: string[], initialIndex: number) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return ({ children }: PropsWithChildren) => <I18nextProvider i18n={i18n}>
    <QueryClientProvider client={client}><MemoryRouter initialEntries={entries} initialIndex={initialIndex}>
      <App>{children}</App>
    </MemoryRouter></QueryClientProvider>
  </I18nextProvider>;
}
