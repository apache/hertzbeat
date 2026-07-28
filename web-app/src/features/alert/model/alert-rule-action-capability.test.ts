/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import { alertRuleActionCapabilities } from './alert-rule-action-capability';

describe('alertRuleActionCapabilities', () => {
  it.each([
    [['ADMIN'], { canWrite: true, canDelete: true }],
    [['USER'], { canWrite: true, canDelete: false }],
    [['GUEST'], { canWrite: false, canDelete: false }],
    [[], { canWrite: false, canDelete: false }]
  ])('maps Sureness roles %j to alert-rule action admission', (roles, expected) => {
    expect(alertRuleActionCapabilities(roles)).toEqual(expected);
  });
});
