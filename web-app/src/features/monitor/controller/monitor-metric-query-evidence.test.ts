/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import { ApiMessageError } from '@/core/http/api-message';

import {
  catalogEvidence,
  favoriteCollectionEvidence,
  favoriteEvidence,
  metricEvidence
} from './monitor-metric-query-evidence';

const settledWithoutData = { isPending: false, isError: false, error: null, data: undefined };

describe('monitor metric query evidence', () => {
  it('does not turn a missing successful payload into ready or empty evidence', () => {
    expect(catalogEvidence(settledWithoutData, [])).toEqual({ kind: 'error', options: [] });
    expect(favoriteEvidence(settledWithoutData, { key: 'summary.value', group: 'summary', field: 'value' })).toEqual({
      kind: 'error'
    });
    expect(favoriteCollectionEvidence(settledWithoutData, [])).toEqual({ kind: 'error' });
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

    expect(favoriteEvidence(query, { key: 'summary.value', group: 'summary', field: 'value' })).toEqual({
      kind: 'ready',
      value: true,
      token: 'summary.value'
    });
    expect(
      favoriteCollectionEvidence(query, [
        { key: 'summary.value', group: 'summary', field: 'value' },
        { key: 'summary.latency', group: 'summary', field: 'latency' }
      ])
    ).toEqual({
      kind: 'ready',
      items: [{ key: 'summary.value', available: true }]
    });
    expect(metricEvidence(query, values => values)).toEqual({ kind: 'ready', rows: ['summary.value'] });
  });

  it('keeps unresolved favorite tokens visible without presenting them as queryable metrics', () => {
    const query = {
      isPending: false,
      isError: false,
      error: null,
      data: ['retired.value', 'retired.value', 'summary.value']
    };

    expect(favoriteCollectionEvidence(query, [{ key: 'summary.value', group: 'summary', field: 'value' }])).toEqual({
      kind: 'ready',
      items: [
        { key: 'retired.value', available: false },
        { key: 'summary.value', available: true }
      ]
    });
  });

  it('resolves legacy group and field favorite tokens to current numeric metrics', () => {
    const query = { isPending: false, isError: false, error: null, data: ['summary', 'latency'] };

    expect(
      favoriteCollectionEvidence(query, [
        { key: 'summary.value', group: 'summary', field: 'value' },
        { key: 'summary.latency', group: 'summary', field: 'latency' },
        { key: 'network.latency', group: 'network', field: 'latency' }
      ])
    ).toEqual({
      kind: 'ready',
      items: [
        { key: 'summary.value', available: true },
        { key: 'summary.latency', available: true },
        { key: 'network.latency', available: true }
      ]
    });
    expect(favoriteEvidence(query, { key: 'summary.value', group: 'summary', field: 'value' })).toEqual({
      kind: 'ready',
      value: true,
      token: 'summary'
    });
  });
});
