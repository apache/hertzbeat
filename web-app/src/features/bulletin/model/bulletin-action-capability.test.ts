/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import { bulletinActionCapabilities } from './bulletin-action-capability';

describe('Bulletin action capabilities', () => {
  it.each([
    [['ADMIN'], { canRead: true, canWrite: true, canDelete: true }],
    [['USER'], { canRead: true, canWrite: true, canDelete: false }],
    [['GUEST'], { canRead: true, canWrite: false, canDelete: false }],
    [['UNKNOWN'], { canRead: false, canWrite: false, canDelete: false }],
    [[], { canRead: false, canWrite: false, canDelete: false }]
  ] as const)('maps roles %j to the authoritative matrix', (roles, expected) => {
    expect(bulletinActionCapabilities(roles)).toEqual(expected);
  });
});
