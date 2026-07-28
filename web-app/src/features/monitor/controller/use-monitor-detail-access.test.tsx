/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  deleteMonitorGrafanaDashboard: vi.fn(),
  loadMonitorDetail: vi.fn()
}));
const capability = vi.hoisted(() => ({ useMonitorCapabilities: vi.fn() }));
vi.mock('../api/monitor-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/monitor-api')>()),
  ...api
}));
vi.mock('./use-monitor-capabilities', () => capability);

import { useMonitorDetailController } from './use-monitor-detail-controller';

const detail = {
  monitor: { id: 7, name: 'checkout', app: 'website', instance: 'prod', status: 1 },
  params: [],
  collector: null,
  grafanaDashboard: null,
  metrics: []
};

describe('useMonitorDetailController action access', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.loadMonitorDetail.mockResolvedValue(detail);
    api.deleteMonitorGrafanaDashboard.mockResolvedValue(undefined);
  });
  afterEach(cleanup);

  it('keeps guest detail readable while direct edit and Grafana delete calls fail closed', async () => {
    capability.useMonitorCapabilities.mockReturnValue({ canWrite: false, canDeleteGrafanaDashboard: false });
    const view = renderController();
    await waitFor(() => expect(view.result.current.controller.state.detail.kind).toBe('ready'));

    act(() => view.result.current.controller.actions.edit());
    await act(() => view.result.current.controller.actions.deleteGrafanaDashboard());

    expect(view.result.current.location).toBe('/monitors/7');
    expect(api.loadMonitorDetail).toHaveBeenCalledOnce();
    expect(api.deleteMonitorGrafanaDashboard).not.toHaveBeenCalled();
    expect(view.result.current.controller.state).toMatchObject({
      canEdit: false,
      canDeleteGrafanaDashboard: false
    });
  });

  it('admits user edit but keeps direct Grafana delete calls closed', async () => {
    capability.useMonitorCapabilities.mockReturnValue({ canWrite: true, canDeleteGrafanaDashboard: false });
    const view = renderController();
    await waitFor(() => expect(view.result.current.controller.state.detail.kind).toBe('ready'));

    act(() => view.result.current.controller.actions.edit());
    await act(() => view.result.current.controller.actions.deleteGrafanaDashboard());

    expect(view.result.current.location).toBe('/monitors/7/edit?returnTo=%2Fmonitors');
    expect(api.loadMonitorDetail).toHaveBeenCalledOnce();
    expect(api.deleteMonitorGrafanaDashboard).not.toHaveBeenCalled();
    expect(view.result.current.controller.state).toMatchObject({
      canEdit: true,
      canDeleteGrafanaDashboard: false
    });
  });

  it('fails a retained Grafana delete callback closed after the role loses permission', async () => {
    capability.useMonitorCapabilities.mockReturnValue({ canWrite: true, canDeleteGrafanaDashboard: true });
    const view = renderController();
    await waitFor(() => expect(view.result.current.controller.state.detail.kind).toBe('ready'));
    const retainedDelete = view.result.current.controller.actions.deleteGrafanaDashboard;

    capability.useMonitorCapabilities.mockReturnValue({ canWrite: true, canDeleteGrafanaDashboard: false });
    view.rerender();
    await act(() => retainedDelete());

    expect(api.deleteMonitorGrafanaDashboard).not.toHaveBeenCalled();
    expect(view.result.current.controller.state).toMatchObject({
      canDeleteGrafanaDashboard: false,
      grafanaDeleting: false,
      grafanaDeleteError: false
    });
  });
});

function renderController() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderHook(
    () => {
      const controller = useMonitorDetailController();
      const location = useLocation();
      return { controller, location: `${location.pathname}${location.search}` };
    },
    {
      wrapper: ({ children }: PropsWithChildren) => (
        <QueryClientProvider client={client}>
          <MemoryRouter initialEntries={['/monitors/7']}>
            <Routes>
              <Route path="/monitors/:monitorId/*" element={children} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      )
    }
  );
}
