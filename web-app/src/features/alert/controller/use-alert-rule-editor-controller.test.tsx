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
import { createMemoryRouter, MemoryRouter, Route, Routes, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiMessageError } from '@/core/http/api-message';

import {
  AlertRuleContractError,
  AlertRuleMissingError,
  type AlertRule,
  type AlertRuleQuery
} from '../alert-rule-model';
import { useAlertRuleEditorController } from './use-alert-rule-editor-controller';

const api = vi.hoisted(() => ({
  loadAlertRule: vi.fn(),
  loadAlertRules: vi.fn(),
  previewAlertRule: vi.fn(),
  saveAlertRule: vi.fn()
}));
const notify = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn(), warning: vi.fn() }));
vi.mock('../alert-rule-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../alert-rule-api')>()),
  ...api
}));
vi.mock('antd', async importOriginal => ({
  ...(await importOriginal<typeof import('antd')>()),
  App: { useApp: () => ({ message: notify }) }
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const persisted: AlertRule = {
  id: 7,
  name: 'CPU',
  type: 'realtime_metric',
  datasource: 'promql',
  expr: 'usage > 90',
  period: null,
  times: null,
  labels: { severity: 'critical' },
  annotations: { summary: 'CPU' },
  template: null,
  enable: true
};

describe('Alert Rule editor controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.loadAlertRule.mockResolvedValue(persisted);
    api.loadAlertRules.mockImplementation((query: AlertRuleQuery) => Promise.resolve(page(query, [])));
    api.previewAlertRule.mockResolvedValue([]);
    api.saveAlertRule.mockResolvedValue(undefined);
  });

  it.each([' 7', '1e2', '+1', '0'])('rejects invalid route id %s without a request', async ruleId => {
    const { result } = renderController('edit', `/alerts/rules/${encodeURIComponent(ruleId)}/edit`);
    await waitFor(() => expect(result.current.state.detail.kind).toBe('error'));
    await act(async () => result.current.retryDetail());
    expect(api.loadAlertRule).not.toHaveBeenCalled();
  });

  it.each([
    [new AlertRuleMissingError(), 'missing'],
    [new ApiMessageError('offline', { status: 503 }), 'unavailable'],
    [new AlertRuleContractError('bad'), 'error']
  ])('keeps detail failure %s distinct and retryable', async (reason, kind) => {
    api.loadAlertRule.mockRejectedValueOnce(reason).mockResolvedValueOnce(persisted);
    const { result } = renderController('edit');
    await waitFor(() => expect(result.current.state.detail.kind).toBe(kind));
    await act(async () => result.current.retryDetail());
    await waitFor(() => expect(result.current.state.detail.kind).toBe('ready'));
    expect(result.current.state.draft).toMatchObject({ id: 7, name: 'CPU' });
  });

  it('resets a local draft when route history changes', async () => {
    api.loadAlertRule.mockImplementation((id: number) => Promise.resolve({ ...persisted, id, name: `Rule ${id}` }));
    const routed = renderRouted(['/alerts/rules/7/edit', '/alerts/rules/8/edit']);
    await waitFor(() => expect(routed.current().state.draft?.name).toBe('Rule 7'));
    act(() => routed.current().updateDraft({ name: 'local' }));
    await act(async () => routed.router.navigate(1));
    await waitFor(() => expect(routed.current().state.draft?.name).toBe('Rule 8'));
    await act(async () => routed.router.navigate(-1));
    await waitFor(() => expect(routed.current().state.draft?.name).toBe('Rule 7'));
  });

  it.each([
    [[], 'empty'],
    [[{ value: 1 }], 'ready'],
    [new ApiMessageError('offline', { status: 503 }), 'unavailable'],
    [new AlertRuleContractError('bad'), 'error']
  ])('keeps preview evidence distinct as %s', async (evidence, kind) => {
    if (evidence instanceof Error) api.previewAlertRule.mockRejectedValue(evidence);
    else api.previewAlertRule.mockResolvedValue(evidence);
    const { result } = renderController('new', '/alerts/rules/new');
    act(() => result.current.updateDraft({ expr: 'usage > 90' }));
    await act(async () => result.current.preview());
    expect(result.current.state.preview.kind).toBe(kind);
  });

  it('keeps only the latest same-route preview when completions arrive out of order', async () => {
    const first = deferred<Array<Record<string, unknown>>>();
    const second = deferred<Array<Record<string, unknown>>>();
    api.previewAlertRule.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const { result } = renderController('new', '/alerts/rules/new');
    act(() => result.current.updateDraft({ expr: 'usage > 90' }));

    let firstPreview!: Promise<void>;
    let secondPreview!: Promise<void>;
    act(() => {
      firstPreview = result.current.preview();
      secondPreview = result.current.preview();
    });
    act(() => second.resolve([{ request: 'latest' }]));
    await act(async () => secondPreview);
    expect(result.current.state.preview).toEqual({ kind: 'ready', records: [{ request: 'latest' }] });

    act(() => first.resolve([{ request: 'stale' }]));
    await act(async () => firstPreview);
    expect(result.current.state.preview).toEqual({ kind: 'ready', records: [{ request: 'latest' }] });
  });

  it('does not let a stale preview completion replace current editor state', async () => {
    const preview = deferred<Array<Record<string, unknown>>>();
    api.previewAlertRule.mockReturnValue(preview.promise);
    const { result } = renderController('new', '/alerts/rules/new');
    act(() => result.current.updateDraft({ expr: 'usage > 90' }));
    let pending!: Promise<void>;
    act(() => {
      pending = result.current.preview();
    });

    act(() => result.current.updateDraft({ expr: 'usage > 95' }));
    act(() => preview.resolve([{ request: 'stale' }]));
    await act(async () => pending);

    expect(result.current.state.draft?.expr).toBe('usage > 95');
    expect(result.current.state.preview.kind).toBe('idle');
  });

  it('saves PUT only after exact-id all-field canonical convergence', async () => {
    const routed = renderRouted(['/alerts/rules/7/edit']);
    await waitFor(() => expect(routed.current().state.detail.kind).toBe('ready'));
    api.loadAlertRule.mockResolvedValue({ ...persisted, labels: { severity: 'critical' } });
    await act(async () => routed.current().save());
    expect(routed.router.state.location.pathname).toBe('/alerts/rules');
    expect(notify.success).toHaveBeenCalled();

    const second = renderController('edit');
    await waitFor(() => expect(second.result.current.state.detail.kind).toBe('ready'));
    api.loadAlertRule.mockResolvedValue({ ...persisted, annotations: {} });
    await act(async () => second.result.current.save());
    expect(second.result.current.state.draft).not.toBeNull();
    expect(notify.error).toHaveBeenCalledWith('alertRules.saveFailed');
  });

  it('proves POST by traversing pages for one exact normalized name and convergence', async () => {
    const routed = renderRouted(['/alerts/rules/new']);
    act(() => routed.current().updateDraft(validDraft()));
    api.loadAlertRules
      .mockImplementationOnce((query: AlertRuleQuery) =>
        Promise.resolve({ ...page(query, []), totalElements: 26, totalPages: 2 })
      )
      .mockImplementationOnce((query: AlertRuleQuery) =>
        Promise.resolve({
          ...page(query, [
            {
              ...persisted,
              id: 9,
              name: 'New Rule',
              expr: 'usage > 90',
              period: 300,
              times: 3,
              labels: {},
              annotations: {},
              template: 'Alert'
            }
          ]),
          totalElements: 26,
          totalPages: 2
        })
      );
    await act(async () => routed.current().save());
    expect(api.loadAlertRules).toHaveBeenCalledTimes(2);
    expect(routed.router.state.location.pathname).toBe('/alerts/rules');
  });

  it('admits only one same-tick save write', async () => {
    const write = deferred<void>();
    api.saveAlertRule.mockReturnValue(write.promise);
    const { result } = renderController('new', '/alerts/rules/new');
    act(() => result.current.updateDraft(validDraft()));

    let first!: Promise<void>;
    let second!: Promise<void>;
    act(() => {
      first = result.current.save();
      second = result.current.save();
    });
    expect(api.saveAlertRule).toHaveBeenCalledTimes(1);

    act(() => write.resolve());
    await act(async () => Promise.all([first, second]));
    expect(api.saveAlertRule).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['non-finite', Number.NaN],
    ['over-limit', 1_000_000]
  ])('rejects %s create-proof page counts without starting an unbounded scan', async (_label, totalPages) => {
    const routed = renderRouted(['/alerts/rules/new']);
    act(() => routed.current().updateDraft(validDraft()));
    const matching = {
      ...persisted,
      id: 9,
      name: 'New Rule',
      expr: 'usage > 90',
      period: 300,
      times: 3,
      labels: {},
      annotations: {},
      template: 'Alert'
    };
    api.loadAlertRules
      .mockResolvedValueOnce({
        ...page({ search: 'New Rule', pageIndex: 0, pageSize: 25 }, [matching]),
        totalElements: 25_000_000,
        totalPages
      })
      .mockRejectedValueOnce(new Error('proof scan escaped its first page'));

    await act(async () => routed.current().save());

    expect(api.loadAlertRules).toHaveBeenCalledTimes(1);
    expect(routed.router.state.location.pathname).toBe('/alerts/rules/new');
    expect(routed.current().state.saveFailure).toBe('error');
    expect(notify.success).not.toHaveBeenCalled();
  });

  it('keeps create draft when canonical name is missing, duplicate, or drifting', async () => {
    for (const records of [
      [],
      [
        { ...persisted, name: 'New Rule' },
        { ...persisted, id: 8, name: 'New Rule' }
      ],
      [{ ...persisted, name: 'New Rule', annotations: { drift: 'yes' } }]
    ]) {
      vi.clearAllMocks();
      api.saveAlertRule.mockResolvedValue(undefined);
      api.loadAlertRules.mockImplementation((query: AlertRuleQuery) => Promise.resolve(page(query, records)));
      const { result } = renderController('new', '/alerts/rules/new');
      act(() => result.current.updateDraft(validDraft()));
      await act(async () => result.current.save());
      expect(result.current.state.draft).not.toBeNull();
      expect(notify.success).not.toHaveBeenCalled();
    }
  });

  it('cancel only navigates and performs no writes', () => {
    const routed = renderRouted(['/alerts/rules/new']);
    act(() => routed.current().cancel());
    expect(routed.router.state.location.pathname).toBe('/alerts/rules');
    expect(api.saveAlertRule).not.toHaveBeenCalled();
  });

  it('does not let stale detail overwrite the next route draft', async () => {
    const oldDetail = deferred<AlertRule>();
    api.loadAlertRule
      .mockReturnValueOnce(oldDetail.promise)
      .mockResolvedValueOnce({ ...persisted, id: 8, name: 'Rule 8' });
    const routed = renderRouted(['/alerts/rules/7/edit', '/alerts/rules/8/edit']);
    await act(async () => routed.router.navigate(1));
    await waitFor(() => expect(routed.current().state.draft?.name).toBe('Rule 8'));
    act(() => oldDetail.resolve({ ...persisted, name: 'Rule 7' }));
    await waitFor(() => expect(routed.current().state.draft?.name).toBe('Rule 8'));
  });

  it('does not let stale preview overwrite a new route', async () => {
    const oldPreview = deferred<Array<Record<string, unknown>>>();
    api.previewAlertRule.mockReturnValue(oldPreview.promise);
    api.loadAlertRule.mockImplementation((id: number) => Promise.resolve({ ...persisted, id }));
    const routed = renderRouted(['/alerts/rules/new', '/alerts/rules/8/edit']);
    act(() => routed.current().updateDraft({ expr: 'usage > 90' }));
    let preview!: Promise<void>;
    act(() => {
      preview = routed.current().preview();
    });
    await act(async () => routed.router.navigate(1));
    await waitFor(() => expect(routed.current().state.draft?.id).toBe(8));
    act(() => oldPreview.resolve([{ stale: true }]));
    await act(async () => preview);
    expect(routed.current().state.preview.kind).toBe('idle');
  });

  it('does not let a stale save prove success or navigate away from the new route', async () => {
    const oldSave = deferred<void>();
    api.saveAlertRule.mockReturnValue(oldSave.promise);
    const routed = renderRouted(['/alerts/rules/new', '/alerts/rules/8/edit']);
    act(() => routed.current().updateDraft(validDraft()));
    let save!: Promise<void>;
    act(() => {
      save = routed.current().save();
    });
    await waitFor(() => expect(api.saveAlertRule).toHaveBeenCalled());
    await act(async () => routed.router.navigate(1));
    act(() => oldSave.resolve());
    await act(async () => save);
    expect(routed.router.state.location.pathname).toBe('/alerts/rules/8/edit');
    expect(api.loadAlertRules).not.toHaveBeenCalled();
    expect(notify.success).not.toHaveBeenCalled();
    expect(routed.current().state.command).toBe('idle');
  });

  it('invalidates a stale save when its route component unmounts', async () => {
    const oldSave = deferred<void>();
    api.saveAlertRule.mockReturnValue(oldSave.promise);
    const routed = renderRouted(['/alerts/rules/new']);
    act(() => routed.current().updateDraft(validDraft()));
    let save!: Promise<void>;
    act(() => {
      save = routed.current().save();
    });
    await waitFor(() => expect(api.saveAlertRule).toHaveBeenCalled());
    await act(async () => routed.router.navigate('/alerts/rules'));
    act(() => oldSave.resolve());
    await act(async () => save);
    expect(routed.router.state.location.pathname).toBe('/alerts/rules');
    expect(api.loadAlertRules).not.toHaveBeenCalled();
    expect(notify.success).not.toHaveBeenCalled();
  });
});

