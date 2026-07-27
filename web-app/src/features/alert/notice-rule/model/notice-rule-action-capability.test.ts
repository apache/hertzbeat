/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import { canPerformNoticeRuleAction, noticeRuleActionCapabilities } from './notice-rule-action-capability';

describe('Notice rule action capability model', () => {
  it.each([
    [['ADMIN'], { canCreate: true, canEdit: true, canToggle: true, canDelete: true }],
    [['USER'], { canCreate: true, canEdit: true, canToggle: true, canDelete: false }],
    [['GUEST'], { canCreate: false, canEdit: false, canToggle: false, canDelete: false }],
    [[], { canCreate: false, canEdit: false, canToggle: false, canDelete: false }]
  ] as const)('maps roles %s to rule-specific actions', (roles, expected) => {
    expect(noticeRuleActionCapabilities(roles)).toEqual(expected);
  });

  it('admits retained retries by their exact original rule action', () => {
    const user = noticeRuleActionCapabilities(['USER']);
    expect(canPerformNoticeRuleAction(user, 'create')).toBe(true);
    expect(canPerformNoticeRuleAction(user, 'edit')).toBe(true);
    expect(canPerformNoticeRuleAction(user, 'toggle')).toBe(true);
    expect(canPerformNoticeRuleAction(user, 'delete')).toBe(false);
    expect(canPerformNoticeRuleAction(user, undefined)).toBe(false);
  });
});
