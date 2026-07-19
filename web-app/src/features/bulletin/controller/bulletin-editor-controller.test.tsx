/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Bulletin } from '../model/bulletin-model';

const api = vi.hoisted(() => ({ loadBulletin: vi.fn() }));
vi.mock('../api/bulletin-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/bulletin-api')>()),
  loadBulletin: api.loadBulletin
}));

import { useBulletinEditorController, useBulletinOperationGate } from './bulletin-editor-controller';

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

  it('allows only the current owner to release the operation gate', () => {
    const { result } = renderEditorController();
    let owner!: NonNullable<ReturnType<typeof result.current.gate.begin>>;
    act(() => {
      owner = result.current.gate.begin('saving')!;
      result.current.gate.end({ command: 'saving' });
    });

    expect(result.current.gate.isLocked()).toBe(true);
    act(() => result.current.gate.end(owner));
    expect(result.current.gate.isLocked()).toBe(false);
  });
});

function renderEditorController(onReadFailure = vi.fn()) {
  return renderHook(() => {
    const gate = useBulletinOperationGate();
    const editor = useBulletinEditorController(gate, onReadFailure);
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
