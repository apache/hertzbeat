/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { act, renderHook } from '@testing-library/react';
import { StrictMode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NoticeReceiverRequestFailure, type NoticeReceiverFailureKind } from '../model/notice-receiver-failure';
import type { NoticeReceiver } from '../model/notice-receiver-model';
import { deferred, persistedNoticeReceiver } from './notice-receiver-controller-test-fixtures';

import {
  useNoticeReceiverEditorController,
  useNoticeReceiverOperationGate
} from './use-notice-receiver-editor-controller';

const editorCapabilities = { canCreate: true, canEdit: true, canTest: true, canDelete: true };

describe('notice receiver editor controller', () => {
  const loadExact = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    loadExact.mockResolvedValue(persistedNoticeReceiver);
  });

  it('deduplicates the same id, publishes only the latest id, and invalidates detail on create and close', async () => {
    const first = deferred<NoticeReceiver>();
    const latest = deferred<NoticeReceiver>();
    const createInvalidated = deferred<NoticeReceiver>();
    const closeInvalidated = deferred<NoticeReceiver>();
    loadExact.mockImplementation((id: number) => {
      if (id === 7) return first.promise;
      if (id === 8) return latest.promise;
      if (id === 9) return createInvalidated.promise;
      return closeInvalidated.promise;
    });
    const { result } = renderEditorController(loadExact);

    let firstEdit!: Promise<boolean>;
    let duplicateEdit!: Promise<boolean>;
    let latestEdit!: Promise<boolean>;
    act(() => {
      firstEdit = result.current.editor.actions.edit(7);
      duplicateEdit = result.current.editor.actions.edit(7);
      latestEdit = result.current.editor.actions.edit(8);
    });
    expect(loadExact).toHaveBeenCalledTimes(2);
    act(() => latest.resolve({ ...persistedNoticeReceiver, id: 8, name: 'Latest' }));
    await act(async () => latestEdit);
    expect(result.current.editor.state.draft).toMatchObject({ id: 8, name: 'Latest' });
    act(() => first.resolve(persistedNoticeReceiver));
    await act(async () => Promise.all([firstEdit, duplicateEdit]));
    expect(result.current.editor.state.draft).toMatchObject({ id: 8, name: 'Latest' });

    let invalidatedByCreate!: Promise<boolean>;
    act(() => {
      invalidatedByCreate = result.current.editor.actions.edit(9);
      expect(result.current.editor.actions.create()).toBe(true);
    });
    act(() => createInvalidated.resolve({ ...persistedNoticeReceiver, id: 9 }));
    await act(async () => invalidatedByCreate);
    expect(result.current.editor.state.draft).toMatchObject({ name: '', configuredSecrets: [] });

    let invalidatedByClose!: Promise<boolean>;
    act(() => {
      invalidatedByClose = result.current.editor.actions.edit(10);
      expect(result.current.editor.actions.close()).toBe(true);
    });
    act(() => closeInvalidated.resolve({ ...persistedNoticeReceiver, id: 10 }));
    await act(async () => invalidatedByClose);
    expect(result.current.editor.state.draft).toBeNull();
  });

  it('retires the old draft synchronously when a different detail starts loading', async () => {
    const next = deferred<NoticeReceiver>();
    loadExact.mockResolvedValueOnce(persistedNoticeReceiver).mockReturnValueOnce(next.promise);
    const { result } = renderEditorController(loadExact);
    await act(async () => result.current.editor.actions.edit(7));

    let nextEdit!: Promise<boolean>;
    act(() => {
      nextEdit = result.current.editor.actions.edit(8);
    });

    expect(result.current.editor.controls.getDraft()).toBeNull();
    act(() => next.resolve({ ...persistedNoticeReceiver, id: 8 }));
    await act(async () => nextEdit);
  });

  it('returns false for every draft/context mutation while the operation gate is owned', async () => {
    const { result } = renderEditorController(loadExact);
    act(() => expect(result.current.editor.actions.create()).toBe(true));
    const before = result.current.editor.state.draft;
    act(() => expect(result.current.gate.begin('saving')).toBeTruthy());

    expect(result.current.editor.actions.create()).toBe(false);
    expect(result.current.editor.actions.close()).toBe(false);
    expect(result.current.editor.actions.updateDraft({ name: 'blocked' })).toBe(false);
    expect(result.current.editor.actions.selectType(1)).toBe(false);
    expect(result.current.editor.actions.setSecretCleared('hookUrl', true)).toBe(false);
    await expect(result.current.editor.actions.edit(7)).resolves.toBe(false);
    expect(result.current.editor.state.draft).toEqual(before);
    expect(loadExact).not.toHaveBeenCalled();
  });

  it('keeps detail missing distinct from other detail failures', async () => {
    const onReadFailure = vi.fn();
    loadExact.mockRejectedValue(
      new NoticeReceiverRequestFailure('missing', 'rejected', { code: 'NOTICE_RECEIVER_MISSING' })
    );
    const { result } = renderEditorController(loadExact, onReadFailure);
    await act(async () => result.current.editor.actions.edit(7));
    expect(onReadFailure).toHaveBeenCalledWith('missing');
    expect(result.current.editor.state.draft).toBeNull();
  });

  it('returns false for draft mutations when no draft exists', () => {
    const { result } = renderEditorController(loadExact);
    expect(result.current.editor.actions.updateDraft({ name: 'missing' })).toBe(false);
    expect(result.current.editor.actions.selectType(1)).toBe(false);
    expect(result.current.editor.actions.setSecretCleared('hookUrl', true)).toBe(false);
  });

  it('retires a pending detail failure when the editor controller unmounts', async () => {
    const detail = deferred<NoticeReceiver>();
    const onReadFailure = vi.fn();
    loadExact.mockReturnValueOnce(detail.promise);
    const { result, unmount } = renderEditorController(loadExact, onReadFailure);
    let operation!: Promise<boolean>;
    act(() => {
      operation = result.current.editor.actions.edit(7);
    });

    unmount();
    act(() => detail.reject(new NoticeReceiverRequestFailure('unavailable', 'uncertain')));
    await act(async () => operation);

    expect(onReadFailure).not.toHaveBeenCalled();
  });

  it('remains active after StrictMode replays mount effects', async () => {
    const { result } = renderHook(
      () => {
        const gate = useNoticeReceiverOperationGate();
        const editor = useNoticeReceiverEditorController({
          capabilities: editorCapabilities,
          gate,
          loadExact
        });
        return { editor, gate };
      },
      { wrapper: StrictMode }
    );

    act(() => expect(result.current.editor.actions.create()).toBe(true));
    await act(async () => result.current.editor.actions.edit(7));

    expect(result.current.editor.state.draft).toMatchObject({ id: 7 });
    act(() => expect(result.current.gate.begin('saving')).toBeTruthy());
  });
});

function renderEditorController(
  loadExact: (id: number) => Promise<NoticeReceiver>,
  onReadFailure?: (kind: NoticeReceiverFailureKind) => void
) {
  return renderHook(() => {
    const gate = useNoticeReceiverOperationGate();
    const editor = useNoticeReceiverEditorController({
      capabilities: editorCapabilities,
      gate,
      loadExact,
      ...(onReadFailure ? { onReadFailure } : {})
    });
    return { editor, gate };
  });
}
