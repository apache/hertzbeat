/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import { canPerformNoticeAction, noticeActionCapabilities } from './notice-action-capability-model';

describe('Notice action capability model', () => {
  it.each([
    [['ADMIN'], { canCreate: true, canEdit: true, canTest: true, canDelete: true }],
    [['USER'], { canCreate: true, canEdit: true, canTest: true, canDelete: false }],
    [['GUEST'], { canCreate: false, canEdit: false, canTest: false, canDelete: false }],
    [[], { canCreate: false, canEdit: false, canTest: false, canDelete: false }]
  ] as const)('matches the shipped Notice action policy for roles %s', (roles, expected) => {
    expect(noticeActionCapabilities(roles)).toEqual(expected);
  });

  it('admits retained retries according to their operation kind', () => {
    const user = noticeActionCapabilities(['USER']);
    expect(canPerformNoticeAction(user, 'create')).toBe(true);
    expect(canPerformNoticeAction(user, 'edit')).toBe(true);
    expect(canPerformNoticeAction(user, 'test')).toBe(true);
    expect(canPerformNoticeAction(user, 'delete')).toBe(false);
    expect(canPerformNoticeAction(user, undefined)).toBe(false);
  });
});
