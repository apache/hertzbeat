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

import { AlertRuleContractError, AlertRuleMissingError, type AlertRule, type AlertRuleQuery } from '../alert-rule-model';
import { useAlertRuleListController } from './use-alert-rule-list-controller';

const api = vi.hoisted(() => ({
  deleteAlertRules: vi.fn(), loadAlertRule: vi.fn(), loadAlertRules: vi.fn(), updateAlertRuleEnabled: vi.fn()
}));
const notify = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));

vi.mock('../alert-rule-api', async importOriginal => ({ ...(await importOriginal<typeof import('../alert-rule-api')>()), ...api }));
vi.mock('antd', async importOriginal => ({
  ...(await importOriginal<typeof import('antd')>()), App: { useApp: () => ({ message: notify }) }
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const persisted: AlertRule = {
  id: 7, name: 'CPU', type: 'realtime_metric', datasource: 'promql', expr: 'usage > 90', period: null, times: null,
  labels: { severity: 'critical', team: 'ops' }, annotations: { summary: 'CPU high' }, template: null,
  enable: true, gmtUpdate: '2026-07-17T09:00:00'
};

describe('Alert Rule list controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.loadAlertRules.mockImplementation((query: AlertRuleQuery) => Promise.resolve(page(query, [])));
    api.loadAlertRule.mockResolvedValue(persisted);
    api.updateAlertRuleEnabled.mockResolvedValue(undefined);
    api.deleteAlertRules.mockResolvedValue(undefined);
  });

  it('owns canonical search, POP convergence, page size, and navigation', async () => {
    const routed = renderRouted(['/alerts/rules?search=A&pageIndex=1&pageSize=15', '/alerts/rules?search=B&pageIndex=2&pageSize=8']);
    await waitFor(() => expect(routed.current().state.list.kind).toBe('empty'));
    act(() => routed.current().setSearch('draft'));
    await act(async () => routed.router.navigate(1));
    expect(routed.current().state).toMatchObject({ search: 'B', query: { search: 'B', pageIndex: 2, pageSize: 8 } });
    await act(async () => routed.router.navigate(-1));
    expect(routed.current().state.search).toBe('A');
    act(() => routed.current().changePage(3, 25));
    await waitFor(() => expect(routed.current().state.query.pageIndex).toBe(0));
    act(() => routed.current().create());
    expect(routed.router.state.location.pathname).toBe('/alerts/rules/new');
  });

  it.each([[new ApiMessageError('offline', { status: 503 }), 'unavailable'], [new AlertRuleContractError('bad'), 'error']])('keeps list failures distinct as %s', async (reason, kind) => {
    api.loadAlertRules.mockRejectedValue(reason);
    const { result } = renderController();
    await waitFor(() => expect(result.current.state.list.kind).toBe(kind));
  });

  it('keeps out-of-range nonzero evidence ready', async () => {
    api.loadAlertRules.mockImplementation((query: AlertRuleQuery) => Promise.resolve({ ...page(query, []), totalElements: 5, totalPages: 1 }));
    const { result } = renderController('/alerts/rules?pageIndex=2&pageSize=8');
    await waitFor(() => expect(result.current.state.list).toEqual({ kind: 'ready', records: [], total: 5 }));
  });

  it('proves toggle by exact id and every writable field with strict map null semantics', async () => {
    const { result } = renderController();
    await waitFor(() => expect(result.current.state.list.kind).toBe('empty'));
    api.loadAlertRule.mockResolvedValueOnce({
      ...persisted, labels: { team: 'ops', severity: 'critical' }, annotations: { summary: 'CPU high' }, enable: false
    });
    await act(async () => result.current.toggle(persisted, false));
    expect(notify.success).toHaveBeenCalledWith('alertRules.operationSuccess');

    vi.clearAllMocks();
    api.updateAlertRuleEnabled.mockResolvedValue(undefined);
    api.loadAlertRule.mockResolvedValue({ ...persisted, labels: {}, enable: false });
    await act(async () => result.current.toggle({ ...persisted, labels: null }, false));
    expect(notify.success).not.toHaveBeenCalled();
  });

  it.each([
    [{ ...persisted, id: 8, enable: false }],
    [{ ...persisted, annotations: {}, enable: false }],
    [{ ...persisted, times: 1, enable: false }]
  ])('does not report toggle success for canonical drift', async canonical => {
    const { result } = renderController();
    await waitFor(() => expect(result.current.state.list.kind).toBe('empty'));
    api.loadAlertRule.mockResolvedValue(canonical);
    await act(async () => result.current.toggle(persisted, false));
    expect(notify.success).not.toHaveBeenCalled();
    expect(notify.error).toHaveBeenCalledWith('alertRules.operationFailed');
  });

  it('deletes only after missing detail and authoritative list absence', async () => {
    const { result } = renderController();
    await waitFor(() => expect(result.current.state.list.kind).toBe('empty'));
    api.loadAlertRule.mockRejectedValue(new AlertRuleMissingError());
    await act(async () => result.current.remove(7));
    expect(notify.success).toHaveBeenCalled();
    vi.clearAllMocks();
    api.deleteAlertRules.mockResolvedValue(undefined);
    api.loadAlertRule.mockRejectedValue(new AlertRuleMissingError());
    api.loadAlertRules.mockImplementation((query: AlertRuleQuery) => Promise.resolve(page(query, [persisted])));
    await act(async () => result.current.remove(7));
    expect(notify.success).not.toHaveBeenCalled();
  });
});

function renderController(entry = '/alerts/rules?pageIndex=0&pageSize=8') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={client}><MemoryRouter initialEntries={[entry]}>{children}</MemoryRouter></QueryClientProvider>;
  return renderHook(() => useAlertRuleListController(), { wrapper });
}

function renderRouted(entries: string[]) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  let controller: ReturnType<typeof useAlertRuleListController> | undefined;
  function Probe() { controller = useAlertRuleListController(); return null; }
  const router = createMemoryRouter([{ path: '*', element: <QueryClientProvider client={client}><Probe /></QueryClientProvider> }], {
    initialEntries: entries, initialIndex: 0
  });
  render(<RouterProvider router={router} />);
  return { router, current: () => { if (!controller) throw new Error('not mounted'); return controller; } };
}

function page(query: AlertRuleQuery, content: AlertRule[]) {
  return { content, totalElements: content.length, totalPages: Math.ceil(content.length / query.pageSize), number: query.pageIndex, size: query.pageSize };
}
