/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiMessageError } from '@/core/http/api-message';

const api = vi.hoisted(() => ({
  loadMonitorMetricLayout: vi.fn(),
  resetMonitorMetricLayout: vi.fn(),
  saveMonitorMetricLayout: vi.fn()
}));
const notifications = vi.hoisted(() => ({
  error: vi.fn(),
  success: vi.fn(),
  warning: vi.fn()
}));

vi.mock('../api/monitor-metric-layout-api', () => api);
vi.mock('antd', () => ({ App: { useApp: () => ({ message: notifications }) } }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

import { useMonitorMetricLayoutController } from './use-monitor-metric-layout-controller';

describe('useMonitorMetricLayoutController', () => {
  beforeEach(() => vi.resetAllMocks());

  it('falls back to automatic geometry without blocking metric data when the read is unavailable', async () => {
    api.loadMonitorMetricLayout.mockRejectedValue(new ApiMessageError('redacted', { status: 503 }));
    const { result } = renderHook(() => useMonitorMetricLayoutController('mysql', ['basic', 'status']), {
      wrapper: wrapper()
    });

    await waitFor(() => expect(result.current.state.readState).toBe('unavailable'));
    expect(result.current.state.layout.items.map(item => item.group)).toEqual(['basic', 'status']);
    expect(result.current.state.editing).toBe(false);
  });

  it('cancels an unsaved draft without changing the visible layout', async () => {
    api.loadMonitorMetricLayout.mockResolvedValue(saved());
    const { result } = renderHook(() => useMonitorMetricLayoutController('mysql', ['basic', 'status']), {
      wrapper: wrapper()
    });
    await waitFor(() => expect(result.current.state.readState).toBe('ready'));

    act(() => result.current.actions.beginEdit());
    act(() =>
      result.current.actions.changeItems([
        { group: 'basic', x: 0, y: 0, w: 12, h: 16, collapsed: false, order: 0 },
        { group: 'status', x: 0, y: 16, w: 12, h: 10, collapsed: false, order: 1 }
      ])
    );
    act(() => result.current.actions.cancelEdit());

    expect(result.current.state.layout.items[0]).toMatchObject({ group: 'basic', w: 6, h: 10 });
  });

  it('saves with the loaded revision and exits edit mode only after confirmation', async () => {
    api.loadMonitorMetricLayout.mockResolvedValue(saved());
    api.saveMonitorMetricLayout.mockResolvedValue({ ...saved(), revision: 'layout-r2' });
    const { result } = renderHook(() => useMonitorMetricLayoutController('mysql', ['basic', 'status']), {
      wrapper: wrapper()
    });
    await waitFor(() => expect(result.current.state.readState).toBe('ready'));

    act(() => result.current.actions.beginEdit());
    await act(async () => result.current.actions.save());

    expect(api.saveMonitorMetricLayout).toHaveBeenCalledWith(
      'mysql',
      expect.objectContaining({ expectedRevision: 'layout-r1', schemaVersion: 1, mode: 'custom' })
    );
    await waitFor(() => expect(result.current.state.editing).toBe(false));
    expect(result.current.state.revision).toBe('layout-r2');
  });

  it('keeps the draft open and reloads canonical state after a cross-tab conflict', async () => {
    api.loadMonitorMetricLayout.mockResolvedValue(saved());
    api.saveMonitorMetricLayout.mockRejectedValue(new ApiMessageError('redacted', { status: 409 }));
    const { result } = renderHook(() => useMonitorMetricLayoutController('mysql', ['basic', 'status']), {
      wrapper: wrapper()
    });
    await waitFor(() => expect(result.current.state.readState).toBe('ready'));

    act(() => result.current.actions.beginEdit());
    await act(async () => result.current.actions.save());

    expect(result.current.state.editing).toBe(true);
    expect(notifications.warning).toHaveBeenCalledWith('monitorMetrics.layout.conflict');
    expect(api.loadMonitorMetricLayout).toHaveBeenCalledTimes(2);
  });
});

function saved() {
  return {
    application: 'mysql',
    revision: 'layout-r1',
    schemaVersion: 1 as const,
    mode: 'custom' as const,
    columns: 12 as const,
    items: [
      { group: 'basic', x: 0, y: 0, w: 6, h: 10, collapsed: false, order: 0 },
      { group: 'status', x: 6, y: 0, w: 6, h: 10, collapsed: false, order: 1 }
    ],
    historyDock: { collapsed: false, height: 12 }
  };
}

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}
