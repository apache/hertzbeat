/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';

import type { NoticeReceiverOption } from '../../notice-receiver/model/notice-receiver-model';
import type { NoticeTemplate } from '../../notice-template-model';
import {
  createNoticeRuleDraft,
  noticeRuleDraftFromDetail,
  type NoticeRule,
  type NoticeRuleDraft
} from '../model/notice-rule-model';
import { noticeRuleReceiverPatch } from '../model/notice-rule-delivery-model';
import { noticeRuleFailureKind, type NoticeRuleDetailState } from '../model/notice-rule-failure';
import type { NoticeRuleOperationReceipt, NoticeRuleOperationRecovery } from '../model/notice-rule-operation-state';

type Command = 'saving' | 'deleting' | 'toggling';
type MutableReference<T> = { current: T };

export function useNoticeRuleCommandGate() {
  const ownerAliveRef = useRef(false);
  const commandRef = useRef<'idle' | Command>('idle');
  const receiptRef = useRef<NoticeRuleOperationReceipt | undefined>(undefined);
  const [command, setCommand] = useState<'idle' | 'recovering' | Command>('idle');
  const [togglingRuleId, setTogglingRuleId] = useState<number | null>(null);
  const [recovery, setRecovery] = useState<NoticeRuleOperationRecovery>();
  useCommandGateLifetime(ownerAliveRef, commandRef, receiptRef);
  const begin = (next: Command, ruleId: number | null = null) => {
    // React state is not synchronous; the ref closes the same-tick command race.
    if (!ownerAliveRef.current || commandRef.current !== 'idle' || receiptRef.current) return false;
    commandRef.current = next;
    setCommand(next);
    setTogglingRuleId(ruleId);
    return true;
  };
  const beginRecovery = () => {
    const receipt = receiptRef.current;
    if (!ownerAliveRef.current || commandRef.current !== 'idle' || !receipt || receipt.phase === 'commit-uncertain') {
      return undefined;
    }
    const next = receipt.kind === 'delete' ? 'deleting' : receipt.kind === 'toggle' ? 'toggling' : 'saving';
    commandRef.current = next;
    setCommand(next);
    setTogglingRuleId(receipt.kind === 'toggle' ? receipt.id : null);
    return receipt;
  };
  const retain = (receipt: NoticeRuleOperationReceipt) => {
    if (ownerAliveRef.current && commandRef.current !== 'idle') receiptRef.current = receipt;
  };
  const clear = () => {
    receiptRef.current = undefined;
    if (ownerAliveRef.current) setRecovery(undefined);
  };
  const markRecovery = (failure: NoticeRuleOperationRecovery['failure']) => {
    publishRecovery(ownerAliveRef.current, receiptRef.current, failure, setRecovery);
  };
  const end = () => {
    commandRef.current = 'idle';
    if (ownerAliveRef.current) {
      setCommand(receiptRef.current ? 'recovering' : 'idle');
      setTogglingRuleId(null);
    }
  };
  return {
    command,
    togglingRuleId,
    recovery,
    begin,
    beginRecovery,
    retain,
    clear,
    markRecovery,
    end,
    isLocked: () => commandRef.current !== 'idle' || receiptRef.current !== undefined,
    isOwnerAlive: () => ownerAliveRef.current
  };
}

function useCommandGateLifetime(
  ownerAliveRef: MutableReference<boolean>,
  commandRef: MutableReference<'idle' | Command>,
  receiptRef: MutableReference<NoticeRuleOperationReceipt | undefined>
) {
  useEffect(() => {
    ownerAliveRef.current = true;
    return () => {
      ownerAliveRef.current = false;
      commandRef.current = 'idle';
      receiptRef.current = undefined;
    };
  }, [commandRef, ownerAliveRef, receiptRef]);
}

function publishRecovery(
  ownerAlive: boolean,
  receipt: NoticeRuleOperationReceipt | undefined,
  failure: NoticeRuleOperationRecovery['failure'],
  publish: Dispatch<SetStateAction<NoticeRuleOperationRecovery | undefined>>
) {
  if (!ownerAlive || !receipt || receipt.phase === 'write') return;
  if (receipt.phase === 'commit-uncertain') {
    publish({ kind: receipt.kind, phase: receipt.phase, failure: 'commit-uncertain', retryable: false });
  } else if (failure !== 'commit-uncertain') {
    publish({ kind: receipt.kind, phase: receipt.phase, failure, retryable: true });
  }
}