function validDraft() {
  return { name: ' New Rule ', expr: 'usage > 90', template: 'Alert', period: 300, times: 3 };
}

function renderController(mode: 'new' | 'edit', entry = '/alerts/rules/7/edit') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="/alerts/rules/new" element={children} />
          <Route path="/alerts/rules/:ruleId/edit" element={children} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
  return renderHook(() => useAlertRuleEditorController(mode), { wrapper });
}

function renderRouted(entries: string[]) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  let controller: ReturnType<typeof useAlertRuleEditorController> | undefined;
  function Probe({ mode }: { mode: 'new' | 'edit' }) {
    controller = useAlertRuleEditorController(mode);
    return null;
  }
  const router = createMemoryRouter(
    [
      {
        path: '/alerts/rules/new',
        element: (
          <QueryClientProvider client={client}>
            <Probe mode="new" />
          </QueryClientProvider>
        )
      },
      {
        path: '/alerts/rules/:ruleId/edit',
        element: (
          <QueryClientProvider client={client}>
            <Probe mode="edit" />
          </QueryClientProvider>
        )
      },
      { path: '/alerts/rules', element: null }
    ],
    {
      initialEntries: entries,
      initialIndex: 0
    }
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

function page(query: AlertRuleQuery, content: AlertRule[]) {
  return {
    content,
    totalElements: content.length,
    totalPages: Math.ceil(content.length / query.pageSize),
    number: query.pageIndex,
    size: query.pageSize
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => {
    resolve = done;
  });
  return { promise, resolve };
}
