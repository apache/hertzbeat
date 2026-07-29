/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';

import type { NoticeReceiverOption } from '../../notice-receiver/model/notice-receiver-model';
import type { NoticeTemplate } from '../../model/notice-template-model';
import {
  createNoticeRuleDraft,
  noticeRuleDraftFromDetail,
  type NoticeRule,
  type NoticeRuleDraft
} from '../model/notice-rule-model';
import { noticeRuleReceiverPatch } from '../model/notice-rule-delivery-model';
import { noticeRuleFailureKind, type NoticeRuleDetailState } from '../model/notice-rule-failure';
import type { NoticeRuleActionCapabilities } from '../model/notice-rule-action-capability';
import { canPersistNoticeRule } from './notice-rule-action-admission';
import type { NoticeRuleCommandGate } from './notice-rule-command-gate';

type NoticeRuleEditorOptions = {
  ready: boolean;
  receivers: NoticeReceiverOption[];
  templates: NoticeTemplate[];
};

export function useNoticeRuleEditorController({
  capabilities,
  gate,
  loadDetail,
  options
}: {
  capabilities: NoticeRuleActionCapabilities;
  gate: NoticeRuleCommandGate;
  loadDetail: (id: number) => Promise<NoticeRule>;
  options: NoticeRuleEditorOptions;
}) {
  const [draft, setDraft] = useState<NoticeRuleDraft | null>(null);
  const detail = useNoticeRuleDetail({ gate, loadDetail, setDraft });
  const edit = (id: number) => {
    if (!capabilities.canEdit || !options.ready) return Promise.resolve();
    return detail.edit(id);
  };
  const create = () => {
    if (!capabilities.canCreate || gate.isLocked() || !options.ready) return;
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
  const retireUnauthorized = (capabilities: NoticeRuleActionCapabilities) => {
    if (!capabilities.canEdit) detail.invalidate();
    setDraft(current => (canPersistNoticeRule(capabilities, current) ? current : null));
  };
  return {
    draft,
    detail: detail.state,
    setDraft,
    invalidateDetail: detail.invalidate,
    retireUnauthorized,
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
    if (gate.isMounted()) setState({ kind: 'idle' });
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
        if (!gate.isMounted() || detailEpochRef.current !== epoch) return;
        setState({ kind: 'idle' });
        setDraft(noticeRuleDraftFromDetail(detail));
      } catch (reason) {
        if (gate.isMounted() && detailEpochRef.current === epoch) {
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
