/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';

import { classifyAlertGroupReadError, loadAlertGroup } from '../alert-group-api';
import { alertGroupDraftFromDetail, createAlertGroupDraft, type AlertGroupDraft } from '../alert-group-model';
import type { AlertGroupDetailState, AlertGroupFailure } from '../alert-group-state';
import { requireExactAlertGroupId, type AlertGroupCreateProof } from '../alert-group-write-proof';

type CommandKind = 'saving' | 'operating';

export function useAlertGroupCommandGate() {
  const ownerAliveRef = useRef(false);
  const commandRef = useRef<'idle' | CommandKind>('idle');
  const [command, setCommand] = useState<'idle' | CommandKind>('idle');
  useEffect(() => {
    ownerAliveRef.current = true;
    return () => {
      ownerAliveRef.current = false;
      commandRef.current = 'idle';
    };
  }, []);
  const begin = (next: CommandKind) => {
    if (!ownerAliveRef.current || commandRef.current !== 'idle') return false;
    // State publishes availability; the ref closes same-tick admission before React renders.
    commandRef.current = next;
    setCommand(next);
    return true;
  };
  const end = () => {
    commandRef.current = 'idle';
    if (ownerAliveRef.current) setCommand('idle');
  };
  return {
    command,
    begin,
    end,
    isLocked: () => commandRef.current !== 'idle',
    isOwnerAlive: () => ownerAliveRef.current
  };
}

export type AlertGroupCommandGate = ReturnType<typeof useAlertGroupCommandGate>;
type DraftSetter = Dispatch<SetStateAction<AlertGroupDraft | null>>;
type FailureSetter = Dispatch<SetStateAction<AlertGroupFailure | undefined>>;

function useAlertGroupDetailLoader(
  gate: AlertGroupCommandGate,
  setDraft: DraftSetter,
  setEditorFailure: FailureSetter
) {
  const [detail, setDetail] = useState<AlertGroupDetailState>({ kind: 'idle' });
  const detailEpochRef = useRef(0);
  const pendingDetailRef = useRef<{ id: number; epoch: number; promise: Promise<void> } | undefined>(undefined);
  useEffect(() => {
    return () => {
      detailEpochRef.current += 1;
      pendingDetailRef.current = undefined;
    };
  }, []);
  const invalidateDetail = () => {
    if (!gate.isOwnerAlive()) return;
    detailEpochRef.current += 1;
    pendingDetailRef.current = undefined;
    setDetail({ kind: 'idle' });
  };
  const edit = (id: number): Promise<void> => {
    if (!gate.isOwnerAlive() || gate.isLocked()) return Promise.resolve();
    if (pendingDetailRef.current?.id === id) return pendingDetailRef.current.promise;
    const epoch = detailEpochRef.current + 1;
    detailEpochRef.current = epoch;
    setDetail({ kind: 'loading', id });
    const promise = (async () => {
      try {
        const record = await loadAlertGroup(id);
        if (!gate.isOwnerAlive() || detailEpochRef.current !== epoch) return;
        requireExactAlertGroupId(record.id, id);
        setDraft(alertGroupDraftFromDetail(record));
        setEditorFailure(undefined);
        setDetail({ kind: 'idle' });
      } catch (reason) {
        if (gate.isOwnerAlive() && detailEpochRef.current === epoch) {
          setDetail({ kind: classifyAlertGroupReadError(reason), id });
        }
      } finally {
        if (pendingDetailRef.current?.epoch === epoch) pendingDetailRef.current = undefined;
      }
    })();
    // Registration is synchronous; awaited detail work cannot publish before this owner exists.
    pendingDetailRef.current = { id, epoch, promise };
    return promise;
  };
  const retryDetail = () => (detail.kind === 'idle' ? Promise.resolve() : edit(detail.id));
  return { detail, edit, retryDetail, invalidateDetail };
}

export function useAlertGroupEditor(gate: AlertGroupCommandGate) {
  const [draft, setDraft] = useState<AlertGroupDraft | null>(null);
  const [editorFailure, setEditorFailure] = useState<AlertGroupFailure>();
  const [createProof, setCreateProof] = useState<AlertGroupCreateProof | null>(null);
  const [createProofFailure, setCreateProofFailure] = useState<'unavailable' | 'error'>();
  const detailController = useAlertGroupDetailLoader(gate, setDraft, setEditorFailure);
  const clearCreateProof = () => {
    setCreateProof(null);
    setCreateProofFailure(undefined);
  };
  const create = () => {
    if (gate.isLocked()) return;
    detailController.invalidateDetail();
    clearCreateProof();
    setDraft(createAlertGroupDraft());
    setEditorFailure(undefined);
  };
  const closeDraft = () => {
    if (gate.isLocked()) return;
    detailController.invalidateDetail();
    clearCreateProof();
    setDraft(null);
  };
  const updateDraft = (patch: Partial<AlertGroupDraft>) => {
    if (gate.isLocked() || createProof) return;
    setDraft(current => (current ? { ...current, ...patch } : current));
  };
  const edit = (id: number) => {
    if (gate.isLocked()) return Promise.resolve();
    clearCreateProof();
    return detailController.edit(id);
  };
  return {
    draft,
    detail: detailController.detail,
    editorFailure,
    createProof,
    createAcknowledged: createProof !== null,
    createProofFailure,
    setDraft,
    setEditorFailure,
    acknowledgeCreate: setCreateProof,
    setCreateProofFailure,
    clearCreateProof,
    invalidateDetail: detailController.invalidateDetail,
    actions: { create, edit, retryDetail: detailController.retryDetail, closeDraft, updateDraft }
  };
}

export type AlertGroupEditor = ReturnType<typeof useAlertGroupEditor>;
