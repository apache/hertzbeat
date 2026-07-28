/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import { messageServerActionCapabilities } from './message-server-action-capability';

describe('Message Server action capability', () => {
  it.each([
    [['ADMIN'], true],
    [['USER'], false],
    [['GUEST'], false],
    [[], false]
  ] as const)('maps session roles %s to ADMIN-only configuration', (roles, canConfigure) => {
    expect(messageServerActionCapabilities(roles)).toEqual({ canConfigure });
  });
});
