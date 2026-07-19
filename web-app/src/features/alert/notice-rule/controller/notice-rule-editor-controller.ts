/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useRef, useState } from 'react';

import type { NoticeReceiverOption } from '../../notice-receiver/model/notice-receiver-model';
import type { NoticeTemplate } from '../../notice-template-model';
import {
  createNoticeRuleDraft,
  noticeRuleDraftFromDetail,
  type NoticeRule,
  type NoticeRuleDraft
} from '../model/notice-rule-model';
import { noticeRuleReceiverPatch } from '../model/notice-rule-delivery-model';

type Command = 'saving' | 'deleting' | 'toggling';

export function useNoticeRuleCommandGate() {
  const commandRef = useRef<'idle' | Command>('idle');
  const [command, setCommand] = useState<'idle' | Command>('idle');
  const [togglingRuleId, setTogglingRuleId] = useState<number | null>(null);
  const begin = (next: Command, ruleId: number | null = null) => {
    // React state is not synchronous; the ref closes the same-tick command race.
    if (commandRef.current !== 'idle') return false;
    commandRef.current = next;
    setCommand(next);
    setTogglingRuleId(ruleId);
    return true;
  };
  const end = () => {
    commandRef.current = 'idle';
    setCommand('idle');
    setTogglingRuleId(null);
  };
  return { command, togglingRuleId, begin, end, isLocked: () => commandRef.current !== 'idle' };
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
  loadDetail: (id: number) => Promise<NoticeRule>,
  reportReadFailure: (reason: unknown) => void
) {
  const [draft, setDraft] = useState<NoticeRuleDraft | null>(null);
  const detail = useNoticeRuleDetail({ gate, loadDetail, reportReadFailure, setDraft });
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
    setDraft,
    invalidateDetail: detail.invalidate,
    actions: { close, create, edit, selectReceivers, updateDraft }
  };
}

function useNoticeRuleDetail({
  gate,
  loadDetail,
  reportReadFailure,
  setDraft
}: {
  gate: NoticeRuleCommandGate;
  loadDetail: (id: number) => Promise<NoticeRule>;
  reportReadFailure: (reason: unknown) => void;
  setDraft: (draft: NoticeRuleDraft | null) => void;
}) {
  const detailEpochRef = useRef(0);
  const pendingDetailRef = useRef<{ id: number; epoch: number; promise: Promise<void> } | undefined>(undefined);
  const invalidate = () => {
    detailEpochRef.current += 1;
    pendingDetailRef.current = undefined;
  };
  const edit = (id: number): Promise<void> => {
    if (gate.isLocked()) return Promise.resolve();
    if (pendingDetailRef.current?.id === id) return pendingDetailRef.current.promise;
    const epoch = detailEpochRef.current + 1;
    detailEpochRef.current = epoch;
    const promise = (async () => {
      try {
        const detail = await loadDetail(id);
        // Only the newest epoch may publish detail into the editor.
        if (detailEpochRef.current !== epoch) return;
        setDraft(noticeRuleDraftFromDetail(detail));
      } catch (reason) {
        if (detailEpochRef.current === epoch) reportReadFailure(reason);
      } finally {
        if (pendingDetailRef.current?.epoch === epoch) pendingDetailRef.current = undefined;
      }
    })();
    pendingDetailRef.current = { id, epoch, promise };
    return promise;
  };
  return { edit, invalidate };
}

export type NoticeRuleEditorController = ReturnType<typeof useNoticeRuleEditorController>;
