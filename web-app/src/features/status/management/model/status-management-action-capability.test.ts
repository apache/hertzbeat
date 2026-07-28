/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import { statusManagementActionCapabilities } from './status-management-action-capability';

describe('Status management action capabilities', () => {
  it.each([
    [['ADMIN'], { canRead: true, canCreate: true, canUpdate: true, canDelete: true }],
    [['USER'], { canRead: true, canCreate: true, canUpdate: true, canDelete: false }],
    [['GUEST'], { canRead: true, canCreate: false, canUpdate: false, canDelete: false }],
    [[], { canRead: false, canCreate: false, canUpdate: false, canDelete: false }],
    [['UNKNOWN'], { canRead: false, canCreate: false, canUpdate: false, canDelete: false }]
  ])('maps %j to the exact Sureness method policy', (roles, expected) => {
    expect(statusManagementActionCapabilities(roles)).toEqual(expected);
  });
});
