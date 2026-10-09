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
import { act, cleanup, render, renderHook, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  detectMonitor: vi.fn(),
  loadMonitorAppGuidance: vi.fn(),
  loadMonitorApps: vi.fn(),
  loadMonitorCollectors: vi.fn(),
  loadMonitorDetail: vi.fn(),
  loadMonitorParamDefines: vi.fn(),
  saveMonitor: vi.fn()
}));
const notify = vi.hoisted(() => ({ error: vi.fn(), info: vi.fn(), success: vi.fn(), warning: vi.fn() }));
const confirmations = vi.hoisted(() => ({
  entries: [] as { onOk: () => void; onCancel: () => void; destroy: ReturnType<typeof vi.fn> }[],
  confirm: vi.fn()
}));
const runtime = vi.hoisted(() => ({ locale: 'en' }));
vi.mock('../api/monitor-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/monitor-api')>()),
  ...api
}));
vi.mock('antd', async importOriginal => ({
  ...(await importOriginal<typeof import('antd')>()),
  App: { useApp: () => ({ message: notify, modal: { confirm: confirmations.confirm } }) }
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: runtime.locale, resolvedLanguage: runtime.locale }
  })
}));

import { useMonitorEditorController } from './use-monitor-editor-controller';
import { useMonitorEditorDraft } from './use-monitor-editor-draft';
import { createMonitorEditorDraft } from '../model/monitor-editor-draft';
import type { MonitorEditorDraft } from '../model/monitor-editor-model';

const detail = {
  monitor: {
    id: 7,
    jobId: 9,
    app: 'website',
    name: 'home',
    instance: 'home',
    status: 0,
    type: 0,
    intervals: 60,
    scheduleType: 'interval',
    cronExpression: null,
    scrape: 'static',
    labels: null,
    annotations: null,
    description: null
  },
  collector: null,
  params: [],
  grafanaDashboard: null,
  metrics: []
};

const headersDefine = {
  id: null,
  app: 'website',
  field: 'headers',
  name: { 'en-US': 'Headers' },
  type: 'key-value',
  required: false,
  defaultValue: null,
  placeholder: null,
  range: null,
  limit: null,
  options: null,
  keyAlias: null,
  valueAlias: null,
  depend: null,
  hide: false
};