export type NoticeRuleCommandGate = ReturnType<typeof useNoticeRuleCommandGate>;

type NoticeRuleEditorOptions = {
  ready: boolean;
  receivers: NoticeReceiverOption[];
  templates: NoticeTemplate[];
};

export function useNoticeRuleEditorController(
  gate: NoticeRuleCommandGate,
  options: NoticeRuleEditorOptions,
  loadDetail: (id: number) => Promise<NoticeRule>
) {
  const [draft, setDraft] = useState<NoticeRuleDraft | null>(null);
  const detail = useNoticeRuleDetail({ gate, loadDetail, setDraft });
  const edit = (id: number) => {
    if (!options.ready) return Promise.resolve();
    return detail.edit(id);
  };
  const create = () => {
    if (gate.isLocked() || !options.ready) return;
    detail.invalidate();
    setDraft(createNoticeRuleDraft());
  };
  const close = () => {
    if (gate.isLocked()) return;
    detail.invalidate();
    setDraft(null);
  };
  const updateDraft = (patch: Partial<NoticeRuleDraft>) => {
    if (gate.isLocked()) return;
    setDraft(current => (current ? { ...current, ...patch } : null));
  };
  const selectReceivers = (receiverIds: number[]) => {
    if (gate.isLocked()) return;
    setDraft(current =>
      current
        ? {
            ...current,
            ...noticeRuleReceiverPatch(current, receiverIds, options.receivers, options.templates)
          }
        : null
    );
  };
  return {
    draft,
    detail: detail.state,
    setDraft,
    invalidateDetail: detail.invalidate,
    actions: { close, create, edit, retryDetail: detail.retry, selectReceivers, updateDraft }
  };
}

function useNoticeRuleDetail({
  gate,
  loadDetail,
  setDraft
}: {
  gate: NoticeRuleCommandGate;
  loadDetail: (id: number) => Promise<NoticeRule>;
  setDraft: Dispatch<SetStateAction<NoticeRuleDraft | null>>;
}) {
  const [state, setState] = useState<NoticeRuleDetailState>({ kind: 'idle' });
  const detailEpochRef = useRef(0);
  const pendingDetailRef = useRef<{ id: number; epoch: number; promise: Promise<void> } | undefined>(undefined);
  useEffect(() => {
    return () => {
      detailEpochRef.current += 1;
      pendingDetailRef.current = undefined;
    };
  }, []);
  const invalidate = () => {
    detailEpochRef.current += 1;
    pendingDetailRef.current = undefined;
    if (gate.isOwnerAlive()) setState({ kind: 'idle' });
  };
  const edit = (id: number): Promise<void> => {
    if (gate.isLocked()) return Promise.resolve();
    if (pendingDetailRef.current?.id === id) return pendingDetailRef.current.promise;
    const epoch = detailEpochRef.current + 1;
    detailEpochRef.current = epoch;
    // Retire another identity before its draft can be submitted while this detail is pending.
    setDraft(current => (current?.id === id ? current : null));
    // Publish the new identity before its transport can synchronously start.
    setState({ kind: 'loading', id });
    const promise = (async () => {
      try {
        const detail = await loadDetail(id);
        // Only the newest epoch may publish detail into the editor.
        if (!gate.isOwnerAlive() || detailEpochRef.current !== epoch) return;
        setState({ kind: 'idle' });
        setDraft(noticeRuleDraftFromDetail(detail));
      } catch (reason) {
        if (gate.isOwnerAlive() && detailEpochRef.current === epoch) {
          setState({ kind: noticeRuleFailureKind(reason), id });
        }
      } finally {
        if (pendingDetailRef.current?.epoch === epoch) pendingDetailRef.current = undefined;
      }
    })();
    pendingDetailRef.current = { id, epoch, promise };
    return promise;
  };
  return { state, edit, retry: () => (state.kind === 'idle' ? Promise.resolve() : edit(state.id)), invalidate };
}

export type NoticeRuleEditorController = ReturnType<typeof useNoticeRuleEditorController>;
