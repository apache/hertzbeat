/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useEffect, useRef, useState } from 'react';

import {
  createNoticeReceiverDraft,
  noticeReceiverDraftFromDetail,
  selectNoticeReceiverType,
  setNoticeReceiverSecretCleared,
  updateNoticeReceiverDraft,
  type NoticeReceiver,
  type NoticeReceiverDraft,
  type NoticeReceiverSecretKey,
  type NoticeReceiverType
} from '../model/notice-receiver-model';
import type { NoticeReceiverFailureKind } from '../model/notice-receiver-failure-kind';
import { classifyNoticeReceiverDetailFailure } from '../notice-receiver-failure';
import {
  useNoticeReceiverOperationController,
  type NoticeReceiverOperationController
} from './use-notice-receiver-operation-controller';

export { useNoticeReceiverOperationController as useNoticeReceiverOperationGate };
export type NoticeReceiverOperationGate = NoticeReceiverOperationController;

function useNoticeReceiverDraftStore() {
  const [draft, setDraft] = useState<NoticeReceiverDraft | null>(null);
  // State renders the draft; the ref retires its identity before same-tick submit or test can read stale data.
  const draftRef = useRef<NoticeReceiverDraft | null>(null);
  const publish = (next: NoticeReceiverDraft | null) => {
    draftRef.current = next;
    setDraft(next);
  };
  return { draft, get: () => draftRef.current, publish };
}

function useNoticeReceiverDetailEditor(
  gate: NoticeReceiverOperationGate,
  loadExact: (id: number) => Promise<NoticeReceiver>,
  publishDraft: (draft: NoticeReceiverDraft | null) => void,
  onReadFailure: (kind: NoticeReceiverFailureKind) => void
) {
  const mountedRef = useRef(true);
  const detailEpochRef = useRef(0);
  const pendingDetailRef = useRef<{ id: number; epoch: number; promise: Promise<boolean> } | undefined>(undefined);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      detailEpochRef.current += 1;
      pendingDetailRef.current = undefined;
    };
  }, []);
  const invalidateDetail = () => {
    detailEpochRef.current += 1;
    pendingDetailRef.current = undefined;
  };
  const edit = (id: number): Promise<boolean> => {
    if (gate.isLocked()) return Promise.resolve(false);
    if (pendingDetailRef.current?.id === id) return pendingDetailRef.current.promise;
    const epoch = detailEpochRef.current + 1;
    detailEpochRef.current = epoch;
    // A new identity synchronously retires the old draft before command closures can reuse it.
    publishDraft(null);
    const promise = loadDetail(id, epoch);
    // Publish pending ownership before another same-tick edit can duplicate the request.
    pendingDetailRef.current = { id, epoch, promise };
    return promise;
  };
  const loadDetail = async (id: number, epoch: number) => {
    try {
      const record = await loadExact(id);
      // Only the newest requested identity may publish detail into the editor.
      if (!mountedRef.current || detailEpochRef.current !== epoch) return true;
      publishDraft(noticeReceiverDraftFromDetail(record));
    } catch (error) {
      if (!mountedRef.current || detailEpochRef.current !== epoch) return true;
      onReadFailure(classifyNoticeReceiverDetailFailure(error));
    } finally {
      if (pendingDetailRef.current?.epoch === epoch) pendingDetailRef.current = undefined;
    }
    return true;
  };
  return { edit, invalidate: invalidateDetail };
}

export function useNoticeReceiverEditorController(
  gate: NoticeReceiverOperationGate,
  loadExact: (id: number) => Promise<NoticeReceiver>,
  onReadFailure: (kind: NoticeReceiverFailureKind) => void = () => undefined
) {
  const draftStore = useNoticeReceiverDraftStore();
  const detailEditor = useNoticeReceiverDetailEditor(gate, loadExact, draftStore.publish, onReadFailure);
  const mutateDraft = (mutate: (draft: NoticeReceiverDraft) => NoticeReceiverDraft) => {
    if (gate.isLocked()) return false;
    const current = draftStore.get();
    if (!current) return false;
    draftStore.publish(mutate(current));
    return true;
  };
  const create = () => {
    if (gate.isLocked()) return false;
    detailEditor.invalidate();
    draftStore.publish(createNoticeReceiverDraft());
    return true;
  };
  const close = () => {
    if (gate.isLocked()) return false;
    detailEditor.invalidate();
    draftStore.publish(null);
    return true;
  };
  return {
    state: { draft: draftStore.draft },
    controls: { getDraft: draftStore.get, invalidateDetail: detailEditor.invalidate, setDraft: draftStore.publish },
    actions: {
      close,
      create,
      edit: detailEditor.edit,
      selectType: (type: NoticeReceiverType) => mutateDraft(draft => selectNoticeReceiverType(draft, type)),
      setSecretCleared: (key: NoticeReceiverSecretKey, cleared: boolean) =>
        mutateDraft(draft => setNoticeReceiverSecretCleared(draft, key, cleared)),
      updateDraft: (patch: Partial<NoticeReceiverDraft>) =>
        mutateDraft(draft => updateNoticeReceiverDraft(draft, patch))
    }
  };
}

export type NoticeReceiverEditorController = ReturnType<typeof useNoticeReceiverEditorController>;
