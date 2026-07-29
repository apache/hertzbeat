/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiMessageError } from '@/core/http/api-message';

import { normalizeBulletinApiFailure } from '../api/bulletin-api-failure';
import { BulletinRequestFailure } from '../model/bulletin-failure';
import {
  createBulletinOutcomeNotice,
  type BulletinOutcomeNotice,
  type BulletinRecovery
} from '../model/bulletin-operation-state';
import { bulletinQueryKeys } from './bulletin-query-keys';
import { useBulletinEditorController } from './bulletin-editor-controller';
import { useBulletinOperationGate } from './bulletin-operation-gate';
import { useBulletinTransactions } from './bulletin-transactions-controller';
import type { BulletinDraft } from '../model/bulletin-model';

const mocks = vi.hoisted(() => ({
  captureBulletinCreateBaseline: vi.fn(),
  createBulletin: vi.fn(),
  deleteBulletins: vi.fn(),
  invalidateQueries: vi.fn(),
  notification: vi.fn(),
  proveBulletinCreated: vi.fn(),
  proveBulletinsDeleted: vi.fn(),
  proveBulletinUpdated: vi.fn(),
  refreshMetrics: vi.fn(),
  updateBulletin: vi.fn()
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
  captureBulletinCreateBaseline: mocks.captureBulletinCreateBaseline,
  createBulletin: mocks.createBulletin,
  deleteBulletins: mocks.deleteBulletins,
  proveBulletinCreated: mocks.proveBulletinCreated,
  proveBulletinsDeleted: mocks.proveBulletinsDeleted,
  proveBulletinUpdated: mocks.proveBulletinUpdated,
  updateBulletin: mocks.updateBulletin
}));

vi.mock('./bulletin-metrics-controller', async importOriginal => ({
  ...(await importOriginal<typeof import('./bulletin-metrics-controller')>()),
  refreshSavedBulletinMetrics: mocks.refreshMetrics
}));

