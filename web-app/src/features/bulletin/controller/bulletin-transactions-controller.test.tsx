/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { bulletinQueryKeys } from './bulletin-query-keys';
import { useBulletinEditorController, useBulletinOperationGate } from './bulletin-editor-controller';
import { useBulletinTransactions } from './bulletin-transactions-controller';
import type { BulletinDraft } from '../model/bulletin-model';

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
  ...(await importOriginal<typeof import('@tanstack/react-query')>()),
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries })
}));

vi.mock('../api/bulletin-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/bulletin-api')>()),
  createBulletinAndRead: mocks.createBulletinAndRead,
  deleteBulletinAndConfirm: mocks.deleteBulletinAndConfirm,
  updateBulletinAndRead: mocks.updateBulletinAndRead
}));

vi.mock('./bulletin-metrics-controller', async importOriginal => ({
  ...(await importOriginal<typeof import('./bulletin-metrics-controller')>()),
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

    expect(mocks.createBulletinAndRead).toHaveBeenCalledWith(context.initialDraft);
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

  it('retires a confirmed save even when the list projection refresh fails', async () => {
    const context = createContext();
    context.refresh.mockResolvedValue(false);
    mocks.createBulletinAndRead.mockResolvedValue(bulletin(7, 'Operations'));
    const hook = renderHook(() => useBulletinTransactions(context.value));

    await act(async () => {
      await expect(hook.result.current.save()).resolves.toBe(true);
      await expect(hook.result.current.save()).resolves.toBe(false);
    });

    expect(context.setSelectedId).toHaveBeenCalledWith(7);
    expect(context.setDraft).toHaveBeenCalledWith(null);
    expect(mocks.createBulletinAndRead).toHaveBeenCalledTimes(1);
    expect(mocks.refreshMetrics).toHaveBeenCalledWith(expect.anything(), 7);
    expect(mocks.notification).toHaveBeenCalledWith({ message: 'bulletin.saveSuccess', type: 'success' });
    expect(mocks.notification).not.toHaveBeenCalledWith({ message: 'bulletin.save.error', type: 'error' });
  });

  it('admits only one same-tick save command', async () => {
    const context = createContext();
    const pending = deferred<ReturnType<typeof bulletin>>();
    context.refresh.mockResolvedValue(true);
    mocks.createBulletinAndRead.mockReturnValue(pending.promise);
    const hook = renderHook(() => useBulletinTransactions(context.value));

    let first!: Promise<boolean>;
    act(() => {
      first = hook.result.current.save();
      void hook.result.current.save();
      void hook.result.current.remove(bulletin(8, 'Other'));
    });

    expect(mocks.createBulletinAndRead).toHaveBeenCalledTimes(1);
    expect(mocks.deleteBulletinAndConfirm).not.toHaveBeenCalled();
    act(() => pending.resolve(bulletin(7, 'Operations')));
    await act(async () => first);
  });

  it.each(['monitorSelection', 'fieldSelection'] as const)(
    'rejects a save while %s has not converged to the authoritative dependencies',
    async selection => {
      const context = createContext();
      context.value.dependencies = { ...context.value.dependencies, [selection]: 'stale' };
      const hook = renderHook(() => useBulletinTransactions(context.value));

      await act(async () => {
        await expect(hook.result.current.save()).resolves.toBe(false);
      });

      expect(mocks.createBulletinAndRead).not.toHaveBeenCalled();
      expect(mocks.notification).toHaveBeenCalledWith({ message: 'bulletin.validation', type: 'error' });
    }
  );

  it('keeps a confirmed save successful when the post-write metrics refresh fails', async () => {
    const context = createContext();
    context.refresh.mockResolvedValue(true);
    mocks.createBulletinAndRead.mockResolvedValue(bulletin(7, 'Operations'));
    mocks.refreshMetrics.mockRejectedValue(new Error('metrics unavailable'));
    const hook = renderHook(() => useBulletinTransactions(context.value));

    await act(async () => {
      await expect(hook.result.current.save()).resolves.toBe(true);
      await expect(hook.result.current.save()).resolves.toBe(false);
    });

    expect(context.setDraft).toHaveBeenCalledWith(null);
    expect(mocks.createBulletinAndRead).toHaveBeenCalledTimes(1);
    expect(mocks.notification).toHaveBeenCalledWith({ message: 'bulletin.saveSuccess', type: 'success' });
    expect(mocks.notification).not.toHaveBeenCalledWith({ message: 'bulletin.save.error', type: 'error' });
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

  it('retires a confirmed delete even when the list projection refresh fails', async () => {
    const context = createContext({ selectedId: 7 });
    context.refresh.mockResolvedValue(false);
    mocks.deleteBulletinAndConfirm.mockResolvedValue(undefined);
    const hook = renderHook(() => useBulletinTransactions(context.value));
    const record = bulletin(7, 'Operations');

    await act(async () => {
      await expect(hook.result.current.remove(record)).resolves.toBe(true);
      await expect(hook.result.current.remove(record)).resolves.toBe(false);
    });

    expect(mocks.deleteBulletinAndConfirm).toHaveBeenCalledTimes(1);
    expect(context.setSelectedId).toHaveBeenCalledWith(null);
    expect(mocks.notification).toHaveBeenCalledWith({ message: 'bulletin.deleteSuccess', type: 'success' });
    expect(mocks.notification).not.toHaveBeenCalledWith({ message: 'bulletin.deleteError.error', type: 'error' });
  });

  it('does not publish or notify after a pending save loses ownership on unmount', async () => {
    const pending = deferred<ReturnType<typeof bulletin>>();
    const setSelectedId = vi.fn();
    mocks.createBulletinAndRead.mockReturnValue(pending.promise);
    const hook = renderHook(() => {
      const gate = useBulletinOperationGate();
      const editor = useBulletinEditorController(gate, vi.fn());
      const transactions = useBulletinTransactions({
        ...createContext().value,
        editor,
        gate,
        setSelectedId
      });
      return { editor, transactions };
    });

    act(() => hook.result.current.editor.controls.setDraft(createContext().initialDraft));
    let saving!: Promise<boolean>;
    act(() => {
      saving = hook.result.current.transactions.save();
    });
    hook.unmount();
    act(() => pending.resolve(bulletin(7, 'Operations')));
    await expect(saving).resolves.toBe(false);

    expect(setSelectedId).not.toHaveBeenCalled();
    expect(mocks.notification).not.toHaveBeenCalled();
    expect(mocks.invalidateQueries).not.toHaveBeenCalled();
  });
});

function createContext(options: { selectedId?: number } = {}) {
  const refresh = vi.fn();
  const initialDraft: BulletinDraft = {
    name: 'Operations',
    app: 'website',
    monitorIds: [1],
    fields: { responseTime: ['duration'] }
  };
  let draft: typeof initialDraft | null = initialDraft;
  let owner: { command: 'saving' | 'deleting' } | undefined;
  const setDraft = vi.fn((next: typeof initialDraft | null) => {
    draft = next;
  });
  const setSelectedId = vi.fn();
  const value: Parameters<typeof useBulletinTransactions>[0] = {
    dependencies: {
      kind: 'ready',
      fieldSelection: 'valid',
      monitorSelection: 'valid',
      monitors: [{ id: 1, name: 'Gateway', app: 'website', labels: {} }],
      metrics: [{ name: 'responseTime', fields: ['duration'] }]
    },
    editor: {
      state: { draft: initialDraft },
      controls: { getDraft: () => draft, invalidateDetail: vi.fn(), setDraft },
      actions: { close: vi.fn(), create: vi.fn(), edit: vi.fn(), update: vi.fn() }
    },
    gate: {
      command: 'idle',
      begin: next => {
        if (owner) return undefined;
        owner = { command: next };
        return owner;
      },
      end: candidate => {
        if (owner === candidate) owner = undefined;
      },
      isCurrent: candidate => owner === candidate,
      isLocked: () => owner !== undefined
    },
    refresh,
    selectedId: options.selectedId ?? null,
    setSelectedId,
    t: key => key
  };
  return { initialDraft, refresh, setDraft, setSelectedId, value };
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

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => {
    resolve = done;
  });
  return { promise, resolve };
}
