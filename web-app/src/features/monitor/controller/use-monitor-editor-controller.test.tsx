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
import { MonitorContractError } from '../model/monitor-contract';

const api = vi.hoisted(() => ({
  detectMonitor: vi.fn(),
  loadMonitorApps: vi.fn(),
  loadMonitorCollectors: vi.fn(),
  loadMonitorDetail: vi.fn(),
  loadMonitorParamDefines: vi.fn(),
  loadNewMonitorEvidence: vi.fn(),
  saveMonitor: vi.fn()
}));
const notify = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn(), warning: vi.fn() }));
vi.mock('../api/monitor-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/monitor-api')>()),
  ...api
}));
vi.mock('antd', async importOriginal => ({
  ...(await importOriginal<typeof import('antd')>()),
  App: { useApp: () => ({ message: notify }) }
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

import { useMonitorEditorController } from './use-monitor-editor-controller';
import { monitorQueryKeys } from './monitor-query-keys';

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
      Promise.resolve({ ...detail, monitor: { ...detail.monitor, id: 8, jobId: 10 } })
    );
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

  it('freezes the draft and source controls while a command owns the payload snapshot', async () => {
    const pending = deferred<void>();
    api.detectMonitor.mockReturnValue(pending.promise);
    const routed = renderController('new', '/monitors/new?app=website&scrape=static');
    await waitFor(() => expect(routed.current().state.draft).toBeDefined());
    act(() => routed.current().actions.updateMonitor({ name: 'home' }));
    act(() => {
      const actions = routed.current().actions;
      void actions.detect();
      actions.updateMonitor({ name: 'changed-after-detect' });
      actions.changeSource({ scrape: 'http_sd' });
    });

    await waitFor(() => expect(routed.current().state.command).toBe('detecting'));
    expect(routed.current().state.draft?.monitor.name).toBe('home');
    expect(routed.router.state.location.search).toBe('?app=website&scrape=static');
    pending.resolve();
    await waitFor(() => expect(routed.current().state.command).toBe('idle'));
  });

  it('allows cancel to abort a pending save and leave without late completion effects', async () => {
    const pending = deferred<void>();
    api.saveMonitor.mockReturnValue(pending.promise);
    const routed = renderController('new', '/monitors/new?app=website&returnTo=%2Fmonitors');
    const invalidate = vi.spyOn(routed.client, 'invalidateQueries');
    await waitFor(() => expect(routed.current().state.draft).toBeDefined());
    act(() => routed.current().actions.updateMonitor({ name: 'home' }));
    let save!: Promise<void>;
    act(() => {
      save = routed.current().actions.save();
    });
    await waitFor(() => expect(api.saveMonitor).toHaveBeenCalledTimes(1));
    const signal = api.saveMonitor.mock.calls[0]?.[2] as AbortSignal;

    act(() => routed.current().actions.cancel());

    expect(signal.aborted).toBe(true);
    expect(routed.router.state.location.pathname).toBe('/monitors');
    pending.resolve();
    await expect(save).resolves.toBeUndefined();
    expect(api.loadNewMonitorEvidence).not.toHaveBeenCalled();
    expect(invalidate).toHaveBeenCalledWith({ queryKey: monitorQueryKeys.lists(), refetchType: 'none' });
    expect(notify.success).not.toHaveBeenCalled();
    expect(notify.error).not.toHaveBeenCalled();
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
    await waitFor(() => expect(api.loadMonitorParamDefines).toHaveBeenCalledWith('http_sd', expect.any(AbortSignal)));

    await act(async () => routed.router.navigate('/monitors/new?app=website&scrape=dns_sd'));
    dnsDefines.resolve([{ ...headersDefine, app: 'dns_sd', field: 'dnsServer' }]);
    await waitFor(() => expect(routed.current().state.draft?.params[0]?.field).toBe('dnsServer'));

    httpDefines.resolve([{ ...headersDefine, app: 'http_sd', field: 'url' }]);
    await act(async () => Promise.resolve());
    expect(routed.current().state.sourceKey).toContain('dns_sd');
    expect(routed.current().state.draft?.params.map(param => param.field)).toEqual(['dnsServer']);
  });

  it('retries only the active failed source and classifies it independently', async () => {
    api.loadMonitorApps
      .mockRejectedValueOnce(new ApiMessageError('offline', { status: 503 }))
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

  it('keeps a hide=true application as a valid creation source', async () => {
    api.loadMonitorApps.mockResolvedValue([{ category: 'database', value: 'mysql', label: 'MySQL', hide: true }]);
    const routed = renderController('new', '/monitors/new?app=mysql');

    await waitFor(() => expect(routed.current().state.draft?.monitor.app).toBe('mysql'));
    expect(routed.router.state.location.search).toBe('?app=mysql');
    expect(api.loadMonitorParamDefines).toHaveBeenCalledWith('mysql', expect.any(AbortSignal));
  });

  it('keeps the application chooser ready when scrape is present without an application', async () => {
    const routed = renderController('new', '/monitors/new?scrape=http_sd');

    await waitFor(() => expect(routed.current().state.evidence.kind).toBe('ready'));
    expect(routed.current().state.draft).toBeUndefined();
    expect(api.loadMonitorParamDefines).not.toHaveBeenCalled();
  });

  it('rejects direct edit scrape drift but transitions an explicit in-page change', async () => {
    api.loadMonitorParamDefines.mockImplementation((app: string) =>
      Promise.resolve(
        app === 'http_sd'
          ? [
              {
                id: null,
                app,
                field: 'url',
                name: { 'en-US': 'URL' },
                type: 'text',
                required: true,
                defaultValue: null,
                placeholder: null,
                range: null,
                limit: null,
                options: null,
                keyAlias: null,
                valueAlias: null,
                depend: null,
                hide: false
              }
            ]
          : []
      )
    );
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
    const portDefine = { ...headersDefine, field: 'port', type: 'number', name: { 'en-US': 'Port' } };
    const exactDetail = {
      ...detail,
      monitor: { ...detail.monitor, instance: '127.0.0.1:4210', labels: {}, annotations: {} },
      params: [
        { id: 4, monitorId: 7, field: 'host', type: 1, paramValue: '127.0.0.1' },
        { id: 5, monitorId: 7, field: 'port', type: 0, paramValue: '4210' }
      ]
    };
    api.loadMonitorParamDefines.mockResolvedValue([hostDefine, portDefine]);
    api.loadMonitorDetail.mockResolvedValue(exactDetail);
    const routed = renderController('edit', '/monitors/7/edit?returnTo=%2Fmonitors%3Fapp%3Dwebsite');
    await waitFor(() => expect(routed.current().state.draft?.monitor.id).toBe(7));
    await act(async () => routed.current().actions.save());
    expect(api.saveMonitor).toHaveBeenCalledWith(
      'edit',
      expect.objectContaining({ monitor: expect.objectContaining({ instance: '127.0.0.1' }) }),
      expect.any(AbortSignal)
    );
    expect(api.loadMonitorDetail).toHaveBeenLastCalledWith(7, expect.any(AbortSignal));
    expect(routed.client.getQueryData(monitorQueryKeys.detail(7))).toEqual(exactDetail);
    expect(routed.router.state.location.pathname).toBe('/monitors');
    expect(notify.success).toHaveBeenCalledWith('monitor.editor.saveSuccess');
  });

  it('reports a committed new monitor honestly when verification is unavailable', async () => {
    api.loadNewMonitorEvidence.mockRejectedValue(new ApiMessageError('offline', { status: 503 }));
    const routed = renderController('new', '/monitors/new?app=website');
    await waitFor(() => expect(routed.current().state.draft).toBeDefined());
    act(() => routed.current().actions.updateMonitor({ name: 'home' }));

    await act(async () => routed.current().actions.save());

    expect(api.saveMonitor).toHaveBeenCalledTimes(1);
    expect(notify.success).toHaveBeenCalledWith('monitor.editor.saveSuccess');
    expect(notify.warning).toHaveBeenCalledWith('common.unavailable');
    expect(notify.error).not.toHaveBeenCalledWith('monitor.editor.saveFailed');
    expect(routed.router.state.location.pathname).toBe('/monitors');
  });

  it('marks the edited detail stale as soon as the write is acknowledged', async () => {
    api.loadMonitorDetail
      .mockResolvedValueOnce(detail)
      .mockRejectedValueOnce(new ApiMessageError('offline', { status: 503 }));
    const routed = renderController('edit', '/monitors/7/edit?returnTo=%2Fmonitors');
    const invalidate = vi.spyOn(routed.client, 'invalidateQueries');
    await waitFor(() => expect(routed.current().state.draft?.monitor.id).toBe(7));

    await act(async () => routed.current().actions.save());

    expect(invalidate).toHaveBeenCalledWith({
      queryKey: monitorQueryKeys.detail(7),
      exact: true,
      refetchType: 'none'
    });
    expect(notify.warning).toHaveBeenCalledWith('common.unavailable');
  });

  it('classifies an unsafe canonical parameter definition as non-retryable', async () => {
    api.loadMonitorParamDefines.mockResolvedValue([{ ...headersDefine, type: 'unsupported' }]);
    const routed = renderController('new', '/monitors/new?app=website');

    await waitFor(() => expect(routed.current().state.evidence.kind).toBe('invalid'));
    expect(routed.current().state.draft).toBeUndefined();
  });

  it('distinguishes committed non-convergence from a rejected save', async () => {
    api.loadNewMonitorEvidence.mockResolvedValue({
      ...detail,
      monitor: { ...detail.monitor, id: 8, jobId: 10, name: 'different' }
    });
    const routed = renderController('new', '/monitors/new?app=website');
    await waitFor(() => expect(routed.current().state.draft).toBeDefined());
    act(() => routed.current().actions.updateMonitor({ name: 'home' }));

    await act(async () => routed.current().actions.save());

    expect(notify.success).toHaveBeenCalledWith('monitor.editor.saveSuccess');
    expect(notify.error).toHaveBeenCalledWith('common.routeError.description');
    expect(notify.error).not.toHaveBeenCalledWith('monitor.editor.saveFailed');
    expect(routed.router.state.location.pathname).toBe('/monitors');
  });

  it('reports save failure only when the write itself is rejected', async () => {
    api.saveMonitor.mockRejectedValue(new Error('write rejected'));
    const routed = renderController('new', '/monitors/new?app=website');
    const invalidate = vi.spyOn(routed.client, 'invalidateQueries');
    await waitFor(() => expect(routed.current().state.draft).toBeDefined());
    act(() => routed.current().actions.updateMonitor({ name: 'home' }));

    await act(async () => routed.current().actions.save());

    expect(api.loadNewMonitorEvidence).not.toHaveBeenCalled();
    expect(invalidate).not.toHaveBeenCalled();
    expect(notify.error).toHaveBeenCalledWith('monitor.editor.saveFailed');
    expect(notify.success).not.toHaveBeenCalledWith('monitor.editor.saveSuccess');
    expect(routed.router.state.location.pathname).toBe('/monitors/new');
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
      { path: '/monitors', element: null }
    ],
    { initialEntries: [entry] }
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

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => {
    resolve = done;
  });
  return { promise, resolve };
}
