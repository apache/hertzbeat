/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type { NoticeTemplateRecovery } from '../model/notice-template-command-state';
import {
  canPerformNoticeTemplateAction,
  type NoticeTemplateActionCapabilities,
  type NoticeTemplateActionKind
} from '../model/notice-template-action-capability';
import {
  isNoticeTemplateReadOnly,
  type NoticeTemplateDraft,
  type NoticeTemplateResourceRecord
} from '../notice-template-model';

export function canSubmitNoticeTemplate(
  capabilities: NoticeTemplateActionCapabilities,
  draft: NoticeTemplateDraft | null
) {
  if (!draft) return false;
  return canPerformNoticeTemplateAction(capabilities, noticeTemplateDraftAction(draft));
}

export function noticeTemplateDraftAction(draft: NoticeTemplateDraft): NoticeTemplateActionKind {
  return draft.id === undefined ? 'create' : 'edit';
}

export function canEditNoticeTemplate(
  capabilities: NoticeTemplateActionCapabilities,
  template: NoticeTemplateResourceRecord
) {
  return capabilities.canEdit && !isNoticeTemplateReadOnly(template);
}

export function canDeleteNoticeTemplate(
  capabilities: NoticeTemplateActionCapabilities,
  template: NoticeTemplateResourceRecord
) {
  return capabilities.canDelete && !isNoticeTemplateReadOnly(template);
}

export function canRetryNoticeTemplateOperation(
  capabilities: NoticeTemplateActionCapabilities,
  recovery: NoticeTemplateRecovery | null
) {
  if (!recovery || recovery.stage === 'commit-uncertain') return false;
  return canRetainNoticeTemplateRecovery(capabilities, recovery);
}

export function canRetainNoticeTemplateRecovery(
  capabilities: NoticeTemplateActionCapabilities,
  recovery: NoticeTemplateRecovery | null
) {
  return canPerformNoticeTemplateAction(capabilities, noticeTemplateRecoveryAction(recovery));
}

export function noticeTemplateRecoveryAction(
  recovery: NoticeTemplateRecovery | null
): NoticeTemplateActionKind | undefined {
  switch (recovery?.stage) {
    case 'projection':
      return recovery.action;
    case 'update-proof':
      return 'edit';
    case 'delete-proof':
      return 'delete';
    case 'commit-uncertain':
      return 'create';
    default:
      return undefined;
  }
}
