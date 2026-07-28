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

import type { AlertInhibitQuery } from '../model/alert-inhibit-model';
import {
  alertInhibitPage,
  deferred,
  persistedAlertInhibit,
  validAlertInhibitDraft
} from './alert-inhibit-controller-test-fixtures';
import { useAlertInhibitController } from './use-alert-inhibit-controller';

const api = vi.hoisted(() => ({
  loadAllAlertInhibits: vi.fn(),
  loadAlertInhibit: vi.fn(),
  loadAlertInhibits: vi.fn(),
  saveAlertInhibit: vi.fn()
}));
const notify = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn(), warning: vi.fn() }));
const settings = vi.hoisted(() => ({ loadLabelSuggestions: vi.fn() }));
const access = vi.hoisted(() => ({ capabilities: { canWrite: true, canDelete: true } }));

vi.mock('../api/alert-inhibit-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/alert-inhibit-api')>()),
  ...api
}));
vi.mock('antd', async importOriginal => ({
  ...(await importOriginal<typeof import('antd')>()),
  App: { useApp: () => ({ message: notify }) }
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/features/settings', () => settings);
vi.mock('./use-alert-inhibit-action-capabilities', () => ({
  useAlertInhibitActionCapabilities: () => access.capabilities
}));

describe('Alert Inhibit controller composition', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    access.capabilities = { canWrite: true, canDelete: true };
    api.loadAlertInhibits.mockImplementation((query: AlertInhibitQuery) =>
      Promise.resolve(alertInhibitPage(query, []))
    );
    api.loadAllAlertInhibits.mockResolvedValue([]);
    api.loadAlertInhibit.mockResolvedValue(persistedAlertInhibit);
    api.saveAlertInhibit.mockResolvedValue(undefined);
    settings.loadLabelSuggestions.mockResolvedValue({ keys: ['environment'], valuesByKey: {} });
  });

  it('retires selected ids when ADMIN-only delete capability is lost', async () => {
    api.loadAlertInhibits.mockImplementation((query: AlertInhibitQuery) =>
      Promise.resolve(alertInhibitPage(query, [persistedAlertInhibit]))
    );
    const view = renderAlertInhibitController();
    await waitFor(() => expect(view.result.current.state.list.kind).toBe('ready'));
    act(() => view.result.current.selectIds([persistedAlertInhibit.id]));
    expect(view.result.current.state.selectedIds).toEqual([persistedAlertInhibit.id]);

    access.capabilities = { canWrite: true, canDelete: false };
    view.rerender();

    await waitFor(() => expect(view.result.current.state.selectedIds).toEqual([]));
  });

  it('keeps an acknowledged create without identity open as commit-uncertain', async () => {
    const { result } = renderAlertInhibitController();
    await waitFor(() => expect(result.current.state.list.kind).toBe('empty'));
    act(() => result.current.create());
    act(() => result.current.updateDraft(validAlertInhibitDraft()));
    await act(async () => result.current.submit());

    expect(result.current.state.draft).not.toBeNull();
    expect(result.current.state.recovery).toEqual({
      kind: 'save',
      phase: 'commit-uncertain',
      retryable: true
    });
    expect(notify.success).not.toHaveBeenCalled();
  });

  it('blocks query mutations and manual refresh while a command owns the route', async () => {
    const write = deferred<void>();
    api.saveAlertInhibit.mockReturnValueOnce(write.promise);
    const { result } = renderAlertInhibitController();
    await waitFor(() => expect(result.current.state.list.kind).toBe('empty'));
    act(() => result.current.create());
    act(() => result.current.updateDraft(validAlertInhibitDraft()));
    let submission!: Promise<void>;
    act(() => {
      submission = result.current.submit();
    });

    act(() => {
      result.current.setSearch('must not publish');
      result.current.submitSearch();
      result.current.changePage(2, 15);
      void result.current.refresh();
    });
    expect(result.current.state.search).toBe('');
    expect(result.current.state.query).toEqual({ search: '', pageIndex: 0, pageSize: 8 });
    expect(api.loadAlertInhibits).toHaveBeenCalledTimes(1);

    act(() => write.resolve(undefined));
    await act(async () => submission);
  });

  it('rereads the latest visible query after a pending command', async () => {
    const write = deferred<void>();
    api.saveAlertInhibit.mockReturnValueOnce(write.promise);
    const routed = renderRoutedController(['/alerts/inhibits?search=old&pageIndex=0&pageSize=8']);
    await waitFor(() => expect(routed.current().state.list.kind).toBe('empty'));
    await act(async () => routed.current().edit(persistedAlertInhibit.id));
    act(() => routed.current().updateDraft(validAlertInhibitDraft()));
    let submission!: Promise<void>;
    act(() => {
      submission = routed.current().submit();
    });
    await waitFor(() => expect(api.saveAlertInhibit).toHaveBeenCalledTimes(1));

    await act(async () => routed.router.navigate('/alerts/inhibits?search=latest&pageIndex=0&pageSize=8'));
    const latestQuery = { search: 'latest', pageIndex: 0, pageSize: 8 };
    await waitFor(() => expect(api.loadAlertInhibits).toHaveBeenCalledWith(latestQuery, expect.any(AbortSignal)));
    api.loadAlertInhibits.mockClear();
    act(() => write.resolve(undefined));
    await act(async () => submission);

    expect(api.loadAlertInhibits).toHaveBeenCalledWith(latestQuery, expect.any(AbortSignal));
  });
});

function renderAlertInhibitController(entry = '/alerts/inhibits?pageIndex=0&pageSize=8') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[entry]}>{children}</MemoryRouter>
    </QueryClientProvider>
  );
  return renderHook(() => useAlertInhibitController(), { wrapper });
}

function renderRoutedController(entries: string[]) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  let controller: ReturnType<typeof useAlertInhibitController> | undefined;
  function Probe() {
    controller = useAlertInhibitController();
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