describe('monitor editor route draft protection', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    confirmations.entries.length = 0;
    confirmations.confirm.mockImplementation((options: { onOk: () => void; onCancel: () => void }) => {
      const entry = { ...options, destroy: vi.fn() };
      confirmations.entries.push(entry);
      return entry;
    });
    api.loadMonitorApps.mockResolvedValue([
      { value: 'website', label: 'Website' },
      { value: 'api', label: 'API' }
    ]);
    api.loadMonitorCollectors.mockResolvedValue([]);
    api.loadMonitorDetail.mockResolvedValue({
      ...detail,
      params: [{ field: 'host', type: 1, paramValue: 'saved.example.test' }]
    });
    api.loadMonitorAppGuidance.mockResolvedValue({ help: null, helpUrl: null });
    api.loadMonitorParamDefines.mockImplementation((app: string) =>
      Promise.resolve([
        { ...headersDefine, app, field: 'host', type: 'host', required: true, defaultValue: null },
        { ...headersDefine, app }
      ])
    );
    api.saveMonitor.mockResolvedValue(undefined);
  });
  afterEach(cleanup);

  it.each(['new', 'edit'] as const)(
    'Cancel preserves all %s fields and Discard leaves once on Back/Forward/sidebar',
    async mode => {
      const routed = renderController(mode, mode === 'new' ? '/monitors/new?app=website' : '/monitors/7/edit');
      await ready(routed);
      act(() => {
        routed.current().actions.updateMonitor({ name: 'Synthetic unsent' });
        routed.current().actions.updateParam('host', 'unsent.example.test');
        routed.current().actions.updateParam('headers', { 'x-fixture': 'unsent' });
        routed.current().actions.updateCollector('synthetic-collector');
        routed.current().actions.updateGrafana({ enabled: true });
      });
      const draft = structuredClone(routed.current().state.draft);
      const originalKey = routed.router.state.location.key;
      for (const target of [-1, 1, '/monitors']) {
        await act(() => (typeof target === 'number' ? routed.router.navigate(target) : routed.router.navigate(target)));
        expect(confirmations.entries.length).toBeGreaterThan(0);
        act(() => latest().onCancel());
        expect(routed.router.state.location.key).toBe(originalKey);
        expect(routed.current().state.draft).toEqual(draft);
      }
      const transitions: string[] = [];
      const unsubscribe = routed.router.subscribe(state => {
        if (state.location.key !== originalKey && transitions.at(-1) !== state.location.key)
          transitions.push(state.location.key);
      });
      await act(() => routed.router.navigate(-1));
      act(() => latest().onOk());
      await waitFor(() => expect(routed.router.state.location.pathname).toBe('/monitors'));
      expect(transitions).toHaveLength(1);
      unsubscribe();
      expect(api.saveMonitor).not.toHaveBeenCalled();
      expect(api.detectMonitor).not.toHaveBeenCalled();
    }
  );

  it.each(['new', 'edit'] as const)('restored %s baseline leaves without confirmation', async mode => {
    const routed = renderController(mode, mode === 'new' ? '/monitors/new?app=website' : '/monitors/7/edit');
    await ready(routed);
    const initial = structuredClone(routed.current().state.draft);
    act(() => routed.current().actions.updateParam('host', 'temporary.example.test'));
    act(() =>
      routed.current().actions.updateParam('host', initial?.params.find(p => p.field === 'host')?.paramValue ?? null)
    );
    act(() => routed.current().actions.updateMonitor(initial?.monitor ?? {}));
    expect(routed.current().state.draft).toEqual(initial);
    await act(() => routed.router.navigate(-1));
    expect(confirmations.entries).toHaveLength(0);
    expect(routed.router.state.location.pathname).toBe('/monitors');
  });

  it.each(['new', 'edit'] as const)('untouched %s editor leaves without confirmation', async mode => {
    const routed = renderController(mode, mode === 'new' ? '/monitors/new?app=website' : '/monitors/7/edit');
    await ready(routed);
    await act(() => routed.router.navigate(-1));
    expect(confirmations.entries).toHaveLength(0);
    expect(routed.router.state.location.pathname).toBe('/monitors');
  });

  it('dynamic host alone guards, Change Type preserves existing source contract, and explicit Cancel discards', async () => {
    const routed = renderController('new', '/monitors/new?app=website');
    await ready(routed);
    act(() => routed.current().actions.updateParam('host', 'host-only.example.test'));
    await act(() => routed.router.navigate(-1));
    expect(confirmations.entries.length).toBeGreaterThan(0);
    act(() => latest().onCancel());
    act(() => routed.current().actions.changeSource({ app: 'api' }));
    await waitFor(() => expect(routed.current().state.draft?.monitor.app).toBe('api'));
    expect(routed.current().state.draft?.params.find(p => p.field === 'host')?.paramValue).toBeNull();
    const beforeLeave = confirmations.entries.length;
    await act(() => routed.router.navigate('/monitors'));
    expect(confirmations.entries.length).toBe(beforeLeave + 1);
    act(() => latest().onCancel());
    expect(routed.router.state.location.pathname).toBe('/monitors/new');
    act(() => routed.current().actions.changeSource({ app: 'website' }));
    await waitFor(() => expect(routed.current().state.draft?.monitor.app).toBe('website'));
    expect(routed.current().state.draft?.params.find(p => p.field === 'host')?.paramValue).toBe(
      'host-only.example.test'
    );
    const count = confirmations.entries.length;
    act(() => routed.current().actions.cancel());
    await waitFor(() => expect(routed.router.state.location.pathname).toBe('/monitors'));
    expect(confirmations.entries).toHaveLength(count);
  });

  it('retains dirty ownership when canonical resources become unavailable', () => {
    const canonical = createMonitorEditorDraft(undefined, 'website', 'static', []);
    const initialProps: { canonical: MonitorEditorDraft | undefined } = { canonical };
    const view = renderHook(({ canonical }) => useMonitorEditorDraft('source', canonical, [], 'static'), {
      initialProps
    });
    act(() => view.result.current.update(draft => ({ ...draft, monitor: { ...draft.monitor, name: 'Unsent' } })));
    expect(view.result.current.dirty).toBe(true);
    view.rerender({ canonical: undefined });
    expect(view.result.current.dirty).toBe(true);
  });

  it('mixed history/unmount retires stale callbacks and leaves the current intent untouched', async () => {
    const routed = renderController('new', '/monitors/new?app=website');
    await ready(routed);
    act(() => routed.current().actions.updateParam('host', 'lifecycle.example.test'));
    await act(() => routed.router.navigate(-1));
    const old = latest();
    await act(() => routed.router.navigate(1));
    expect(confirmations.entries.filter(entry => entry.destroy.mock.calls.length === 0)).toHaveLength(1);
    act(() => old.onOk());
    expect(routed.router.state.location.pathname).toBe('/monitors/new');
    const pending = latest();
    cleanup();
    expect(pending.destroy).toHaveBeenCalledTimes(1);
    act(() => pending.onOk());
    act(() => pending.onCancel());
    expect(routed.router.state.location.pathname).toBe('/monitors/new');
    expect(routed.router.state.blockers.size).toBe(0);
  });

  it('mock save acknowledgement while blocked retires confirmation and navigates once', async () => {
    const errors = vi.spyOn(console, 'error');
    const routed = renderController('new', '/monitors/new?app=website');
    await ready(routed);
    act(() => {
      routed.current().actions.updateMonitor({ name: 'Pending save' });
      routed.current().actions.updateParam('host', 'pending.example.test');
    });
    let complete = () => {};
    api.saveMonitor.mockImplementation(
      () =>
        new Promise<void>(resolve => {
          complete = resolve;
        })
    );
    let saving: Promise<void> | undefined;
    act(() => {
      saving = routed.current().actions.save();
    });
    await act(() => routed.router.navigate(-1));
    const pending = latest();
    await act(async () => {
      complete();
      await saving;
    });
    await waitFor(() => expect(routed.router.state.location.pathname).toBe('/monitors'));
    act(() => pending.onOk());
    act(() => pending.onCancel());
    expect(pending.destroy).toHaveBeenCalledTimes(1);
    expect(api.saveMonitor).toHaveBeenCalledTimes(1);
    expect(api.detectMonitor).not.toHaveBeenCalled();
    expect(errors.mock.calls.flat().map(String).join(' ')).not.toContain('Invalid blocker state transition');
    errors.mockRestore();
  });

  it('acknowledged mock save bypasses guard but failed save keeps draft protected', async () => {
    const routed = renderController('new', '/monitors/new?app=website');
    await ready(routed);
    act(() => routed.current().actions.updateMonitor({ name: 'Synthetic saved' }));
    act(() => routed.current().actions.updateParam('host', 'save.example.test'));
    api.saveMonitor.mockRejectedValueOnce(new Error('Synthetic unavailable'));
    await act(() => routed.current().actions.save());
    await act(() => routed.router.navigate(-1));
    expect(confirmations.entries.length).toBeGreaterThan(0);
    act(() => latest().onCancel());
    const count = confirmations.entries.length;
    await act(() => routed.current().actions.save());
    await waitFor(() => expect(routed.router.state.location.pathname).toBe('/monitors'));
    expect(confirmations.entries).toHaveLength(count);
    expect(api.saveMonitor).toHaveBeenCalledTimes(2);
    expect(api.detectMonitor).not.toHaveBeenCalled();
  });
});
function latest() {
  const entry = confirmations.entries.at(-1);
  if (!entry) throw new Error('Expected unsaved confirmation');
  return entry;
}
async function ready(routed: ReturnType<typeof renderController>) {
  await waitFor(() => expect(routed.current().state.evidence.kind).toBe('ready'));
}
function renderController(mode: 'new' | 'edit', entry: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  let controller: ReturnType<typeof useMonitorEditorController> | undefined;
  function Probe() {
    controller = useMonitorEditorController(mode);
    return null;
  }
  const router = createMemoryRouter(
    [
      {
        path: '/monitors/new',
        element: (
          <QueryClientProvider client={client}>
            <Probe />
          </QueryClientProvider>
        )
      },
      {
        path: '/monitors/:monitorId/edit',
        element: (
          <QueryClientProvider client={client}>
            <Probe />
          </QueryClientProvider>
        )
      },
      { path: '/monitors', element: null },
      { path: '/after', element: null }
    ],
    { initialEntries: ['/monitors', entry, '/after'], initialIndex: 1 }
  );
  render(<RouterProvider router={router} />);
  return {
    client,
    router,
    current: () => {
      if (!controller) throw new Error('controller not mounted');
      return controller;
    }
  };
}
