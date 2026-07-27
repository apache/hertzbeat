/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import { alertCapabilities, canRetryAlertCenterRecovery, hasAlertCenterRowActions } from './alert-capability-model';

describe('alert capability model', () => {
  it.each([
    [['ADMIN'], { canUpdateStatus: true, canDeleteGroups: true, canSelect: true }],
    [['USER'], { canUpdateStatus: true, canDeleteGroups: false, canSelect: true }],
    [['GUEST'], { canUpdateStatus: false, canDeleteGroups: false, canSelect: false }],
    [[], { canUpdateStatus: false, canDeleteGroups: false, canSelect: false }]
  ] as const)('matches the shipped Alert Center policy for roles %s', (roles, expected) => {
    expect(alertCapabilities(roles)).toEqual(expected);
  });

  it('admits recovery by its retained operation kind', () => {
    const user = alertCapabilities(['USER']);
    expect(
      canRetryAlertCenterRecovery(user, {
        kind: 'status',
        action: 'resolve',
        ids: [7],
        status: 'resolved',
        phase: 'proof',
        failure: 'error'
      })
    ).toBe(true);
    expect(
      canRetryAlertCenterRecovery(user, {
        kind: 'delete',
        ids: [7],
        phase: 'proof',
        failure: 'error'
      })
    ).toBe(false);
  });

  it('derives row action availability from admitted row commands', () => {
    expect(
      hasAlertCenterRowActions({
        canUpdateStatus: true,
        canDeleteGroups: false
      })
    ).toBe(true);
    expect(
      hasAlertCenterRowActions({
        canUpdateStatus: false,
        canDeleteGroups: false
      })
    ).toBe(false);
  });
});
