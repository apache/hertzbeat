/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import { ApiMessageError } from '@/core/http/api-message';

import {
  isExplicitLabelTransportRejection,
  LabelTransportFailure,
  normalizeLabelTransportFailure
} from './label-api-failure';

describe('Label API failure evidence', () => {
  it.each([
    ['timeout response', new ApiMessageError('private timeout', { status: 408 })],
    [
      'cause-bearing client response',
      new ApiMessageError('private client failure', { status: 409, cause: new Error('private cause') })
    ],
    ['business envelope', new ApiMessageError('private business failure', { status: 200, code: 20 })]
  ])('keeps %s write evidence uncertain and redacted', (_label, reason) => {
    const failure = normalizeLabelTransportFailure(reason);

    expect(failure).toBeInstanceOf(LabelTransportFailure);
    expect(isExplicitLabelTransportRejection(failure)).toBe(false);
    expect(JSON.stringify(failure)).not.toContain('private');
  });

  it.each([400, 404, 409, 422])('accepts source HTTP %s as an explicit prewrite rejection', status => {
    const failure = normalizeLabelTransportFailure(new ApiMessageError('private rejection', { status }));

    expect(failure).toMatchObject({ kind: 'rejected', status });
    expect(isExplicitLabelTransportRejection(failure)).toBe(true);
  });

  it.each([401, 403])('keeps HTTP %s permission evidence distinct and redacted', status => {
    const failure = normalizeLabelTransportFailure(new ApiMessageError('private permission detail', { status }));

    expect(failure).toMatchObject({ kind: 'permission', status, message: 'Label request failed' });
    expect(isExplicitLabelTransportRejection(failure)).toBe(true);
    expect(JSON.stringify(failure)).not.toContain('private');
  });
});
