/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import { canPerformNoticeTemplateAction, noticeTemplateActionCapabilities } from './notice-template-action-capability';

describe('Notice Template action capability model', () => {
  it.each([
    [['ADMIN'], { canCreate: true, canEdit: true, canDelete: true }],
    [['USER'], { canCreate: true, canEdit: true, canDelete: false }],
    [['GUEST'], { canCreate: false, canEdit: false, canDelete: false }],
    [[], { canCreate: false, canEdit: false, canDelete: false }]
  ] as const)('maps roles %s to template-specific actions', (roles, expected) => {
    expect(noticeTemplateActionCapabilities(roles)).toEqual(expected);
  });

  it('fails closed for an absent or unknown retained action', () => {
    const administrator = noticeTemplateActionCapabilities(['ADMIN']);
    expect(canPerformNoticeTemplateAction(administrator, undefined)).toBe(false);
  });
});
