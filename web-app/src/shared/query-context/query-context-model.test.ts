/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import {
  buildSignalHandoffPath,
  mergeQueryContext,
  parseQueryContext,
  queryContextScopeKey,
  scopedQueryKey,
  writeQueryContext
} from './query-context-model';

const checkout = {
  collectorId: 'collector-east',
  serviceName: 'checkout',
  serviceNamespace: 'commerce',
  environment: 'prod',
  instance: 'checkout-7d9',
  endpoint: '/checkout'
};

describe('shared query context model', () => {
  it('round-trips one canonical ordered context while preserving route-owned parameters', () => {
    const source = new URLSearchParams('signal=logs&query=timeout');
    const encoded = writeQueryContext(source, checkout);

    expect(encoded.toString()).toBe(
      'signal=logs&query=timeout&collectorId=collector-east&serviceName=checkout'
      + '&serviceNamespace=commerce&environment=prod&instance=checkout-7d9&endpoint=%2Fcheckout'
    );
    expect(parseQueryContext(encoded)).toEqual(checkout);
  });

  it.each(['token', 'authorization', 'clientSecret', 'password', 'installLog', 'telemetryBody'])(
    'rejects and removes sensitive query field %s', field => {
      const params = new URLSearchParams({ signal: 'traces', [field]: 'must-not-leak' });
      expect(() => writeQueryContext(params, { ...checkout, [field]: 'must-not-leak' })).toThrow(/sensitive/i);
      expect(writeQueryContext(params, checkout).has(field)).toBe(false);
    }
  );

  it('clears every downstream identity when Collector or service changes', () => {
    expect(mergeQueryContext(checkout, { collectorId: 'collector-west' })).toEqual({
      collectorId: 'collector-west'
    });
    expect(mergeQueryContext(checkout, { serviceName: 'payments' })).toEqual({
      collectorId: 'collector-east', serviceName: 'payments'
    });
  });

  it('builds cross-signal handoff with the exact immutable window and no secret surface', () => {
    const path = buildSignalHandoffPath('traces', checkout, { from: 1_000, to: 2_000 });
    expect(path).toBe(
      '/explore?signal=traces&serviceName=checkout&serviceNamespace=commerce&environment=prod'
      + '&collectorId=collector-east&instance=checkout-7d9&endpoint=%2Fcheckout&start=1000&end=2000'
    );
    expect(path).not.toMatch(/token|secret|authorization|log|body/i);
  });

  it('isolates TanStack keys by ordered scope, exact window, and refresh revision', () => {
    const first = scopedQueryKey(['signals', 'logs'], checkout, { from: 1_000, to: 2_000 }, 1);
    const switched = scopedQueryKey(
      ['signals', 'logs'], mergeQueryContext(checkout, { serviceName: 'payments' }),
      { from: 1_000, to: 2_000 }, 1
    );
    const refreshed = scopedQueryKey(['signals', 'logs'], checkout, { from: 1_000, to: 2_000 }, 2);

    expect(first).not.toEqual(switched);
    expect(first).not.toEqual(refreshed);
    expect(queryContextScopeKey(checkout)).toBe(
      'collector-east\u001fcheckout\u001fcommerce\u001fprod\u001fcheckout-7d9\u001f/checkout'
    );
  });
});