describe('Bulletin transactions controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.captureBulletinCreateBaseline.mockResolvedValue([]);
    mocks.createBulletin.mockResolvedValue(undefined);
    mocks.deleteBulletins.mockResolvedValue(undefined);
    mocks.invalidateQueries.mockResolvedValue(undefined);
    mocks.proveBulletinCreated.mockResolvedValue(bulletin(7, 'Operations'));
    mocks.proveBulletinsDeleted.mockResolvedValue(undefined);
    mocks.proveBulletinUpdated.mockResolvedValue(bulletin(7, 'Operations'));
    mocks.refreshMetrics.mockResolvedValue(undefined);
    mocks.updateBulletin.mockResolvedValue(undefined);
  });

  it('publishes save success only after the canonical record and list have converged', async () => {
    const context = createContext();
    const saved = bulletin(7, 'Operations');
    context.refresh.mockResolvedValue(true);
    mocks.proveBulletinCreated.mockResolvedValue(saved);
    const hook = renderHook(() => useBulletinTransactions(context.value));

    await act(async () => {
      await expect(hook.result.current.save()).resolves.toBe(true);
    });

    expect(mocks.captureBulletinCreateBaseline).toHaveBeenCalledWith(context.initialDraft.name);
    expect(mocks.createBulletin).toHaveBeenCalledWith(context.initialDraft);
    expect(mocks.proveBulletinCreated).toHaveBeenCalledWith(context.initialDraft, []);
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: bulletinQueryKeys.lists(),
      refetchType: 'none'
    });
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
    const hook = renderHook(() => useBulletinTransactions(context.value));

    await act(async () => {
      await expect(hook.result.current.save()).resolves.toBe(true);
      await expect(hook.result.current.save()).resolves.toBe(false);
    });

    expect(context.setSelectedId).toHaveBeenCalledWith(7);
    expect(context.setDraft).toHaveBeenCalledWith(null);
    expect(mocks.createBulletin).toHaveBeenCalledTimes(1);
    expect(mocks.refreshMetrics).toHaveBeenCalledWith(expect.anything(), 7);
    expect(mocks.notification).toHaveBeenCalledWith({ message: 'bulletin.saveSuccess', type: 'success' });
    expect(mocks.notification).not.toHaveBeenCalledWith({ message: 'bulletin.save.error', type: 'error' });
  });

  it('admits only one same-tick save command', async () => {
    const context = createContext();
    const pending = deferred<ReturnType<typeof bulletin>>();
    context.refresh.mockResolvedValue(true);
    mocks.proveBulletinCreated.mockReturnValue(pending.promise);
    const hook = renderHook(() => useBulletinTransactions(context.value));

    let first!: Promise<boolean>;
    act(() => {
      first = hook.result.current.save();
      void hook.result.current.save();
      void hook.result.current.remove(bulletin(8, 'Other'));
    });
    await act(async () => Promise.resolve());

    expect(mocks.createBulletin).toHaveBeenCalledTimes(1);
    expect(mocks.deleteBulletins).not.toHaveBeenCalled();
    act(() => pending.resolve(bulletin(7, 'Operations')));
    await act(async () => first);
  });

  it('rejects retained GUEST save/delete/batch commands before transport', async () => {
    const context = createContext();
    const hook = renderHook(() => useBulletinTransactions(context.value));
    const retained = { ...hook.result.current };
    context.canWriteRef.current = false;
    context.canDeleteRef.current = false;

    await act(async () => expect(retained.save()).resolves.toBe(false));
    await act(async () => expect(retained.remove(bulletin(7, 'Operations'))).resolves.toBe(false));
    await act(async () => expect(retained.removeMany([7, 8])).resolves.toBe(false));

    expect(mocks.captureBulletinCreateBaseline).not.toHaveBeenCalled();
    expect(mocks.createBulletin).not.toHaveBeenCalled();
    expect(mocks.deleteBulletins).not.toHaveBeenCalled();
  });

  it('allows retained USER save but rejects delete before transport', async () => {
    const context = createContext();
    context.refresh.mockResolvedValue(true);
    const hook = renderHook(() => useBulletinTransactions(context.value));
    const retained = { ...hook.result.current };
    context.canDeleteRef.current = false;

    await act(async () => expect(retained.save()).resolves.toBe(true));
    await act(async () => expect(retained.remove(bulletin(7, 'Operations'))).resolves.toBe(false));

    expect(mocks.createBulletin).toHaveBeenCalledOnce();
    expect(mocks.deleteBulletins).not.toHaveBeenCalled();
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

      expect(mocks.createBulletin).not.toHaveBeenCalled();
      expect(mocks.notification).toHaveBeenCalledWith({ message: 'bulletin.validation', type: 'error' });
    }
  );

  it('keeps a confirmed save successful when the post-write metrics refresh fails', async () => {
    const context = createContext();
    context.refresh.mockResolvedValue(true);
    mocks.refreshMetrics.mockRejectedValue(new Error('metrics unavailable'));
    const hook = renderHook(() => useBulletinTransactions(context.value));

    await act(async () => {
      await expect(hook.result.current.save()).resolves.toBe(true);
      await expect(hook.result.current.save()).resolves.toBe(false);
    });

    expect(context.setDraft).toHaveBeenCalledWith(null);
    expect(mocks.createBulletin).toHaveBeenCalledTimes(1);
    expect(mocks.notification).toHaveBeenCalledWith({ message: 'bulletin.saveSuccess', type: 'success' });
    expect(mocks.notification).not.toHaveBeenCalledWith({ message: 'bulletin.save.error', type: 'error' });
  });

  it('clears a deleted selection and reports success only after list convergence', async () => {
    const context = createContext({ selectedId: 7 });
    context.refresh.mockResolvedValue(true);
    const hook = renderHook(() => useBulletinTransactions(context.value));
    const record = bulletin(7, 'Operations');

    await act(async () => {
      await expect(hook.result.current.remove(record)).resolves.toBe(true);
    });

    expect(mocks.deleteBulletins).toHaveBeenCalledWith([record.id]);
    expect(mocks.proveBulletinsDeleted).toHaveBeenCalledWith([record.id]);
    expect(context.setSelectedId).toHaveBeenCalledWith(null);
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: bulletinQueryKeys.lists(),
      refetchType: 'none'
    });
    expect(context.refresh).toHaveBeenCalledOnce();
    expect(mocks.notification).toHaveBeenLastCalledWith({
      message: 'bulletin.deleteSuccess',
      type: 'success'
    });
  });

  it('deletes one canonical selected batch and clears a selected metrics owner in that batch', async () => {
    const context = createContext({ selectedId: 9 });
    context.refresh.mockResolvedValue(true);
    const hook = renderHook(() => useBulletinTransactions(context.value));

    await act(async () => {
      await expect(hook.result.current.removeMany([9, 7, 9])).resolves.toBe(true);
    });

    expect(mocks.deleteBulletins).toHaveBeenCalledWith([7, 9]);
    expect(mocks.proveBulletinsDeleted).toHaveBeenCalledWith([7, 9]);
    expect(context.setSelectedId).toHaveBeenCalledWith(null);
    expect(mocks.notification).toHaveBeenLastCalledWith({
      message: 'bulletin.deleteSelectedSuccess',
      type: 'success'
    });
  });

  it('retains batch delete proof and never repeats an ambiguous DELETE', async () => {
    const context = createContext({ selectedId: 9 });
    context.refresh.mockResolvedValue(true);
    mocks.deleteBulletins.mockRejectedValue(new BulletinRequestFailure('unavailable', 'uncertain'));
    mocks.proveBulletinsDeleted
      .mockRejectedValueOnce(new BulletinRequestFailure('unavailable', 'uncertain'))
      .mockResolvedValueOnce(undefined);
    const hook = renderHook(() => useBulletinTransactions(context.value));

    await act(async () => expect(hook.result.current.removeMany([9, 7])).resolves.toBe(false));
    expect(context.getRecovery()).toMatchObject({ stage: 'delete-proof', ids: [7, 9] });

    await act(async () => expect(hook.result.current.retry()).resolves.toBe(true));

    expect(mocks.deleteBulletins).toHaveBeenCalledTimes(1);
    expect(mocks.proveBulletinsDeleted).toHaveBeenCalledTimes(2);
    expect(context.getRecovery()).toBeNull();
  });

  it('retires a confirmed delete even when the list projection refresh fails', async () => {
    const context = createContext({ selectedId: 7 });
    context.refresh.mockResolvedValue(false);
    const hook = renderHook(() => useBulletinTransactions(context.value));
    const record = bulletin(7, 'Operations');

    await act(async () => {
      await expect(hook.result.current.remove(record)).resolves.toBe(true);
      await expect(hook.result.current.remove(record)).resolves.toBe(false);
    });

    expect(mocks.deleteBulletins).toHaveBeenCalledTimes(1);
    expect(context.setSelectedId).toHaveBeenCalledWith(null);
    expect(mocks.notification).toHaveBeenCalledWith({ message: 'bulletin.deleteSuccess', type: 'success' });
    expect(mocks.notification).not.toHaveBeenCalledWith({ message: 'bulletin.deleteError.error', type: 'error' });
  });

  it('retains ambiguous create proof and retries only the before/after evidence', async () => {
    const context = createContext();
    context.refresh.mockResolvedValue(true);
    mocks.createBulletin.mockRejectedValue(new BulletinRequestFailure('unavailable', 'uncertain'));
    mocks.proveBulletinCreated
      .mockRejectedValueOnce(new BulletinRequestFailure('unavailable', 'uncertain'))
      .mockResolvedValueOnce(bulletin(7, 'Operations'));
    const hook = renderHook(() => useBulletinTransactions(context.value));

    await act(async () => expect(hook.result.current.save()).resolves.toBe(false));
    await act(async () => expect(hook.result.current.save()).resolves.toBe(false));

    expect(context.getRecovery()).toMatchObject({ stage: 'create-proof', beforeIds: [] });
    expect(mocks.createBulletin).toHaveBeenCalledTimes(1);
    expect(mocks.proveBulletinCreated).toHaveBeenCalledTimes(1);

    await act(async () => expect(hook.result.current.retry()).resolves.toBe(true));

    expect(mocks.createBulletin).toHaveBeenCalledTimes(1);
    expect(mocks.proveBulletinCreated).toHaveBeenCalledTimes(2);
    expect(context.getRecovery()).toBeNull();
    expect(context.setDraft).toHaveBeenCalledWith(null);
  });

  it('retains create recovery when canonical detail no longer matches the submitted draft', async () => {
    const context = createContext();
    mocks.proveBulletinCreated.mockRejectedValue(new BulletinRequestFailure('invalid', 'uncertain'));
    const hook = renderHook(() => useBulletinTransactions(context.value));

    await act(async () => expect(hook.result.current.save()).resolves.toBe(false));
    await act(async () => expect(hook.result.current.save()).resolves.toBe(false));

    expect(context.getRecovery()).toMatchObject({ stage: 'create-proof', beforeIds: [], failure: 'invalid' });
    expect(mocks.createBulletin).toHaveBeenCalledTimes(1);
    expect(mocks.proveBulletinCreated).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['typed uncertainty', new BulletinRequestFailure('error', 'uncertain')],
    ['HTTP 408', normalizeBulletinApiFailure(new ApiMessageError('timeout', { status: 408 }), 'update')],
    [
      'cause-bearing 4xx',
      normalizeBulletinApiFailure(
        new ApiMessageError('offline', { status: 400, cause: new Error('private cause') }),
        'update'
      )
    ],
    [
      'business envelope',
      normalizeBulletinApiFailure(new ApiMessageError('failed', { code: 15, status: 200 }), 'update')
    ]
  ] as const)('retains ambiguous update proof for %s and never repeats PUT during recovery', async (_label, reason) => {
    const context = createContext();
    context.initialDraft.id = 7;
    context.refresh.mockResolvedValue(true);
    mocks.updateBulletin.mockRejectedValue(reason);
    mocks.proveBulletinUpdated
      .mockRejectedValueOnce(new BulletinRequestFailure('invalid', 'uncertain'))
      .mockResolvedValueOnce(bulletin(7, 'Operations'));
    const hook = renderHook(() => useBulletinTransactions(context.value));

    await act(async () => expect(hook.result.current.save()).resolves.toBe(false));
    expect(context.getRecovery()).toMatchObject({ stage: 'update-proof', draft: { id: 7 } });

    await act(async () => expect(hook.result.current.retry()).resolves.toBe(true));

    expect(mocks.updateBulletin).toHaveBeenCalledTimes(1);
    expect(mocks.proveBulletinUpdated).toHaveBeenCalledTimes(2);
    expect(context.getRecovery()).toBeNull();
  });

  it('retains ambiguous delete proof and never repeats DELETE during recovery', async () => {
    const context = createContext({ selectedId: 7 });
    context.refresh.mockResolvedValue(true);
    mocks.deleteBulletins.mockRejectedValue(new BulletinRequestFailure('unavailable', 'uncertain'));
    mocks.proveBulletinsDeleted
      .mockRejectedValueOnce(new BulletinRequestFailure('unavailable', 'uncertain'))
      .mockResolvedValueOnce(undefined);
    const hook = renderHook(() => useBulletinTransactions(context.value));
    const record = bulletin(7, 'Operations');

    await act(async () => expect(hook.result.current.remove(record)).resolves.toBe(false));
    await act(async () => expect(hook.result.current.remove(record)).resolves.toBe(false));
    expect(context.getRecovery()).toMatchObject({ stage: 'delete-proof', ids: [7], batch: false });

    await act(async () => expect(hook.result.current.retry()).resolves.toBe(true));

    expect(mocks.deleteBulletins).toHaveBeenCalledTimes(1);
    expect(mocks.proveBulletinsDeleted).toHaveBeenCalledTimes(2);
    expect(context.getRecovery()).toBeNull();
  });

  it('retains projection recovery after proof and retries only the list read', async () => {
    const context = createContext();
    context.refresh.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const hook = renderHook(() => useBulletinTransactions(context.value));

    await act(async () => expect(hook.result.current.save()).resolves.toBe(true));
    expect(context.getRecovery()).toMatchObject({ stage: 'projection', operation: 'save' });
    await act(async () => expect(hook.result.current.save()).resolves.toBe(false));

    await act(async () => expect(hook.result.current.retry()).resolves.toBe(true));

    expect(mocks.createBulletin).toHaveBeenCalledTimes(1);
    expect(context.refresh).toHaveBeenCalledTimes(2);
    expect(context.getRecovery()).toBeNull();
  });

  it('stops stale projection recovery without reopening the confirmed mutation or list read', async () => {
    const context = createContext();
    context.refresh.mockResolvedValue(false);
    const hook = renderHook(() => useBulletinTransactions(context.value));

    await act(async () => expect(hook.result.current.save()).resolves.toBe(true));
    expect(context.getRecovery()).toMatchObject({ stage: 'projection', operation: 'save' });
    const notifications = mocks.notification.mock.calls.length;
    expect(context.value.gate.cancelRecovery()).toBe(true);
    expect(context.getNotice()).toEqual({
      kind: 'projection-stopped',
      operation: 'save',
      mutation: 'confirmed',
      projection: 'stale'
    });

    await act(async () => expect(hook.result.current.retry()).resolves.toBe(false));
    expect(mocks.createBulletin).toHaveBeenCalledTimes(1);
    expect(context.refresh).toHaveBeenCalledTimes(1);
    expect(mocks.notification).toHaveBeenCalledTimes(notifications);
  });

  it('does not retry delete projection after ADMIN loses delete capability', async () => {
    const context = createContext({ selectedId: 7 });
    context.refresh.mockResolvedValue(false);
    const hook = renderHook(() => useBulletinTransactions(context.value));

    await act(async () => expect(hook.result.current.remove(bulletin(7, 'Operations'))).resolves.toBe(true));
    expect(context.getRecovery()).toMatchObject({ stage: 'projection', operation: 'delete' });
    context.canDeleteRef.current = false;

    await act(async () => expect(hook.result.current.retry()).resolves.toBe(false));

    expect(context.refresh).toHaveBeenCalledTimes(1);
    expect(context.getRecovery()).toMatchObject({ stage: 'projection', operation: 'delete' });
  });

  it('does not run a retained save retry after USER loses write capability', async () => {
    const context = createContext();
    context.refresh.mockResolvedValue(false);
    const hook = renderHook(() => useBulletinTransactions(context.value));

    await act(async () => expect(hook.result.current.save()).resolves.toBe(true));
    expect(context.getRecovery()).toMatchObject({ stage: 'projection', operation: 'save' });
    const retainedRetry = hook.result.current.retry;
    context.canWriteRef.current = false;

    await act(async () => expect(retainedRetry()).resolves.toBe(false));

    expect(context.refresh).toHaveBeenCalledTimes(1);
    expect(context.getRecovery()).toMatchObject({ stage: 'projection', operation: 'save' });
  });

  it('allows a deliberate rewrite only after an explicit typed 4xx rejection', async () => {
    const context = createContext();
    mocks.createBulletin.mockRejectedValue(new BulletinRequestFailure('error', 'rejected'));
    const hook = renderHook(() => useBulletinTransactions(context.value));

    await act(async () => expect(hook.result.current.save()).resolves.toBe(false));
    expect(context.getRecovery()).toBeNull();
    await act(async () => expect(hook.result.current.save()).resolves.toBe(false));

    expect(mocks.createBulletin).toHaveBeenCalledTimes(2);
    expect(mocks.proveBulletinCreated).not.toHaveBeenCalled();
  });

  it.each([
    ['create', 401],
    ['create', 403],
    ['update', 401],
    ['update', 403],
    ['delete', 401],
    ['delete', 403]
  ] as const)(
    'treats %s HTTP %i permission failure as definite rejection without proof or mutation retry',
    async (operation, status) => {
      const context = createContext({ selectedId: 7 });
      const failureOperation = operation === 'delete' ? 'delete' : operation;
      const failure = normalizeBulletinApiFailure(
        new ApiMessageError('private authorization detail', { status }),
        failureOperation
      );
      if (operation === 'create') mocks.createBulletin.mockRejectedValue(failure);
      if (operation === 'update') {
        context.initialDraft.id = 7;
        mocks.updateBulletin.mockRejectedValue(failure);
      }
      if (operation === 'delete') mocks.deleteBulletins.mockRejectedValue(failure);
      const hook = renderHook(() => useBulletinTransactions(context.value));

      await act(async () =>
        expect(
          operation === 'delete' ? hook.result.current.remove(bulletin(7, 'Operations')) : hook.result.current.save()
        ).resolves.toBe(false)
      );
      await act(async () => expect(hook.result.current.retry()).resolves.toBe(false));

      expect(context.getRecovery()).toBeNull();
      expect(context.setDraft).not.toHaveBeenCalledWith(null);
      expect(context.setSelectedId).not.toHaveBeenCalled();
      expect(mocks.proveBulletinCreated).not.toHaveBeenCalled();
      expect(mocks.proveBulletinUpdated).not.toHaveBeenCalled();
      expect(mocks.proveBulletinsDeleted).not.toHaveBeenCalled();
      expect(
        operation === 'create'
          ? mocks.createBulletin
          : operation === 'update'
            ? mocks.updateBulletin
            : mocks.deleteBulletins
      ).toHaveBeenCalledTimes(1);
      expect(mocks.notification).toHaveBeenCalledWith({
        message: operation === 'delete' ? 'bulletin.deleteError.permission' : 'bulletin.save.permission',
        type: 'error'
      });
    }
  );

  it('stops pending proof without side effects and admits only a later explicit save', async () => {
    const pending = deferred<ReturnType<typeof bulletin>>();
    const setSelectedId = vi.fn();
    mocks.proveBulletinCreated.mockReturnValueOnce(pending.promise);
    const hook = renderHook(() => {
      const gate = useBulletinOperationGate();
      const editor = useBulletinEditorController(gate, vi.fn(), { current: true });
      const transactions = useBulletinTransactions({
        ...createContext().value,
        editor,
        gate,
        setSelectedId
      });
      return { editor, gate, transactions };
    });
    act(() => hook.result.current.editor.controls.setDraft(createContext().initialDraft));
    const retainedRetry = hook.result.current.transactions.retry;
    let saving!: Promise<boolean>;
    act(() => {
      saving = hook.result.current.transactions.save();
    });
    await waitFor(() => expect(hook.result.current.gate.recovery).toMatchObject({ stage: 'create-proof' }));

    act(() => expect(hook.result.current.gate.cancelRecovery()).toBe(true));
    expect(mocks.createBulletin).toHaveBeenCalledTimes(1);
    expect(mocks.notification).not.toHaveBeenCalled();
    expect(mocks.invalidateQueries).not.toHaveBeenCalled();
    expect(setSelectedId).not.toHaveBeenCalled();
    expect(hook.result.current.editor.controls.getDraft()).toEqual(createContext().initialDraft);

    act(() => pending.resolve(bulletin(7, 'Operations')));
    await expect(saving).resolves.toBe(false);
    await expect(retainedRetry()).resolves.toBe(false);
    expect(mocks.captureBulletinCreateBaseline).toHaveBeenCalledTimes(1);
    expect(mocks.proveBulletinCreated).toHaveBeenCalledTimes(1);
    expect(mocks.createBulletin).toHaveBeenCalledTimes(1);
    expect(mocks.notification).not.toHaveBeenCalled();
    expect(mocks.invalidateQueries).not.toHaveBeenCalled();

    mocks.proveBulletinCreated.mockResolvedValueOnce(bulletin(8, 'Operations'));
    await act(async () => expect(hook.result.current.transactions.save()).resolves.toBe(true));
    expect(mocks.createBulletin).toHaveBeenCalledTimes(2);
  });

  it('stops while the original create request is pending without starting proof or replaying POST', async () => {
    const pendingCreate = deferred<void>();
    mocks.createBulletin.mockReturnValueOnce(pendingCreate.promise);
    const hook = renderHook(() => {
      const gate = useBulletinOperationGate();
      const editor = useBulletinEditorController(gate, vi.fn(), { current: true });
      const transactions = useBulletinTransactions({
        ...createContext().value,
        editor,
        gate
      });
      return { editor, gate, transactions };
    });
    act(() => hook.result.current.editor.controls.setDraft(createContext().initialDraft));

    let saving!: Promise<boolean>;
    act(() => {
      saving = hook.result.current.transactions.save();
    });
    await waitFor(() => expect(hook.result.current.gate.recovery).toMatchObject({ stage: 'create-proof' }));
    act(() => expect(hook.result.current.gate.cancelRecovery()).toBe(true));
    act(() => pendingCreate.resolve(undefined));

    await expect(saving).resolves.toBe(false);
    expect(mocks.createBulletin).toHaveBeenCalledTimes(1);
    expect(mocks.proveBulletinCreated).not.toHaveBeenCalled();
    expect(mocks.notification).not.toHaveBeenCalled();
    expect(mocks.invalidateQueries).not.toHaveBeenCalled();
    await expect(hook.result.current.transactions.retry()).resolves.toBe(false);
    expect(mocks.createBulletin).toHaveBeenCalledTimes(1);
  });

  it('ignores a rejected proof continuation after verification stops', async () => {
    const pending = deferred<ReturnType<typeof bulletin>>();
    mocks.proveBulletinCreated.mockReturnValue(pending.promise);
    const hook = renderHook(() => {
      const gate = useBulletinOperationGate();
      const editor = useBulletinEditorController(gate, vi.fn(), { current: true });
      const transactions = useBulletinTransactions({
        ...createContext().value,
        editor,
        gate
      });
      return { editor, gate, transactions };
    });
    act(() => hook.result.current.editor.controls.setDraft(createContext().initialDraft));
    let saving!: Promise<boolean>;
    act(() => {
      saving = hook.result.current.transactions.save();
    });
    await waitFor(() => expect(hook.result.current.gate.recovery).toMatchObject({ stage: 'create-proof' }));
    act(() => expect(hook.result.current.gate.cancelRecovery()).toBe(true));
    act(() => pending.reject(new BulletinRequestFailure('unavailable', 'uncertain')));

    await expect(saving).resolves.toBe(false);
    expect(mocks.notification).not.toHaveBeenCalled();
    expect(mocks.invalidateQueries).not.toHaveBeenCalled();
    expect(hook.result.current.editor.controls.getDraft()).toEqual(createContext().initialDraft);
  });

  it('does not publish or notify after a pending save loses ownership on unmount', async () => {
    const pending = deferred<ReturnType<typeof bulletin>>();
    const setSelectedId = vi.fn();
    mocks.proveBulletinCreated.mockReturnValue(pending.promise);
    const hook = renderHook(() => {
      const gate = useBulletinOperationGate();
      const editor = useBulletinEditorController(gate, vi.fn(), { current: true });
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
  let owner: { command: 'saving' | 'deleting' | 'recovering'; operation: 'save' | 'delete' } | undefined;
  let recovery: BulletinRecovery | null = null;
  let notice: BulletinOutcomeNotice | null = null;
  const setDraft = vi.fn((next: typeof initialDraft | null) => {
    draft = next;
  });
  const setSelectedId = vi.fn();
  const canWriteRef = { current: true };
  const canDeleteRef = { current: true };
  const value: Parameters<typeof useBulletinTransactions>[0] = {
    canWriteRef,
    canDeleteRef,
    dependencies: {
      kind: 'ready',
      fieldSelection: 'valid',
      monitorSelection: 'valid',
      monitors: [{ id: 1, name: 'Gateway', app: 'website', labels: {} }],
      metrics: [{ name: 'responseTime', fields: ['duration'] }]
    },
    editor: {
      state: { draft: initialDraft },
      controls: { getDraft: () => draft, invalidateDetail: vi.fn(), retireWriteAccess: vi.fn(), setDraft },
      actions: { close: vi.fn(), create: vi.fn(), edit: vi.fn(), update: vi.fn() }
    },
    gate: {
      command: 'idle',
      begin: next => {
        if (owner || recovery) return undefined;
        owner = { command: next, operation: next === 'deleting' ? 'delete' : 'save' };
        return owner;
      },
      beginRecovery: () => {
        if (owner || !recovery) return undefined;
        owner = {
          command: 'recovering',
          operation:
            recovery.stage === 'delete-proof' ? 'delete' : recovery.stage === 'projection' ? recovery.operation : 'save'
        };
        return { owner, recovery };
      },
      cancelRecovery: () => {
        if (!recovery) return false;
        notice = createBulletinOutcomeNotice(recovery);
        recovery = null;
        owner = undefined;
        return true;
      },
      clearRecovery: candidate => {
        if (owner !== candidate) return false;
        recovery = null;
        return true;
      },
      end: candidate => {
        if (owner === candidate) owner = undefined;
      },
      dismissNotice: () => {
        if (!notice) return false;
        notice = null;
        return true;
      },
      isCurrent: candidate => owner === candidate,
      isCommandActive: () => owner !== undefined,
      isLocked: () => owner !== undefined || recovery !== null,
      getRecovery: () => recovery,
      notice: null,
      recovery: null,
      retire: vi.fn(),
      setRecovery: (candidate, next) => {
        if (owner !== candidate) return false;
        recovery = next;
        return true;
      }
    },
    refresh,
    selectedId: options.selectedId ?? null,
    setSelectedId,
    t: key => key
  };
  return {
    canDeleteRef,
    canWriteRef,
    getRecovery: () => recovery,
    getNotice: () => notice,
    initialDraft,
    refresh,
    setDraft,
    setSelectedId,
    value
  };
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
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, reject, resolve };
}
