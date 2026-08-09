/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import { SetupRequestError } from '../api/setup-api';
import { SetupContractError } from '../api/setup-schema';
import { setupWriteOutcome } from './setup-write-outcome';

describe('setup write outcome', () => {
  it.each([
    ['explicit client rejection', new SetupRequestError('http', 409, 'operation_conflict'), 'definite_rejection'],
    ['request timeout', new SetupRequestError('http', 408), 'uncertain'],
    ['lost response', new SetupRequestError('unavailable'), 'uncertain'],
    ['invalid success response', new SetupContractError(), 'uncertain'],
    ['server failure', new SetupRequestError('http', 500), 'uncertain']
  ] as const)('classifies %s', (_label, failure, expected) => {
    expect(setupWriteOutcome(failure)).toBe(expected);
  });
});
