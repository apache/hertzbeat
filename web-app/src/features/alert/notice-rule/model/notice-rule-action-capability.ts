/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { noticeActionCapabilities, type NoticeActionCapabilities } from '../../model/notice-action-capability-model';

export type NoticeRuleActionCapabilities = {
  canCreate: boolean;
  canEdit: boolean;
  canToggle: boolean;
  canDelete: boolean;
};

export type NoticeRuleActionKind = 'create' | 'edit' | 'toggle' | 'delete';

export function noticeRuleActionCapabilities(roles: readonly string[]): NoticeRuleActionCapabilities {
  return noticeRuleCapabilitiesFromNoticePolicy(noticeActionCapabilities(roles));
}

export function noticeRuleCapabilitiesFromNoticePolicy(
  capabilities: NoticeActionCapabilities
): NoticeRuleActionCapabilities {
  return {
    canCreate: capabilities.canCreate,
    canEdit: capabilities.canEdit,
    canToggle: capabilities.canEdit,
    canDelete: capabilities.canDelete
  };
}

export function canPerformNoticeRuleAction(
  capabilities: NoticeRuleActionCapabilities,
  kind: NoticeRuleActionKind | undefined
) {
  switch (kind) {
    case 'create':
      return capabilities.canCreate;
    case 'edit':
      return capabilities.canEdit;
    case 'toggle':
      return capabilities.canToggle;
    case 'delete':
      return capabilities.canDelete;
    default:
      return false;
  }
}
