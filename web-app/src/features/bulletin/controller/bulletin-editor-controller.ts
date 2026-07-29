/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useEffect, useRef, useState, type RefObject } from 'react';

import { loadBulletin } from '../api/bulletin-api';
import { classifyBulletinFailure, type BulletinFailureKind } from '../model/bulletin-failure';
import { createBulletinDraft, type BulletinDraft } from '../model/bulletin-model';
import type { BulletinOperationGate } from './bulletin-operation-gate';

function useBulletinDraftStore() {
  const [draft, setDraft] = useState<BulletinDraft | null>(null);
  const draftRef = useRef<BulletinDraft | null>(null);
  const publish = (next: BulletinDraft | null) => {
    // Commands read the ref so an edit or close in the same tick cannot expose a retired draft.
    draftRef.current = next;
    setDraft(next);
  };
  return { draft, get: () => draftRef.current, publish };
}

function createBulletinDraftActions(
  draftStore: ReturnType<typeof useBulletinDraftStore>,
  gate: BulletinOperationGate,
  canWriteRef: RefObject<boolean>,
  invalidateDetail: () => void
) {
  const create = () => {
    if (!canWriteRef.current || gate.isLocked()) return false;
    invalidateDetail();
    draftStore.publish(createBulletinDraft());
    return true;
  };
  const close = () => {
    if (gate.isLocked()) return false;
    invalidateDetail();
    draftStore.publish(null);
    return true;
  };
  const update = (patch: Partial<BulletinDraft>) => {
    if (!canWriteRef.current || gate.isLocked()) return false;
    const current = draftStore.get();
    if (!current) return false;
    draftStore.publish({ ...current, ...patch });
    return true;
  };
  const retireWriteAccess = () => {
    invalidateDetail();
    draftStore.publish(null);
  };
  return { close, create, retireWriteAccess, update };
}

export function useBulletinEditorController(
  gate: BulletinOperationGate,
  onReadFailure: (kind: BulletinFailureKind) => void,
  canWriteRef: RefObject<boolean>
) {
  const draftStore = useBulletinDraftStore();
  const detailEpochRef = useRef(0);
  const pendingDetailRef = useRef<{ id: number; epoch: number; promise: Promise<boolean> } | undefined>(undefined);
  const invalidateDetail = () => {
    detailEpochRef.current += 1;
    pendingDetailRef.current = undefined;
  };
  // Cleanup invalidates the request identity without publishing React state.
  useEffect(() => invalidateDetail, []);
  const edit = (id: number): Promise<boolean> => {
    if (!canWriteRef.current || gate.isLocked()) return Promise.resolve(false);
    if (pendingDetailRef.current?.id === id) return pendingDetailRef.current.promise;
    const epoch = ++detailEpochRef.current;
    // Retire the old identity before a same-tick save can read it.
    draftStore.publish(null);
    const promise = loadDetail(id, epoch);
    pendingDetailRef.current = { id, epoch, promise };
    return promise;
  };
  const loadDetail = async (id: number, epoch: number) => {
    try {
      const bulletin = await loadBulletin(id);
      if (detailEpochRef.current !== epoch) return false;
      draftStore.publish(bulletin);
      return true;
    } catch (error) {
      if (detailEpochRef.current !== epoch) return false;
      onReadFailure(classifyBulletinFailure(error));
      return false;
    } finally {
      if (pendingDetailRef.current?.epoch === epoch) pendingDetailRef.current = undefined;
    }
  };
  const draftActions = createBulletinDraftActions(draftStore, gate, canWriteRef, invalidateDetail);
  return {
    state: { draft: draftStore.draft },
    controls: {
      getDraft: draftStore.get,
      invalidateDetail,
      retireWriteAccess: draftActions.retireWriteAccess,
      setDraft: draftStore.publish
    },
    actions: { close: draftActions.close, create: draftActions.create, edit, update: draftActions.update }
  };
}

export type BulletinEditorController = ReturnType<typeof useBulletinEditorController>;
