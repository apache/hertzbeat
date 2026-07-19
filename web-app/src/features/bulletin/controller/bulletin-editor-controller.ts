/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useEffect, useRef, useState } from 'react';

import { classifyBulletinError, loadBulletin, type BulletinFailureKind } from '../api/bulletin-api';
import { createBulletinDraft, type BulletinDraft } from '../model/bulletin-model';

export type BulletinCommand = 'saving' | 'deleting';
export type BulletinOperationOwner = { command: BulletinCommand };

export function useBulletinOperationGate() {
  const mountedRef = useRef(true);
  const ownerRef = useRef<BulletinOperationOwner | undefined>(undefined);
  const [command, setCommand] = useState<'idle' | BulletinCommand>('idle');
  const begin = (next: BulletinCommand) => {
    // React state is asynchronous, so the ref closes same-tick command admission.
    if (!mountedRef.current || ownerRef.current) return undefined;
    const owner = { command: next };
    ownerRef.current = owner;
    setCommand(next);
    return owner;
  };
  const isCurrent = (owner: BulletinOperationOwner) => mountedRef.current && ownerRef.current === owner;
  const end = (owner: BulletinOperationOwner) => {
    // A stale finally block must never unlock a newer command owner.
    if (!isCurrent(owner)) return;
    ownerRef.current = undefined;
    setCommand('idle');
  };
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      // Async continuations lose permission to publish as soon as the page unmounts.
      mountedRef.current = false;
      ownerRef.current = undefined;
    };
  }, []);
  return { begin, command, end, isCurrent, isLocked: () => ownerRef.current !== undefined };
}

export type BulletinOperationGate = ReturnType<typeof useBulletinOperationGate>;

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

export function useBulletinEditorController(
  gate: BulletinOperationGate,
  onReadFailure: (kind: BulletinFailureKind) => void
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
    if (gate.isLocked()) return Promise.resolve(false);
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
      onReadFailure(classifyBulletinError(error, 'read-detail'));
      return false;
    } finally {
      if (pendingDetailRef.current?.epoch === epoch) pendingDetailRef.current = undefined;
    }
  };
  const create = () => {
    if (gate.isLocked()) return false;
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
    if (gate.isLocked()) return false;
    const current = draftStore.get();
    if (!current) return false;
    draftStore.publish({ ...current, ...patch });
    return true;
  };
  return {
    state: { draft: draftStore.draft },
    controls: { getDraft: draftStore.get, invalidateDetail, setDraft: draftStore.publish },
    actions: { close, create, edit, update }
  };
}

export type BulletinEditorController = ReturnType<typeof useBulletinEditorController>;
