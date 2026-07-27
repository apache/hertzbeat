/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import { canPersistNoticeRule, canPerformRetainedNoticeRuleAction } from './notice-rule-action-admission';

const administrator = { canCreate: true, canEdit: true, canToggle: true, canDelete: true };
const user = { canCreate: true, canEdit: true, canToggle: true, canDelete: false };

describe('Notice rule action admission', () => {
  it('distinguishes create from edit using the persisted draft identity', () => {
    expect(canPersistNoticeRule(administrator, {})).toBe(true);
    expect(canPersistNoticeRule(user, { id: 31 })).toBe(true);
    expect(canPersistNoticeRule({ ...user, canCreate: false }, {})).toBe(false);
    expect(canPersistNoticeRule({ ...user, canEdit: false }, { id: 31 })).toBe(false);
    expect(canPersistNoticeRule(user, null)).toBe(false);
  });

  it.each([
    ['create', true],
    ['update', true],
    ['toggle', true],
    ['delete', false]
  ] as const)('admits a retained %s receipt by its original action', (kind, expected) => {
    expect(canPerformRetainedNoticeRuleAction(user, { kind })).toBe(expected);
  });
});
