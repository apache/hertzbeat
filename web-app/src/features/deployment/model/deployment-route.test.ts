/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import { readDeploymentRoute, writeDeploymentRoute } from './deployment-route';

describe('deployment route state', () => {
  it('round-trips only a safe non-secret operation identity', () => {
    const route = readDeploymentRoute(new URLSearchParams('operationId=migration-01_A.b'));

    expect(route).toEqual({ operationId: 'migration-01_A.b', invalid: false });
    expect(writeDeploymentRoute(route.operationId).toString()).toBe('operationId=migration-01_A.b');
  });

  it.each([
    'operationId=',
    'operationId=../../private',
    `operationId=${'a'.repeat(129)}`,
    'operationId=one&operationId=two',
    'operationId=valid&password=private'
  ])('rejects and canonicalizes unsafe or ambiguous query state: %s', source => {
    expect(readDeploymentRoute(new URLSearchParams(source))).toEqual({ operationId: null, invalid: true });
    expect(writeDeploymentRoute(null).toString()).toBe('');
  });
});
