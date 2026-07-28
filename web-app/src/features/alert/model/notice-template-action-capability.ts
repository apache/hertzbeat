/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { noticeActionCapabilities, type NoticeActionCapabilities } from './notice-action-capability-model';

export type NoticeTemplateActionCapabilities = {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
};

export type NoticeTemplateActionKind = 'create' | 'edit' | 'delete';

export function noticeTemplateActionCapabilities(roles: readonly string[]): NoticeTemplateActionCapabilities {
  return noticeTemplateCapabilitiesFromNoticePolicy(noticeActionCapabilities(roles));
}

export function noticeTemplateCapabilitiesFromNoticePolicy(
  capabilities: NoticeActionCapabilities
): NoticeTemplateActionCapabilities {
  return {
    canCreate: capabilities.canCreate,
    canEdit: capabilities.canEdit,
    canDelete: capabilities.canDelete
  };
}

export function canPerformNoticeTemplateAction(
  capabilities: NoticeTemplateActionCapabilities,
  action: NoticeTemplateActionKind | undefined
) {
  switch (action) {
    case 'create':
      return capabilities.canCreate;
    case 'edit':
      return capabilities.canEdit;
    case 'delete':
      return capabilities.canDelete;
    default:
      return false;
  }
}
