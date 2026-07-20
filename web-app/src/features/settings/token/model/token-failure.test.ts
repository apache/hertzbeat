/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import { TokenRequestFailure, classifyTokenCollectionFailure, isTokenWriteRejection } from './token-failure';

describe('Token domain failure evidence', () => {
  it('does not infer list state or write safety from arbitrary transport-shaped objects', () => {
    const arbitrary = { statusCode: 503, httpStatus: 400, kind: 'http', token: 'private-token' };

    expect(classifyTokenCollectionFailure(arbitrary)).toBe('error');
    expect(isTokenWriteRejection(arbitrary)).toBe(false);
  });

  it('trusts only typed domain evidence', () => {
    const unavailable = new TokenRequestFailure('unavailable', 'uncertain');
    const rejected = new TokenRequestFailure('invalid', 'rejected');

    expect(classifyTokenCollectionFailure(unavailable)).toBe('unavailable');
    expect(isTokenWriteRejection(rejected)).toBe(true);
    expect(isTokenWriteRejection(unavailable)).toBe(false);
  });
});
