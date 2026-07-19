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

import type { AlertInhibitQuery } from '../alert-inhibit-model';
import {
  alertInhibitPage,
  deferred,
  persistedAlertInhibit,
  validAlertInhibitDraft
} from './alert-inhibit-controller-test-fixtures';
import { useAlertInhibitController } from './use-alert-inhibit-controller';

const api = vi.hoisted(() => ({
  loadAlertInhibit: vi.fn(),
  loadAlertInhibits: vi.fn(),
  saveAlertInhibit: vi.fn()
}));
const notify = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn(), warning: vi.fn() }));

vi.mock('../alert-inhibit-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../alert-inhibit-api')>()),
  ...api
}));
vi.mock('antd', async importOriginal => ({
  ...(await importOriginal<typeof import('antd')>()),
  App: { useApp: () => ({ message: notify }) }
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe('Alert Inhibit controller composition', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.loadAlertInhibits.mockImplementation((query: AlertInhibitQuery) =>
      Promise.resolve(alertInhibitPage(query, []))
    );
    api.loadAlertInhibit.mockResolvedValue(persistedAlertInhibit);
    api.saveAlertInhibit.mockResolvedValue(undefined);
  });

  it('keeps create open until the composed authoritative reread succeeds', async () => {
    const reread = deferred<ReturnType<typeof alertInhibitPage>>();
    const { result } = renderAlertInhibitController();
    await waitFor(() => expect(result.current.state.list.kind).toBe('empty'));
    api.loadAlertInhibits.mockReturnValueOnce(reread.promise);
    act(() => result.current.create());
    act(() => result.current.updateDraft(validAlertInhibitDraft()));
    let submission!: Promise<void>;
    act(() => {
      submission = result.current.submit();
    });
    await waitFor(() => expect(api.saveAlertInhibit).toHaveBeenCalled());
    expect(result.current.state.draft).not.toBeNull();
    act(() => reread.resolve(alertInhibitPage(result.current.state.query, [persistedAlertInhibit])));
    await act(async () => submission);
    expect(result.current.state.draft).toBeNull();
    expect(notify.success).toHaveBeenCalledWith('alertInhibits.saveSuccess');

    api.loadAlertInhibits.mockRejectedValueOnce(new ApiMessageError('offline', { status: 503 }));
    act(() => result.current.create());
    act(() => result.current.updateDraft(validAlertInhibitDraft()));
    await act(async () => result.current.submit());
    expect(result.current.state.draft).not.toBeNull();
    expect(result.current.state.editorFailure).toBe('unavailable');
  });

  it('rereads the latest visible query after a pending command', async () => {
    const write = deferred<void>();
    api.saveAlertInhibit.mockReturnValueOnce(write.promise);
    const routed = renderRoutedController(['/alerts/inhibits?search=old&pageIndex=0&pageSize=8']);
    await waitFor(() => expect(routed.current().state.list.kind).toBe('empty'));
    act(() => routed.current().create());
    act(() => routed.current().updateDraft(validAlertInhibitDraft()));
    let submission!: Promise<void>;
    act(() => {
      submission = routed.current().submit();
    });
    await waitFor(() => expect(api.saveAlertInhibit).toHaveBeenCalledTimes(1));

    await act(async () => routed.router.navigate('/alerts/inhibits?search=latest&pageIndex=2&pageSize=8'));
    const latestQuery = { search: 'latest', pageIndex: 2, pageSize: 8 };
    await waitFor(() => expect(api.loadAlertInhibits).toHaveBeenCalledWith(latestQuery));
    api.loadAlertInhibits.mockClear();
    act(() => write.resolve(undefined));
    await act(async () => submission);

    expect(api.loadAlertInhibits).toHaveBeenCalledWith(latestQuery);
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
