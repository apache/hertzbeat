/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useEffect } from 'react';

import {
  canPerformNoticeAction,
  type NoticeActionCapabilities,
  type NoticeActionKind
} from '../../model/notice-action-capability-model';
import { canSubmitNoticeReceiver, noticeReceiverReceiptAction } from './notice-receiver-action-admission';
import type { NoticeReceiverEditorController } from './use-notice-receiver-editor-controller';
import type { NoticeReceiverOperationController } from './use-notice-receiver-operation-controller';

type NoticeReceiverRoleLossRetirementOptions = {
  capabilities: NoticeActionCapabilities;
  editor: NoticeReceiverEditorController;
  operation: NoticeReceiverOperationController;
};

export function useNoticeReceiverRoleLossRetirement({
  capabilities,
  editor,
  operation
}: NoticeReceiverRoleLossRetirementOptions) {
  useEffect(() => {
    const draft = editor.controls.getDraft();
    const action = activeAction(operation, draft);
    const operationInaccessible = action !== undefined && !canPerformNoticeAction(capabilities, action);
    const editorInaccessible = draft !== null && !canSubmitNoticeReceiver(capabilities, draft);
    const detailInaccessible = !capabilities.canEdit;
    if (!operationInaccessible && !editorInaccessible && !detailInaccessible) return;

    // Role loss retires ownership before late write, proof, or detail results can republish inaccessible state.
    if (operationInaccessible) operation.retire();
    if (detailInaccessible) editor.controls.invalidateDetail();
    if (editorInaccessible) {
      editor.controls.setDraft(null);
    }
  }, [capabilities, editor, operation, operation.command]);
}

function activeAction(
  operation: NoticeReceiverOperationController,
  draft: ReturnType<NoticeReceiverEditorController['controls']['getDraft']>
): NoticeActionKind | undefined {
  const retained = noticeReceiverReceiptAction(operation.getReceipt());
  if (retained) return retained;
  if (operation.command === 'saving' && draft) return draft.id === undefined ? 'create' : 'edit';
  if (operation.command === 'testing') return 'test';
  if (operation.command === 'removing') return 'delete';
  return undefined;
}
