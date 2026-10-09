/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { expect, it, vi } from 'vitest';
import {
  buildLogTransactionsPath,
  buildLogTransactionDetailPath,
  loadLogTransactions,
  loadLogTransactionDetail
} from './explore-log-transactions-api';
const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/core/http/api-message', () => ({ apiMessageGet: get }));
const state = { version: 1 as const, field: 'attribute:request.id', limit: 20, order: 'related-count-desc' as const };
const window = { from: 1000, to: 2000 };
const query = {
  signal: 'logs' as const,
  timeRange: 'last-30m' as const,
  serviceName: 'checkout',
  severityCategory: 'ERROR',
  query: '  literal:error  ',
  pageIndex: 4,
  logAggregation: 'transactions',
  logTransactions: JSON.stringify(state)
};
const request = { ...state, field: { id: state.field, source: 'attribute', key: 'request.id' } };
const empty = {
  window: { start: 1000, end: 2000 },
  request,
  seedLogCount: 2,
  usableSeedLogCount: 0,
  oversizedSeedLogCount: 1,
  otherExcludedSeedLogCount: 1,
  transactionCount: 0,
  relatedLogCount: 0,
  truncated: false,
  items: []
};
it('keeps original seed and fixed context distinct from identity and local detail search', () => {
  const base = new URL(buildLogTransactionsPath(query, window, state), 'http://local');
  expect(base.pathname).toBe('/api/logs/transactions');
  expect(base.searchParams.get('severityCategory')).toBe('ERROR');
  expect(base.searchParams.get('transactionField')).toBe(state.field);
  expect(base.searchParams.has('pageIndex')).toBe(false);
  const detail = new URL(
    buildLogTransactionDetailPath(query, window, state, {
      identity: "O'Reilly\\x",
      search: 'local:error',
      pageIndex: 2,
      sort: 'oldest'
    }),
    'http://local'
  );
  expect(detail.pathname).toBe('/api/logs/transactions/detail');
  expect(detail.searchParams.get('transactionId')).toBe("O'Reilly\\x");
  expect(detail.searchParams.get('localSearch')).toBe('local:error');
  expect(detail.searchParams.get('search')).toBe(base.searchParams.get('search'));
  expect(detail.searchParams.get('pageIndex')).toBe('2');
});
it('accepts truthful excluded-only evidence and rejects mismatched metadata and counts', async () => {
  get.mockResolvedValue(empty);
  expect(await loadLogTransactions('path', window, state)).toEqual(empty);
  for (const value of [
    { ...empty, seedLogCount: 1 },
    { ...empty, truncated: true },
    { ...empty, window: { start: 999, end: 2000 } },
    { ...empty, request: { ...request, limit: 10 } },
    { ...empty, relatedLogCount: 1 }
  ]) {
    get.mockResolvedValue(value);
    await expect(loadLogTransactions('path', window, state)).rejects.toThrow();
  }
});
it('separates unqualified identity from qualified local no-match and checks echoed identity', async () => {
  const detail = { identity: 'req-1', search: '', pageIndex: 0, sort: 'oldest' as const };
  const response = {
    window: empty.window,
    field: request.field,
    identity: 'req-1',
    qualified: false,
    total: null,
    rows: [],
    offset: 0,
    limit: 20,
    sort: 'oldest'
  };
  get.mockResolvedValue(response);
  expect((await loadLogTransactionDetail('path', window, state, detail)).qualified).toBe(false);
  get.mockResolvedValue({ ...response, qualified: true, total: 0 });
  expect((await loadLogTransactionDetail('path', window, state, detail)).total).toBe(0);
  for (const patch of [{ identity: 'another' }, { total: 0 }, { offset: 20 }, { sort: 'newest' }]) {
    get.mockResolvedValue({ ...response, ...patch });
    await expect(loadLogTransactionDetail('path', window, state, detail)).rejects.toThrow();
  }
});
it('rejects oversized or malformed selected identities before transport', () => {
  for (const identity of ['', 'a'.repeat(1025), '😀'.repeat(513), '\ud800']) {
    expect(() =>
      buildLogTransactionDetailPath(query, window, state, { identity, search: '', pageIndex: 0, sort: 'oldest' })
    ).toThrow();
  }
});

it('validates full-population counts, ranking and lossless observed durations', async () => {
  const row = {
    identity: 'req-1',
    seedCount: 1,
    relatedCount: 3,
    firstTimeUnixNano: '1000000001',
    lastTimeUnixNano: '1999999999',
    durationNanos: '999999998',
    maximumSeverity: 'ERROR'
  };
  const result = {
    ...empty,
    seedLogCount: 1,
    usableSeedLogCount: 1,
    oversizedSeedLogCount: 0,
    otherExcludedSeedLogCount: 0,
    transactionCount: 1,
    relatedLogCount: 3,
    items: [row]
  };
  get.mockResolvedValue(result);
  expect((await loadLogTransactions('path', window, state)).items[0]?.durationNanos).toBe('999999998');
  for (const patch of [
    { durationNanos: '999999999' },
    { lastTimeUnixNano: '2000000001' },
    { firstTimeUnixNano: '0999999999' },
    { identity: 'x'.repeat(1025) },
    { maximumSeverity: 'UNKNOWN' },
    { relatedCount: 0 },
    { durationNanos: 'invalid' }
  ]) {
    get.mockResolvedValue({ ...result, items: [{ ...row, ...patch }] });
    await expect(loadLogTransactions('path', window, state)).rejects.toThrow();
  }
  get.mockResolvedValue({ ...result, items: [{ ...row, maximumSeverity: null }] });
  expect((await loadLogTransactions('path', window, state)).items[0]?.maximumSeverity).toBeNull();
});

it('classifies malformed transaction evidence as a contract failure', async () => {
  const { ExploreSignalContractError } = await import('../model/explore-signal-contract');
  get.mockResolvedValue({ ...empty, seedLogCount: -1 });
  await expect(loadLogTransactions('path', window, state)).rejects.toBeInstanceOf(ExploreSignalContractError);
});
