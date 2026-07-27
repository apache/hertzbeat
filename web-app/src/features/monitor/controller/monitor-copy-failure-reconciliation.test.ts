/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import { ApiMessageError } from '@/core/http/api-message';
import { shouldReconcileFailedMonitorCopy } from './monitor-copy-failure-reconciliation';

describe('shouldReconcileFailedMonitorCopy', () => {
  it.each([
    [new ApiMessageError('legacy missing source', { code: 3, status: 200 }), true],
    [new ApiMessageError('not found', { status: 404 }), true],
    [new ApiMessageError('Source monitor was not found.', { code: 2, status: 200 }), false],
    [new Error('not found'), false]
  ])('classifies Copy failure metadata without matching message text', (error, expected) => {
    expect(shouldReconcileFailedMonitorCopy('copy', error)).toBe(expected);
  });

  it('does not reconcile another command even when its error uses the legacy code', () => {
    expect(shouldReconcileFailedMonitorCopy('enable', new ApiMessageError('missing', { code: 3 }))).toBe(false);
  });
});
