/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import {
  canPerformNoticeRuleAction,
  type NoticeRuleActionCapabilities,
  type NoticeRuleActionKind
} from '../model/notice-rule-action-capability';
import type { NoticeRuleDraft } from '../model/notice-rule-model';
import type { NoticeRuleOperationReceipt } from '../model/notice-rule-operation-state';

export function canPersistNoticeRule(
  capabilities: NoticeRuleActionCapabilities,
  draft: Pick<NoticeRuleDraft, 'id'> | null
) {
  if (!draft) return false;
  return canPerformNoticeRuleAction(capabilities, draft.id === undefined ? 'create' : 'edit');
}

export function canPerformRetainedNoticeRuleAction(
  capabilities: NoticeRuleActionCapabilities,
  receipt: Pick<NoticeRuleOperationReceipt, 'kind'> | undefined
) {
  return canPerformNoticeRuleAction(capabilities, retainedAction(receipt));
}

function retainedAction(
  receipt: Pick<NoticeRuleOperationReceipt, 'kind'> | undefined
): NoticeRuleActionKind | undefined {
  if (receipt?.kind === 'update') return 'edit';
  return receipt?.kind;
}
