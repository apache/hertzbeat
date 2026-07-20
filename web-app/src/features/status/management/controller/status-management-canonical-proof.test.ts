/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import { StatusRequestFailure } from '../../shared/status-error-model';
import { isAmbiguousStatusWriteFailure } from './status-management-canonical-proof';

describe('Status canonical proof failure boundary', () => {
  it('uses stable write outcomes without transport knowledge', () => {
    expect(isAmbiguousStatusWriteFailure(new StatusRequestFailure('error', 'rejected'))).toBe(false);
    expect(isAmbiguousStatusWriteFailure(new StatusRequestFailure('unavailable', 'uncertain'))).toBe(true);
    expect(isAmbiguousStatusWriteFailure(new Error('domain failure'))).toBe(true);
  });
});
