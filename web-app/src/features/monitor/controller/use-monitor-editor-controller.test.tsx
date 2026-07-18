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
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiMessageError } from '@/core/http/api-message';
import { MonitorContractError } from '../api/monitor-api';

const api = vi.hoisted(() => ({
  detectMonitor: vi.fn(), loadMonitorApps: vi.fn(), loadMonitorCollectors: vi.fn(), loadMonitorDetail: vi.fn(),
  loadMonitorParamDefines: vi.fn(), loadNewMonitorEvidence: vi.fn(), saveMonitor: vi.fn()
}));
const notify = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn(), warning: vi.fn() }));
vi.mock('../api/monitor-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/monitor-api')>()), ...api
}));
vi.mock('antd', async importOriginal => ({
  ...(await importOriginal<typeof import('antd')>()), App: { useApp: () => ({ message: notify }) }
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

import { useMonitorEditorController } from './use-monitor-editor-controller';

const detail = {
  monitor: { id: 7, jobId: 9, app: 'website', name: 'home', instance: 'home', status: 0, type: 0,
    intervals: 60, scheduleType: 'interval', cronExpression: null, scrape: 'static', labels: null,
    annotations: null, description: null },
  collector: null, params: [], grafanaDashboard: null, metrics: []
};

const headersDefine = {
  id: null, app: 'website', field: 'headers', name: { 'en-US': 'Headers' }, type: 'key-value', required: false,
  defaultValue: null, placeholder: null, range: null, limit: null, options: null, keyAlias: null,
  valueAlias: null, depend: null, hide: false
};

describe('useMonitorEditorController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.loadMonitorApps.mockResolvedValue([{ value: 'website', label: 'Website' }]);
    api.loadMonitorCollectors.mockResolvedValue([{ name: 'collector-a', online: true }]);
    api.loadMonitorDetail.mockResolvedValue(detail);
    api.loadMonitorParamDefines.mockResolvedValue([]);
    api.detectMonitor.mockResolvedValue(undefined);
    api.saveMonitor.mockResolvedValue(undefined);
    api.loadNewMonitorEvidence.mockImplementation(() =>
      Promise.resolve({ ...detail, monitor: { ...detail.monitor, id: 8, jobId: 10 } }));
  });
  afterEach(cleanup);

  it.each(['bad', '0', '9007199254740992'])('rejects invalid edit id %s without a detail request', async id => {
    const routed = renderController('edit', `/monitors/${id}/edit`);
    await waitFor(() => expect(routed.current().state.evidence.kind).toBe('missing'));
    expect(api.loadMonitorDetail).not.toHaveBeenCalled();
    expect(api.loadMonitorApps).not.toHaveBeenCalled();
    expect(api.loadMonitorCollectors).not.toHaveBeenCalled();
    expect(api.loadMonitorParamDefines).not.toHaveBeenCalled();
  });

  it('forwards query AbortSignals and creates a draft from URL application state', async () => {
    const routed = renderController('new', '/monitors/new?app=website&scrape=static');
    await waitFor(() => expect(routed.current().state.draft?.monitor.app).toBe('website'));
    expect(api.loadMonitorApps).toHaveBeenCalledWith(expect.any(AbortSignal));
    expect(api.loadMonitorCollectors).toHaveBeenCalledWith(expect.any(AbortSignal));
    expect(api.loadMonitorParamDefines).toHaveBeenCalledWith('website', expect.any(AbortSignal));
  });

  it('locks detect and save commands, aborting without notifying when the source changes', async () => {
    const pending = deferred<void>();
    api.detectMonitor.mockReturnValue(pending.promise);
    const routed = renderController('new', '/monitors/new?app=website');
    await waitFor(() => expect(routed.current().state.draft).toBeDefined());
    act(() => routed.current().actions.updateMonitor({ name: 'home' }));
    let first!: Promise<void>;
    act(() => {
      first = routed.current().actions.detect();
      void routed.current().actions.detect();
      void routed.current().actions.save();
    });
    expect(api.detectMonitor).toHaveBeenCalledTimes(1);
    expect(api.saveMonitor).not.toHaveBeenCalled();
    expect(routed.current().state.command).toBe('detecting');
    const signal = api.detectMonitor.mock.calls[0]?.[1] as AbortSignal;
    expect(signal.aborted).toBe(false);
    await act(async () => routed.router.navigate('/monitors/new?app=website&scrape=http_sd'));
    expect(signal.aborted).toBe(true);
    pending.resolve();
    await act(async () => first);
    expect(notify.success).not.toHaveBeenCalled();
  });

  it('keeps the active source when an older define request resolves last', async () => {
    const httpDefines = deferred<unknown[]>();
    const dnsDefines = deferred<unknown[]>();
    api.loadMonitorParamDefines.mockImplementation((source: string) => {
      if (source === 'http_sd') return httpDefines.promise;
      if (source === 'dns_sd') return dnsDefines.promise;
      return Promise.resolve([]);
    });
    const routed = renderController('new', '/monitors/new?app=website&scrape=http_sd');
    await waitFor(() => expect(api.loadMonitorParamDefines).toHaveBeenCalledWith(
      'http_sd', expect.any(AbortSignal)
    ));

    await act(async () => routed.router.navigate('/monitors/new?app=website&scrape=dns_sd'));
    dnsDefines.resolve([{ ...headersDefine, app: 'dns_sd', field: 'dnsServer' }]);
    await waitFor(() => expect(routed.current().state.draft?.params[0]?.field).toBe('dnsServer'));

    httpDefines.resolve([{ ...headersDefine, app: 'http_sd', field: 'url' }]);
    await act(async () => Promise.resolve());
    expect(routed.current().state.sourceKey).toContain('dns_sd');
    expect(routed.current().state.draft?.params.map(param => param.field)).toEqual(['dnsServer']);
  });

  it('retries only the active failed source and classifies it independently', async () => {
    api.loadMonitorApps.mockRejectedValueOnce(new ApiMessageError('offline', { status: 503 }))
      .mockResolvedValueOnce([{ value: 'website', label: 'Website' }]);
    const routed = renderController('new', '/monitors/new?app=website');
    await waitFor(() => expect(routed.current().state.evidence.kind).toBe('unavailable'));
    await act(async () => routed.current().actions.retry());
    await waitFor(() => expect(routed.current().state.draft).toBeDefined());
    expect(api.loadMonitorApps).toHaveBeenCalledTimes(2);
    expect(api.loadMonitorCollectors).toHaveBeenCalledTimes(1);

    cleanup();
    api.loadMonitorApps.mockRejectedValue(new MonitorContractError('bad apps'));
    const contract = renderController('new', '/monitors/new?app=website');
    await waitFor(() => expect(contract.current().state.evidence.kind).toBe('error'));
  });

  it('canonicalizes invalid URL values without choosing an application for the user', async () => {
    const routed = renderController('new', '/monitors/new?app=unknown&scrape=wrong&returnTo=%2Fmonitors');
    await waitFor(() => expect(routed.router.state.location.search).toBe('?scrape=static&returnTo=%2Fmonitors'));
    expect(routed.current().state.draft).toBeUndefined();
  });

  it('rejects direct edit scrape drift but transitions an explicit in-page change', async () => {
    api.loadMonitorParamDefines.mockImplementation((app: string) => Promise.resolve(app === 'http_sd'
      ? [{ id: null, app, field: 'url', name: { 'en-US': 'URL' }, type: 'text', required: true,
        defaultValue: null, placeholder: null, range: null, limit: null, options: null, keyAlias: null,
        valueAlias: null, depend: null, hide: false }]
      : []));
    const direct = renderController('edit', '/monitors/7/edit?scrape=http_sd');
    await waitFor(() => expect(direct.router.state.location.search).toBe('?scrape=static'));
    cleanup();

    const explicit = renderController('edit', '/monitors/7/edit');
    await waitFor(() => expect(explicit.current().state.draft).toBeDefined());
    act(() => explicit.current().actions.changeSource({ scrape: 'http_sd' }));
    await waitFor(() => expect(explicit.current().state.draft?.monitor.scrape).toBe('http_sd'));
    expect(explicit.current().state.sourceKey).toContain('http_sd');
  });

  it('requires exact-id reread convergence before edit navigation', async () => {
    const hostDefine = { ...headersDefine, field: 'host', type: 'host', name: { 'en-US': 'Host' } };
    const exactDetail = { ...detail, monitor: { ...detail.monitor, instance: 'example.com', labels: {}, annotations: {} },
      params: [{ id: 4, monitorId: 7, field: 'host', type: 1, paramValue: 'example.com' }] };
    api.loadMonitorParamDefines.mockResolvedValue([hostDefine]);
    api.loadMonitorDetail.mockResolvedValue(exactDetail);
    const routed = renderController('edit', '/monitors/7/edit?returnTo=%2Fmonitors%3Fapp%3Dwebsite');
    await waitFor(() => expect(routed.current().state.draft?.monitor.id).toBe(7));
    await act(async () => routed.current().actions.save());
    expect(api.saveMonitor).toHaveBeenCalledWith('edit', expect.anything(), expect.any(AbortSignal));
    expect(api.loadMonitorDetail).toHaveBeenLastCalledWith(7, expect.any(AbortSignal));
    expect(routed.router.state.location.pathname).toBe('/monitors');
    expect(notify.success).toHaveBeenCalledWith('monitor.editor.saveSuccess');
  });

  it('blocks save while a structured row reports invalid state', async () => {
    api.loadMonitorParamDefines.mockResolvedValue([headersDefine]);
    const routed = renderController('new', '/monitors/new?app=website');
    await waitFor(() => expect(routed.current().state.draft).toBeDefined());
    act(() => {
      routed.current().actions.updateMonitor({ name: 'home' });
      routed.current().actions.setParamValid('headers', false);
    });
    await act(async () => routed.current().actions.save());
    expect(api.saveMonitor).not.toHaveBeenCalled();
    expect(notify.warning).toHaveBeenCalledWith('monitor.editor.validation');
    expect(routed.current().state.validationIssues).toContain('param:headers');
    act(() => routed.current().actions.setParamValid('headers', true));
    expect(routed.current().state.validationIssues).not.toContain('param:headers');
  });

  it('exposes and clears name, interval, and cron validation issues', async () => {
    const routed = renderController('new', '/monitors/new?app=website');
    await waitFor(() => expect(routed.current().state.draft).toBeDefined());

    await act(async () => routed.current().actions.save());
    expect(routed.current().state.validationIssues).toContain('name');
    act(() => routed.current().actions.updateMonitor({ name: 'home', intervals: 1 }));
    expect(routed.current().state.validationIssues).not.toContain('name');
    expect(routed.current().state.validationIssues).toContain('intervals');
    act(() => routed.current().actions.updateMonitor({ intervals: 10, scheduleType: 'cron', cronExpression: '* * *' }));
    expect(routed.current().state.validationIssues).not.toContain('intervals');
    expect(routed.current().state.validationIssues).toContain('cronExpression');
    act(() => routed.current().actions.updateMonitor({ cronExpression: '0 * * * * *' }));
    expect(routed.current().state.validationIssues).toEqual([]);
  });

  it('preserves same-tick parameter values and validity in both update orders', async () => {
    api.loadMonitorParamDefines.mockResolvedValue([headersDefine]);
    const routed = renderController('new', '/monitors/new?app=website');
    await waitFor(() => expect(routed.current().state.draft?.params).toHaveLength(1));

    act(() => {
      routed.current().actions.setParamValid('headers', false);
      routed.current().actions.updateParam('headers', { authorization: 'first' });
    });
    expect(routed.current().state.draft?.params[0]?.paramValue).toEqual({ authorization: 'first' });
    expect(routed.current().state.draft?.invalidParamFields).toContain('headers');

    act(() => {
      routed.current().actions.updateParam('headers', { authorization: 'second' });
      routed.current().actions.setParamValid('headers', true);
    });
    expect(routed.current().state.draft?.params[0]?.paramValue).toEqual({ authorization: 'second' });
    expect(routed.current().state.draft?.invalidParamFields).not.toContain('headers');
  });
});

function renderController(mode: 'new' | 'edit', entry: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  let controller: ReturnType<typeof useMonitorEditorController> | undefined;
  function Probe() { controller = useMonitorEditorController(mode); return null; }
  const router = createMemoryRouter([
    { path: '/monitors/new', element: <QueryClientProvider client={client}><Probe /></QueryClientProvider> },
    { path: '/monitors/:monitorId/edit', element: <QueryClientProvider client={client}><Probe /></QueryClientProvider> },
    { path: '/monitors', element: null }
  ], { initialEntries: [entry] });
  render(<RouterProvider router={router} />);
  return { router, current: () => { if (!controller) throw new Error('controller not mounted'); return controller; } };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
