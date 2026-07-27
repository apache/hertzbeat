/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import { ApiMessageError } from '@/core/http/api-message';
import { RuntimeStatusContractError } from './runtime-status-schema';
import { classifyRuntimeStatusRequestFailure } from './runtime-status-api-failure';

describe('runtime status request failure boundary', () => {
  it.each([
    ['expired session', new ApiMessageError('private', { status: 401 }), 'permission'],
    ['forbidden session', new ApiMessageError('private', { status: 403 }), 'permission'],
    ['transport unavailable', new ApiMessageError('private'), 'unavailable'],
    ['server unavailable', new ApiMessageError('private', { status: 503 }), 'unavailable'],
    ['invalid contract', new RuntimeStatusContractError(), 'contract'],
    ['unclassified failure', new Error('private'), 'error']
  ] as const)('classifies %s without exposing error content', (_label, error, expected) => {
    expect(classifyRuntimeStatusRequestFailure(error)).toBe(expected);
  });
});
