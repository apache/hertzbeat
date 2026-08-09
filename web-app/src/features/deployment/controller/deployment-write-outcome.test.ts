/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import { DeploymentRequestError } from '../api/deployment-api';
import { deploymentWriteOutcome } from './deployment-write-outcome';

describe('deployment write outcome', () => {
  it.each([
    [new DeploymentRequestError('http', 409, 'operation_conflict'), 'definite_rejection'],
    [new DeploymentRequestError('http', 408), 'uncertain'],
    [new DeploymentRequestError('http', 500), 'uncertain'],
    [new DeploymentRequestError('unavailable'), 'uncertain'],
    [new DeploymentRequestError('contract'), 'uncertain']
  ] as const)('classifies receipt evidence without inspecting raw content', (failure, expected) => {
    expect(deploymentWriteOutcome(failure)).toBe(expected);
  });
});
