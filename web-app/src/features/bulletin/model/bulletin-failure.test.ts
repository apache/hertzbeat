/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import { BulletinRequestFailure, classifyBulletinFailure, isBulletinWriteRejection } from './bulletin-failure';

describe('Bulletin domain failure evidence', () => {
  it('does not trust transport-shaped objects as domain evidence', () => {
    const arbitrary = { status: 422, statusCode: 503, kind: 'unavailable', writeOutcome: 'rejected' };

    expect(classifyBulletinFailure(arbitrary)).toBe('error');
    expect(isBulletinWriteRejection(arbitrary)).toBe(false);
  });

  it('trusts only typed redacted failures', () => {
    const rejected = new BulletinRequestFailure('error', 'rejected');
    const unavailable = new BulletinRequestFailure('unavailable', 'uncertain');

    expect(isBulletinWriteRejection(rejected)).toBe(true);
    expect(isBulletinWriteRejection(unavailable)).toBe(false);
    expect(classifyBulletinFailure(unavailable)).toBe('unavailable');
    expect(JSON.stringify(unavailable)).not.toContain('private');
  });
});
