/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import { alertActionCapabilities } from './alert-action-capability';

describe('shared Alert action capabilities', () => {
  it.each([
    [['ADMIN'], { canWrite: true, canDelete: true }],
    [['USER'], { canWrite: true, canDelete: false }],
    [['GUEST'], { canWrite: false, canDelete: false }],
    [[], { canWrite: false, canDelete: false }]
  ])('maps shipped /api/alert/** Sureness roles %j', (roles, expected) => {
    expect(alertActionCapabilities(roles)).toEqual(expected);
  });
});
