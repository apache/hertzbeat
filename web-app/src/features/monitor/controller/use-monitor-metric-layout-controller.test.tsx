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

  it('persists changed panel geometry and history dock through the confirmed readback', async () => {
    const changedItems = [
      { group: 'basic', x: 0, y: 0, w: 8, h: 14, collapsed: false, order: 0 },
      { group: 'status', x: 8, y: 0, w: 4, h: 12, collapsed: false, order: 1 }
    ];
    const savedReadback = {
      ...saved(),
      revision: 'layout-r2',
      items: changedItems,
      historyDock: { collapsed: false, height: 18 }
    };
    api.loadMonitorMetricLayout.mockResolvedValue(saved());
    api.saveMonitorMetricLayout.mockResolvedValue(savedReadback);
    const { result } = renderHook(() => useMonitorMetricLayoutController('mysql', ['basic', 'status']), {
      wrapper: wrapper()
    });
    await waitFor(() => expect(result.current.state.readState).toBe('ready'));

    act(() => result.current.actions.beginEdit());
    act(() => {
      result.current.actions.changeItems(changedItems);
      result.current.actions.changeHistoryDock({ collapsed: false, height: 18 });
    });
    await act(async () => result.current.actions.save());

    expect(api.saveMonitorMetricLayout).toHaveBeenCalledWith('mysql', {
      schemaVersion: 1,
      mode: 'custom',
      columns: 12,
      items: changedItems,
      historyDock: { collapsed: false, height: 18 },
      expectedRevision: 'layout-r1'
    });
    await waitFor(() => expect(result.current.state.editing).toBe(false));
    expect(result.current.state.layout.items).toEqual(changedItems);
    expect(result.current.state.layout.historyDock).toEqual({ collapsed: false, height: 18 });
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

  it('does not let an earlier application save clear a later application draft', async () => {
    const save = deferred<ReturnType<typeof saved>>();
    api.loadMonitorMetricLayout.mockImplementation((application: string) => Promise.resolve(saved(application)));
    api.saveMonitorMetricLayout.mockReturnValue(save.promise);
    const { result, rerender } = renderHook(
      ({ application }) => useMonitorMetricLayoutController(application, ['basic', 'status']),
      { initialProps: { application: 'mysql' }, wrapper: wrapper() }
    );
    await waitFor(() => expect(result.current.state.readState).toBe('ready'));

    act(() => result.current.actions.beginEdit());
    let pendingSave!: Promise<void>;
    act(() => {
      pendingSave = result.current.actions.save();
    });
    await waitFor(() => expect(result.current.state.saving).toBe(true));

    rerender({ application: 'redis' });
    await waitFor(() => expect(result.current.state.revision).toBe('layout-r1-redis'));
    act(() => result.current.actions.beginEdit());
    act(() =>
      result.current.actions.changeItems([
        { group: 'basic', x: 0, y: 0, w: 12, h: 16, collapsed: false, order: 0 },
        { group: 'status', x: 0, y: 16, w: 12, h: 10, collapsed: false, order: 1 }
      ])
    );

    save.resolve({ ...saved('mysql'), revision: 'layout-r2-mysql' });
    await act(async () => pendingSave);

    expect(result.current.state.editing).toBe(true);
    expect(result.current.state.layout.items[0]).toMatchObject({ group: 'basic', w: 12, h: 16 });
    expect(notifications.success).not.toHaveBeenCalled();
  });

  it('does not let an earlier save clear a new draft after an application ABA transition', async () => {
    const save = deferred<ReturnType<typeof saved>>();
    api.loadMonitorMetricLayout.mockImplementation((application: string) => Promise.resolve(saved(application)));
    api.saveMonitorMetricLayout.mockReturnValue(save.promise);
    const { result, rerender } = renderHook(
      ({ application }) => useMonitorMetricLayoutController(application, ['basic', 'status']),
      { initialProps: { application: 'mysql' }, wrapper: wrapper() }
    );
    await waitFor(() => expect(result.current.state.readState).toBe('ready'));

    act(() => result.current.actions.beginEdit());
    let pendingSave!: Promise<void>;
    act(() => {
      pendingSave = result.current.actions.save();
    });
    rerender({ application: 'redis' });
    await waitFor(() => expect(result.current.state.revision).toBe('layout-r1-redis'));
    rerender({ application: 'mysql' });
    await waitFor(() => expect(result.current.state.revision).toBe('layout-r1'));
    act(() => result.current.actions.beginEdit());

    save.resolve({ ...saved('mysql'), revision: 'layout-r2-mysql' });
    await act(async () => pendingSave);

    expect(result.current.state.editing).toBe(true);
    expect(notifications.success).not.toHaveBeenCalled();
  });

  it('does not let an earlier application reset clear a later application draft', async () => {
    const reset = deferred<void>();
    api.loadMonitorMetricLayout.mockImplementation((application: string) => Promise.resolve(saved(application)));
    api.resetMonitorMetricLayout.mockReturnValue(reset.promise);
    const { result, rerender } = renderHook(
      ({ application }) => useMonitorMetricLayoutController(application, ['basic', 'status']),
      { initialProps: { application: 'mysql' }, wrapper: wrapper() }
    );
    await waitFor(() => expect(result.current.state.readState).toBe('ready'));

    let pendingReset!: Promise<void>;
    act(() => {
      pendingReset = result.current.actions.reset();
    });
    await waitFor(() => expect(result.current.state.saving).toBe(true));
    rerender({ application: 'redis' });
    await waitFor(() => expect(result.current.state.revision).toBe('layout-r1-redis'));
    act(() => result.current.actions.beginEdit());
    act(() =>
      result.current.actions.changeItems([
        { group: 'basic', x: 0, y: 0, w: 12, h: 16, collapsed: false, order: 0 },
        { group: 'status', x: 0, y: 16, w: 12, h: 10, collapsed: false, order: 1 }
      ])
    );

    reset.resolve(undefined);
    await act(async () => pendingReset);

    expect(result.current.state.editing).toBe(true);
    expect(result.current.state.layout.items[0]).toMatchObject({ group: 'basic', w: 12, h: 16 });
    expect(notifications.success).not.toHaveBeenCalled();
  });
});

function saved(application = 'mysql') {
  return {
    application,
    revision: application === 'mysql' ? 'layout-r1' : `layout-r1-${application}`,
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

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(value => {
    resolve = value;
  });
  return { promise, resolve };
}

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}
