/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import { entityCapabilities } from './entity-capability-model';

describe('entity capabilities', () => {
  it.each([
    [['ADMIN'], { canWrite: true, canDelete: true }],
    [['USER'], { canWrite: true, canDelete: false }],
    [['GUEST'], { canWrite: false, canDelete: false }],
    [[], { canWrite: false, canDelete: false }]
  ] as const)('maps session roles %s to write and delete admission', (roles, expected) => {
    expect(entityCapabilities(roles)).toEqual(expected);
  });
});
