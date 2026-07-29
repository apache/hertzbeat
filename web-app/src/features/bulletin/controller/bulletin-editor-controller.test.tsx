/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BulletinRequestFailure } from '../model/bulletin-failure';
import type { Bulletin } from '../model/bulletin-model';

const api = vi.hoisted(() => ({ loadBulletin: vi.fn() }));
vi.mock('../api/bulletin-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/bulletin-api')>()),
  loadBulletin: api.loadBulletin
}));

import { useBulletinEditorController } from './bulletin-editor-controller';
import { useBulletinOperationGate } from './bulletin-operation-gate';

describe('Bulletin editor controller', () => {
  beforeEach(() => vi.clearAllMocks());

  it('deduplicates the same id and publishes only the latest different detail', async () => {
    const first = deferred<Bulletin>();
    const latest = deferred<Bulletin>();
    api.loadBulletin.mockReturnValueOnce(first.promise).mockReturnValueOnce(latest.promise);
    const { result } = renderEditorController();

    let firstEdit!: Promise<boolean>;
    let duplicateEdit!: Promise<boolean>;
    let latestEdit!: Promise<boolean>;
    act(() => {
      firstEdit = result.current.editor.actions.edit(7);
      duplicateEdit = result.current.editor.actions.edit(7);
      latestEdit = result.current.editor.actions.edit(8);
    });

    expect(api.loadBulletin).toHaveBeenCalledTimes(2);
    act(() => latest.resolve(bulletin(8, 'Latest')));
    await act(async () => latestEdit);
    expect(result.current.editor.state.draft).toMatchObject({ id: 8, name: 'Latest' });

    act(() => first.resolve(bulletin(7, 'Stale')));
    await act(async () => Promise.all([firstEdit, duplicateEdit]));
    expect(result.current.editor.state.draft).toMatchObject({ id: 8, name: 'Latest' });
  });

  it('invalidates pending detail on create and close', async () => {
    const createPending = deferred<Bulletin>();
    const closePending = deferred<Bulletin>();
    api.loadBulletin.mockReturnValueOnce(createPending.promise).mockReturnValueOnce(closePending.promise);
    const { result } = renderEditorController();

    let editBeforeCreate!: Promise<boolean>;
    act(() => {
      editBeforeCreate = result.current.editor.actions.edit(7);
      expect(result.current.editor.actions.create()).toBe(true);
    });
    act(() => createPending.resolve(bulletin(7, 'Stale create')));
    await act(async () => editBeforeCreate);
    expect(result.current.editor.state.draft).toMatchObject({ name: '', monitorIds: [], fields: {} });

    let editBeforeClose!: Promise<boolean>;
    act(() => {
      editBeforeClose = result.current.editor.actions.edit(8);
      expect(result.current.editor.actions.close()).toBe(true);
    });
    act(() => closePending.resolve(bulletin(8, 'Stale close')));
    await act(async () => editBeforeClose);
    expect(result.current.editor.state.draft).toBeNull();
  });

  it('retires a pending detail request when the controller unmounts', async () => {
    const pending = deferred<Bulletin>();
    const onReadFailure = vi.fn();
    api.loadBulletin.mockReturnValue(pending.promise);
    const hook = renderEditorController(onReadFailure);

    let editing!: Promise<boolean>;
    act(() => {
      editing = hook.result.current.editor.actions.edit(7);
    });
    hook.unmount();
    act(() => pending.resolve(bulletin(7, 'Retired')));

    await expect(editing).resolves.toBe(false);
    expect(onReadFailure).not.toHaveBeenCalled();
  });

  it('reports a stable permission failure for detail reads without opening a draft', async () => {
    const onReadFailure = vi.fn();
    api.loadBulletin.mockRejectedValue(new BulletinRequestFailure('permission', 'uncertain'));
    const { result } = renderEditorController(onReadFailure);

    await act(async () => expect(result.current.editor.actions.edit(7)).resolves.toBe(false));

    expect(onReadFailure).toHaveBeenCalledWith('permission');
    expect(result.current.editor.state.draft).toBeNull();
  });

  it('locks every editor mutation synchronously while a command owns the gate', async () => {
    const { result } = renderEditorController();
    act(() => expect(result.current.editor.actions.create()).toBe(true));
    const before = result.current.editor.controls.getDraft();
    act(() => expect(result.current.gate.begin('saving')).toBeTruthy());

    expect(result.current.editor.actions.create()).toBe(false);
    expect(result.current.editor.actions.close()).toBe(false);
    expect(result.current.editor.actions.update({ name: 'ignored' })).toBe(false);
    expect(result.current.editor.controls.getDraft()).toEqual(before);
    await expect(result.current.editor.actions.edit(7)).resolves.toBe(false);
  });

  it('rejects direct and retained write-editor commands when current write capability is absent', async () => {
    const canWriteRef = { current: true };
    const { result } = renderEditorController(vi.fn(), canWriteRef);
    const retained = { ...result.current.editor.actions };
    canWriteRef.current = false;

    expect(retained.create()).toBe(false);
    expect(retained.update({ name: 'ignored' })).toBe(false);
    await expect(retained.edit(7)).resolves.toBe(false);
    expect(result.current.editor.state.draft).toBeNull();
    expect(api.loadBulletin).not.toHaveBeenCalled();
  });

  it('allows only the current owner to release the operation gate', () => {
    const { result } = renderEditorController();
    let owner!: NonNullable<ReturnType<typeof result.current.gate.begin>>;
    act(() => {
      owner = result.current.gate.begin('saving')!;
      result.current.gate.end({ command: 'saving', operation: 'save' });
    });

    expect(result.current.gate.isLocked()).toBe(true);
    act(() => result.current.gate.end(owner));
    expect(result.current.gate.isLocked()).toBe(false);
  });

  it('separates an active recovery command from its retained proof receipt', () => {
    const { result } = renderEditorController();
    const draft = { ...bulletin(7, 'Operations') };
    let owner!: NonNullable<ReturnType<typeof result.current.gate.begin>>;
    act(() => {
      owner = result.current.gate.begin('saving')!;
      result.current.gate.setRecovery(owner, {
        stage: 'update-proof',
        draft,
        failure: 'unavailable'
      });
      result.current.gate.end(owner);
    });

    expect(result.current.gate.command).toBe('idle');
    expect(result.current.gate.recovery).toMatchObject({ stage: 'update-proof', draft: { id: 7 } });
    expect(result.current.gate.isLocked()).toBe(true);
    expect(result.current.gate.begin('saving')).toBeUndefined();

    let recoveryOwner!: NonNullable<ReturnType<typeof result.current.gate.beginRecovery>>;
    act(() => {
      recoveryOwner = result.current.gate.beginRecovery()!;
    });
    expect(result.current.gate.command).toBe('recovering');
    expect(recoveryOwner.recovery).toMatchObject({ stage: 'update-proof', draft: { id: 7 } });

    act(() => {
      result.current.gate.clearRecovery(recoveryOwner.owner);
      result.current.gate.end(recoveryOwner.owner);
    });
    expect(result.current.gate.recovery).toBeNull();
    expect(result.current.gate.isLocked()).toBe(false);
  });

  it('atomically stops pending proof once and retires every late publication path', async () => {
    const { result } = renderEditorController();
    const submitted = { ...bulletin(7, 'Operations'), monitorIds: [1], fields: { responseTime: ['duration'] } };
    let owner!: NonNullable<ReturnType<typeof result.current.gate.begin>>;
    act(() => {
      owner = result.current.gate.begin('saving')!;
      result.current.gate.setRecovery(owner, {
        stage: 'update-proof',
        draft: submitted,
        failure: 'unavailable'
      });
    });

    act(() => {
      expect(result.current.gate.cancelRecovery()).toBe(true);
      expect(result.current.gate.cancelRecovery()).toBe(false);
    });

    expect(result.current.gate.command).toBe('idle');
    expect(result.current.gate.recovery).toBeNull();
    expect(result.current.gate.notice).toMatchObject({
      kind: 'proof-stopped',
      operation: 'save',
      stage: 'update-proof',
      draft: { id: 7, name: 'Operations' }
    });
    expect(result.current.gate.isCurrent(owner)).toBe(false);
    expect(result.current.gate.setRecovery(owner, { stage: 'update-proof', draft: submitted, failure: 'error' })).toBe(
      false
    );
    expect(result.current.gate.clearRecovery(owner)).toBe(false);
    act(() => {
      expect(result.current.gate.dismissNotice()).toBe(true);
      expect(result.current.gate.dismissNotice()).toBe(false);
    });
    expect(result.current.gate.notice).toBeNull();
  });

  it('records confirmed mutation separately from a stale projection when verification stops', () => {
    const { result } = renderEditorController();
    let owner!: NonNullable<ReturnType<typeof result.current.gate.begin>>;
    act(() => {
      owner = result.current.gate.begin('deleting')!;
      result.current.gate.setRecovery(owner, {
        stage: 'projection',
        operation: 'delete',
        failure: 'unavailable'
      });
      result.current.gate.end(owner);
      expect(result.current.gate.cancelRecovery()).toBe(true);
    });

    expect(result.current.gate.notice).toEqual({
      kind: 'projection-stopped',
      operation: 'delete',
      mutation: 'confirmed',
      projection: 'stale'
    });
    expect(result.current.gate.isLocked()).toBe(false);
  });

  it('preserves a stopped outcome through later commands until explicit dismissal', () => {
    const { result } = renderEditorController();
    let stoppedOwner!: NonNullable<ReturnType<typeof result.current.gate.begin>>;
    act(() => {
      stoppedOwner = result.current.gate.begin('saving')!;
      result.current.gate.setRecovery(stoppedOwner, {
        stage: 'update-proof',
        draft: { ...bulletin(7, 'Submitted before role loss') },
        failure: 'unavailable'
      });
      expect(result.current.gate.retire('save')).toBe(true);
    });

    expect(result.current.gate.notice).toMatchObject({
      kind: 'proof-stopped',
      stage: 'update-proof',
      draft: { id: 7, name: 'Submitted before role loss' }
    });

    let nextOwner!: NonNullable<ReturnType<typeof result.current.gate.begin>>;
    act(() => {
      nextOwner = result.current.gate.begin('saving')!;
      result.current.gate.end(nextOwner);
    });
    expect(result.current.gate.notice).toMatchObject({
      kind: 'proof-stopped',
      draft: { id: 7, name: 'Submitted before role loss' }
    });

    act(() => expect(result.current.gate.dismissNotice()).toBe(true));
    expect(result.current.gate.notice).toBeNull();
  });

  it('selectively retires pending owners and typed recovery by operation', () => {
    const { result } = renderEditorController();
    let saveOwner!: NonNullable<ReturnType<typeof result.current.gate.begin>>;
    act(() => {
      saveOwner = result.current.gate.begin('saving')!;
      result.current.gate.setRecovery(saveOwner, {
        stage: 'projection',
        operation: 'save',
        failure: 'unavailable'
      });
      result.current.gate.end(saveOwner);
      result.current.gate.retire('delete');
    });
    expect(result.current.gate.recovery).toMatchObject({ stage: 'projection', operation: 'save' });

    act(() => result.current.gate.retire('save'));
    expect(result.current.gate.recovery).toBeNull();
    expect(result.current.gate.notice).toEqual({
      kind: 'projection-stopped',
      operation: 'save',
      mutation: 'confirmed',
      projection: 'stale'
    });

    let deleteOwner!: NonNullable<ReturnType<typeof result.current.gate.begin>>;
    act(() => {
      deleteOwner = result.current.gate.begin('deleting')!;
      result.current.gate.retire('delete');
    });
    expect(result.current.gate.isCurrent(deleteOwner)).toBe(false);
    expect(result.current.gate.command).toBe('idle');
  });
});

function renderEditorController(onReadFailure = vi.fn(), canWriteRef = { current: true }) {
  return renderHook(() => {
    const gate = useBulletinOperationGate();
    const editor = useBulletinEditorController(gate, onReadFailure, canWriteRef);
    return { editor, gate };
  });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => {
    resolve = done;
  });
  return { promise, resolve };
}

function bulletin(id: number, name: string): Bulletin {
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
