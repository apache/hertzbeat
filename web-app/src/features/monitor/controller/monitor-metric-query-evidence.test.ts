/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import { ApiMessageError } from '@/core/http/api-message';

import { catalogEvidence, favoriteEvidence, metricEvidence } from './monitor-metric-query-evidence';

const settledWithoutData = { isPending: false, isError: false, error: null, data: undefined };

describe('monitor metric query evidence', () => {
  it('does not turn a missing successful payload into ready or empty evidence', () => {
    expect(catalogEvidence(settledWithoutData, [])).toEqual({ kind: 'error', options: [] });
    expect(favoriteEvidence(settledWithoutData, 'summary.value')).toEqual({ kind: 'error' });
    expect(metricEvidence(settledWithoutData, () => [])).toEqual({ kind: 'error', rows: [] });
  });

  it('preserves the embedded catalog only as an explicit request fallback', () => {
    const query = {
      isPending: false,
      isError: true,
      error: new ApiMessageError('offline', { status: 503 }),
      data: undefined
    };

    expect(catalogEvidence(query, [{ name: 'summary', favorited: false }])).toEqual({
      kind: 'fallback',
      options: [],
      references: ['summary']
    });
  });

  it('exposes payloads only after a successful read', () => {
    const query = { isPending: false, isError: false, error: null, data: ['summary.value'] };

    expect(favoriteEvidence(query, 'summary.value')).toEqual({ kind: 'ready', value: true });
    expect(metricEvidence(query, values => values)).toEqual({ kind: 'ready', rows: ['summary.value'] });
  });
});
