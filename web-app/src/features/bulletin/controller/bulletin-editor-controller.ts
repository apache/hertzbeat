/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useEffect, useRef, useState, type RefObject } from 'react';

import { loadBulletin } from '../api/bulletin-api';
import { classifyBulletinFailure, type BulletinFailureKind } from '../model/bulletin-failure';
import { createBulletinDraft, type BulletinDraft } from '../model/bulletin-model';
import {
  bulletinRecoveryOperation,
  type BulletinCommand,
  type BulletinRecovery,
  type BulletinRecoveryOperation
} from '../model/bulletin-operation-state';

export type BulletinOperationOwner = {
  command: Exclude<BulletinCommand, 'idle'>;
  operation: BulletinRecoveryOperation;
};

export function useBulletinOperationGate() {
  const mountedRef = useRef(true);
  const ownerRef = useRef<BulletinOperationOwner | undefined>(undefined);
  const recoveryRef = useRef<BulletinRecovery | null>(null);
  const [command, setCommand] = useState<BulletinCommand>('idle');
  const [recovery, setRecoveryState] = useState<BulletinRecovery | null>(null);
  const replace = (next: BulletinOperationOwner['command'], operation: BulletinRecoveryOperation) => {
    const owner = { command: next, operation };
    ownerRef.current = owner;
    setCommand(next);
    return owner;
  };
  const begin = (next: 'saving' | 'deleting') => {
    // React state is asynchronous, so the ref closes same-tick command admission.
    if (!mountedRef.current || ownerRef.current || recoveryRef.current) return undefined;
    return replace(next, next === 'deleting' ? 'delete' : 'save');
  };
  const beginRecovery = () => {
    if (!mountedRef.current || ownerRef.current || !recoveryRef.current) return undefined;
    const recovery = recoveryRef.current;
    return { owner: replace('recovering', bulletinRecoveryOperation(recovery)), recovery };
  };
  const isCurrent = (owner: BulletinOperationOwner) => mountedRef.current && ownerRef.current === owner;
  const publishRecovery = (owner: BulletinOperationOwner, next: BulletinRecovery | null) => {
    if (!isCurrent(owner)) return false;
    recoveryRef.current = next;
    setRecoveryState(next);
    return true;
  };
  const end = (owner: BulletinOperationOwner) => {
    // A stale finally block must never unlock a newer command owner.
    if (!isCurrent(owner)) return;
    ownerRef.current = undefined;
    setCommand('idle');
  };
  const retire = (operation: BulletinRecoveryOperation) => {
    if (ownerRef.current?.operation === operation) {
      ownerRef.current = undefined;
      setCommand('idle');
    }
    const currentRecovery = recoveryRef.current;
    if (currentRecovery && bulletinRecoveryOperation(currentRecovery) === operation) {
      recoveryRef.current = null;
      setRecoveryState(null);
    }
  };
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      // Async continuations lose permission to publish as soon as the page unmounts.
      mountedRef.current = false;
      ownerRef.current = undefined;
      recoveryRef.current = null;
    };
  }, []);
  return {
    begin,
    beginRecovery,
    clearRecovery: (owner: BulletinOperationOwner) => publishRecovery(owner, null),
    command,
    end,
    getRecovery: () => recoveryRef.current,
    isCurrent,
    isLocked: () => ownerRef.current !== undefined || recoveryRef.current !== null,
    recovery,
    retire,
    setRecovery: (owner: BulletinOperationOwner, next: BulletinRecovery) => publishRecovery(owner, next)
  };
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
  return {
    state: { draft: draftStore.draft },
    controls: { getDraft: draftStore.get, invalidateDetail, retireWriteAccess, setDraft: draftStore.publish },
    actions: { close, create, edit, update }
  };
}

export type BulletinEditorController = ReturnType<typeof useBulletinEditorController>;
