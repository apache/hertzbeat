/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { bulletinQueryKeys } from './bulletin-query-keys';
import { useBulletinTransactions } from './bulletin-transactions-controller';

const mocks = vi.hoisted(() => ({
  createBulletinAndRead: vi.fn(),
  deleteBulletinAndConfirm: vi.fn(),
  invalidateQueries: vi.fn(),
  notification: vi.fn(),
  refreshMetrics: vi.fn(),
  updateBulletinAndRead: vi.fn()
}));

vi.mock('@refinedev/core', () => ({
  useNotification: () => ({ open: mocks.notification })
}));

vi.mock('@tanstack/react-query', async importOriginal => ({
  ...await importOriginal<typeof import('@tanstack/react-query')>(),
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries })
}));

vi.mock('../api/bulletin-api', async importOriginal => ({
  ...await importOriginal<typeof import('../api/bulletin-api')>(),
  createBulletinAndRead: mocks.createBulletinAndRead,
  deleteBulletinAndConfirm: mocks.deleteBulletinAndConfirm,
  updateBulletinAndRead: mocks.updateBulletinAndRead
}));

vi.mock('./bulletin-metrics-controller', async importOriginal => ({
  ...await importOriginal<typeof import('./bulletin-metrics-controller')>(),
  refreshSavedBulletinMetrics: mocks.refreshMetrics
}));

describe('Bulletin transactions controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.invalidateQueries.mockResolvedValue(undefined);
    mocks.refreshMetrics.mockResolvedValue(undefined);
  });

  it('publishes save success only after the canonical record and list have converged', async () => {
    const context = createContext();
    const saved = bulletin(7, 'Operations');
    context.refresh.mockResolvedValue(true);
    mocks.createBulletinAndRead.mockResolvedValue(saved);
    const hook = renderHook(() => useBulletinTransactions(context.value));

    await act(async () => {
      await expect(hook.result.current.save()).resolves.toBe(true);
    });

    expect(mocks.createBulletinAndRead).toHaveBeenCalledWith(context.value.draft);
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: bulletinQueryKeys.lists() });
    expect(context.refresh).toHaveBeenCalledOnce();
    expect(context.setSelectedId).toHaveBeenCalledWith(saved.id);
    expect(mocks.refreshMetrics).toHaveBeenCalledWith(expect.anything(), saved.id);
    expect(context.setDraft).toHaveBeenCalledWith(null);
    expect(mocks.notification).toHaveBeenLastCalledWith({
      message: 'bulletin.saveSuccess',
      type: 'success'
    });
  });

  it('does not report save success when the authoritative list reread fails', async () => {
    const context = createContext();
    context.refresh.mockResolvedValue(false);
    mocks.createBulletinAndRead.mockResolvedValue(bulletin(7, 'Operations'));
    const hook = renderHook(() => useBulletinTransactions(context.value));

    await act(async () => {
      await expect(hook.result.current.save()).resolves.toBe(false);
    });

    expect(context.setSelectedId).not.toHaveBeenCalled();
    expect(context.setDraft).not.toHaveBeenCalledWith(null);
    expect(mocks.refreshMetrics).not.toHaveBeenCalled();
    expect(mocks.notification).toHaveBeenLastCalledWith({
      message: 'bulletin.save.error',
      type: 'error'
    });
  });

  it('clears a deleted selection and reports success only after list convergence', async () => {
    const context = createContext({ selectedId: 7 });
    context.refresh.mockResolvedValue(true);
    mocks.deleteBulletinAndConfirm.mockResolvedValue(undefined);
    const hook = renderHook(() => useBulletinTransactions(context.value));
    const record = bulletin(7, 'Operations');

    await act(async () => {
      await expect(hook.result.current.remove(record)).resolves.toBe(true);
    });

    expect(mocks.deleteBulletinAndConfirm).toHaveBeenCalledWith(record.id);
    expect(context.setSelectedId).toHaveBeenCalledWith(null);
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: bulletinQueryKeys.lists() });
    expect(context.refresh).toHaveBeenCalledOnce();
    expect(mocks.notification).toHaveBeenLastCalledWith({
      message: 'bulletin.deleteSuccess',
      type: 'success'
    });
  });
});

function createContext(options: { selectedId?: number } = {}) {
  const refresh = vi.fn();
  const setCommand = vi.fn();
  const setDraft = vi.fn();
  const setSelectedId = vi.fn();
  const value: Parameters<typeof useBulletinTransactions>[0] = {
    command: 'idle',
    dependencies: {
      kind: 'ready',
      apps: [{ value: 'website', label: 'Website', hide: false }],
      monitors: [{ id: 1, name: 'Gateway', app: 'website' }],
      metrics: [{ name: 'responseTime', fields: ['duration'] }]
    },
    draft: {
      name: 'Operations',
      app: 'website',
      monitorIds: [1],
      fields: { responseTime: ['duration'] }
    },
    refresh,
    selectedId: options.selectedId ?? null,
    setCommand,
    setDraft,
    setSelectedId,
    t: key => key
  };
  return { refresh, setCommand, setDraft, setSelectedId, value };
}

function bulletin(id: number, name: string) {
  return {
    id,
    name,
    app: 'website',
    monitorIds: [1],
    fields: { responseTime: ['duration'] },
    creator: null,
    modifier: null,
    gmtCreate: null,
    gmtUpdate: null
  };
}
