/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import { alertGroupActionCapabilities } from './alert-group-action-capability';

describe('alertGroupActionCapabilities', () => {
  it.each([
    [['ADMIN'], { canWrite: true, canDelete: true }],
    [['USER'], { canWrite: true, canDelete: false }],
    [['GUEST'], { canWrite: false, canDelete: false }],
    [[], { canWrite: false, canDelete: false }]
  ])('maps shipped Sureness roles %j to Alert Group actions', (roles, expected) => {
    expect(alertGroupActionCapabilities(roles)).toEqual(expected);
  });
});
