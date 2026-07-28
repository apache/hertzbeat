/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import { systemConfigActionCapabilities } from './system-config-action-capability';

describe('System Config action capabilities', () => {
  it.each([
    [[], false],
    [['GUEST'], false],
    [['USER'], false],
    [['ADMIN'], true],
    [['USER', 'ADMIN'], true]
  ] as const)('derives ADMIN-only configuration for %j', (roles, canConfigure) => {
    expect(systemConfigActionCapabilities(roles)).toEqual({ canConfigure });
  });
});
