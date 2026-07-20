/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useEffect, useRef, useState } from 'react';

import { classifyAlertInhibitReadError } from '../alert-inhibit-api';
import { alertInhibitDraftFromDetail, createAlertInhibitDraft, type AlertInhibitDraft } from '../alert-inhibit-model';
import { loadExactAlertInhibit } from '../alert-inhibit-write-proof';
import type { AlertInhibitOperationController } from './use-alert-inhibit-operation-controller';

export type AlertInhibitFailure = 'missing' | 'unavailable' | 'error';
export type AlertInhibitDetailState =
  { kind: 'idle' } | { kind: 'loading'; id: number } | { kind: AlertInhibitFailure; id: number };

function useAlertInhibitDraftStore() {
  const [draft, setDraft] = useState<AlertInhibitDraft | null>(null);
  // State renders the draft; the ref retires its identity before a same-tick submit can read stale data.
  const draftRef = useRef<AlertInhibitDraft | null>(null);
  const publish = (next: AlertInhibitDraft | null) => {
    draftRef.current = next;
    setDraft(next);
  };
  const patch = (next: Partial<AlertInhibitDraft>) => {
    publish(draftRef.current ? { ...draftRef.current, ...next } : draftRef.current);
  };
  return { draft, get: () => draftRef.current, patch, publish };
}

function useAlertInhibitDetailEditor(
  operation: AlertInhibitOperationController,
  publishDraft: (draft: AlertInhibitDraft | null) => void,
  clearEditorFailure: () => void
) {
  const mountedRef = useRef(true);
  const [detail, setDetail] = useState<AlertInhibitDetailState>({ kind: 'idle' });
  const detailEpochRef = useRef(0);
  const pendingDetailRef = useRef<
    | {
        id: number;
        epoch: number;
        promise: Promise<void>;
      }
    | undefined
  >(undefined);
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
    setDetail({ kind: 'idle' });
  };
  const edit = (id: number): Promise<void> => {
    if (!mountedRef.current || operation.isLocked()) return Promise.resolve();
    if (pendingDetailRef.current?.id === id) return pendingDetailRef.current.promise;
    const epoch = detailEpochRef.current + 1;
    detailEpochRef.current = epoch;
    // A new detail identity retires the old draft before it can be submitted under the wrong context.
    publishDraft(null);
    setDetail({ kind: 'loading', id });
    const promise = loadDetailIntoEditor(id, epoch);
    // Register same-tick ownership before the awaited detail continuation can publish or deduplicate.
    pendingDetailRef.current = { id, epoch, promise };
    return promise;
  };
  const loadDetailIntoEditor = async (id: number, epoch: number) => {
    try {
      const record = await loadExactAlertInhibit(id);
      // Only the newest requested identity may publish detail into the editor.
      if (!mountedRef.current || detailEpochRef.current !== epoch) return;
      publishDraft(alertInhibitDraftFromDetail(record));
      clearEditorFailure();
      setDetail({ kind: 'idle' });
    } catch (reason) {
      if (mountedRef.current && detailEpochRef.current === epoch) {
        setDetail({ kind: classifyAlertInhibitReadError(reason), id });
      }
    } finally {
      if (pendingDetailRef.current?.epoch === epoch) pendingDetailRef.current = undefined;
    }
  };
  const retry = () => (detail.kind === 'idle' ? Promise.resolve() : edit(detail.id));
  return { detail, edit, invalidate: invalidateDetail, retry };
}

export function useAlertInhibitEditorController(operation: AlertInhibitOperationController) {
  const draftStore = useAlertInhibitDraftStore();
  const [editorFailure, setEditorFailure] = useState<AlertInhibitFailure>();
  const detailEditor = useAlertInhibitDetailEditor(operation, draftStore.publish, () => setEditorFailure(undefined));
  const create = () => {
    if (operation.isLocked()) return;
    detailEditor.invalidate();
    draftStore.publish(createAlertInhibitDraft());
    setEditorFailure(undefined);
  };
  const closeDraft = () => {
    if (operation.isLocked()) return;
    detailEditor.invalidate();
    draftStore.publish(null);
  };
  const updateDraft = (patch: Partial<AlertInhibitDraft>) => {
    if (operation.isLocked()) return;
    draftStore.patch(patch);
  };
  return {
    state: { detail: detailEditor.detail, draft: draftStore.draft, editorFailure },
    controls: {
      getDraft: draftStore.get,
      invalidateDetail: detailEditor.invalidate,
      setDraft: draftStore.publish,
      setEditorFailure
    },
    actions: { closeDraft, create, edit: detailEditor.edit, retryDetail: detailEditor.retry, updateDraft }
  };
}

export type AlertInhibitEditorController = ReturnType<typeof useAlertInhibitEditorController>;
