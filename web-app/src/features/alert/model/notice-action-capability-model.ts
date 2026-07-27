/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

const noticeWriteRoles = new Set(['ADMIN', 'USER']);
const noticeDeleteRoles = new Set(['ADMIN']);

export type NoticeActionCapabilities = {
  canCreate: boolean;
  canEdit: boolean;
  canTest: boolean;
  canDelete: boolean;
};

export type NoticeActionKind = 'create' | 'edit' | 'test' | 'delete';

export function noticeActionCapabilities(roles: readonly string[]): NoticeActionCapabilities {
  const canMutate = hasAnyRole(roles, noticeWriteRoles);
  return {
    canCreate: canMutate,
    canEdit: canMutate,
    canTest: canMutate,
    canDelete: hasAnyRole(roles, noticeDeleteRoles)
  };
}

export function canPerformNoticeAction(capabilities: NoticeActionCapabilities, kind: NoticeActionKind | undefined) {
  switch (kind) {
    case 'create':
      return capabilities.canCreate;
    case 'edit':
      return capabilities.canEdit;
    case 'test':
      return capabilities.canTest;
    case 'delete':
      return capabilities.canDelete;
    default:
      return false;
  }
}

function hasAnyRole(roles: readonly string[], permitted: ReadonlySet<string>) {
  return roles.some(role => permitted.has(role));
}
