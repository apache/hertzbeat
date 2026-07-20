/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import { NoticeTemplateRequestFailure } from '../model/notice-template-failure';
import { isDefiniteWriteRejection } from './notice-template-write-rejection';

describe('Notice Template write rejection', () => {
  it('trusts only typed domain evidence', () => {
    expect(isDefiniteWriteRejection(new NoticeTemplateRequestFailure('invalid', 'rejected'))).toBe(true);
    expect(isDefiniteWriteRejection({ statusCode: 400, httpStatus: 400, kind: 'http' })).toBe(false);
  });
});
