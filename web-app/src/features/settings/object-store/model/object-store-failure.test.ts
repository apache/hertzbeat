/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import {
  ObjectStoreRequestFailure,
  classifyObjectStoreReadFailure,
  isObjectStoreWriteRejection
} from './object-store-failure';

describe('Object Store domain failure evidence', () => {
  it('does not trust arbitrary transport-shaped objects', () => {
    const arbitrary = {
      statusCode: 503,
      httpStatus: 400,
      kind: 'http',
      secretKey: 'private-secret'
    };

    expect(classifyObjectStoreReadFailure(arbitrary)).toBe('error');
    expect(isObjectStoreWriteRejection(arbitrary)).toBe(false);
  });

  it('trusts only typed redacted domain evidence', () => {
    const unavailable = new ObjectStoreRequestFailure('unavailable', 'uncertain');
    const rejected = new ObjectStoreRequestFailure('invalid', 'rejected');

    expect(classifyObjectStoreReadFailure(unavailable)).toBe('unavailable');
    expect(isObjectStoreWriteRejection(rejected)).toBe(true);
    expect(isObjectStoreWriteRejection(unavailable)).toBe(false);
    expect(JSON.stringify(unavailable)).not.toContain('secret');
  });
});
