/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import { collectorActionCapabilities } from './collector-action-capability';

describe('Collector action capabilities', () => {
  it.each([
    [['ADMIN'], { canRead: true, canWrite: true, canDelete: true }],
    [['USER'], { canRead: true, canWrite: true, canDelete: false }],
    [['GUEST'], { canRead: true, canWrite: false, canDelete: false }],
    [[], { canRead: false, canWrite: false, canDelete: false }],
    [['UNKNOWN'], { canRead: false, canWrite: false, canDelete: false }]
  ])('maps %j to the exact current Sureness method policy', (roles, expected) => {
    expect(collectorActionCapabilities(roles)).toEqual(expected);
  });
});
