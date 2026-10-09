/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { describe, expect, it } from 'vitest';
import { draftFromQuery } from './explore-submission-model';
import { addRecentLogSearch, readRecentLogSearches, recentLogSearchKey } from './explore-recent-log-searches';
import { recentLogSearchSummary } from './explore-recent-log-search-summary';
import type { TFunction } from 'i18next';

const draft = (query: string) => draftFromQuery({ signal: 'logs', timeRange: 'last-30m', query });
describe('recent executed log filters', () => {
  it('normalizes duplicates, moves them first, and bounds history', () => {
    let history = addRecentLogSearch([], draft('failure'));
    for (let index = 0; index < 12; index++) history = addRecentLogSearch(history, draft(String(index)));
    expect(history).toHaveLength(10);
    history = addRecentLogSearch(history, draft('  5  '));
    expect(history).toHaveLength(10);
    expect(history[0]?.query).toBe('5');
    expect(history.filter(item => item.query === '5')).toHaveLength(1);
  });
  it('deduplicates after storage decoding regardless of field order', () => {
    const stored = readRecentLogSearches(JSON.stringify(addRecentLogSearch([], draft('failure'))));
    expect(addRecentLogSearch(stored, draft('failure'))).toHaveLength(1);
  });
  it('isolates workspace and account and fails closed for malformed storage', () => {
    expect(recentLogSearchKey('a', 'operator')).not.toBe(recentLogSearchKey('b', 'operator'));
    expect(recentLogSearchKey('a', 'operator')).not.toBe(recentLogSearchKey('a', 'other'));
    expect(readRecentLogSearches('{')).toEqual([]);
    expect(readRecentLogSearches('[{"signal":"logs","query":"bad"}]')).toEqual([]);
    expect(readRecentLogSearches(JSON.stringify([{ ...draft('failure'), executedAt: 1000 }]))).toEqual([
      { ...draft('failure'), executedAt: 1000 }
    ]);
  });
});

it('round trips complete executed analysis and ordering through storage, rejecting malformed descriptors', () => {
  const logAnalysis = JSON.stringify({
    version: 1,
    representation: 'timeseries',
    limit: 20,
    order: 'count-desc',
    minCount: 1,
    comparison: {
      version: 1,
      search: 'status:ERROR',
      searchSyntax: 'structured-v1',
      timeShiftMs: 3600000,
      formula: 'b/a'
    }
  });
  const logSort = JSON.stringify({ version: 1, field: 'attribute:duration', type: 'number', direction: 'desc' });
  const draft = draftFromQuery({ signal: 'logs', timeRange: 'last-30m', query: 'failure', logAnalysis, logSort });
  const record = addRecentLogSearch([], draft, 1000)[0]!;
  expect(readRecentLogSearches(JSON.stringify([record]))[0]).toMatchObject({ logAnalysis, logSort, sort: 'newest' });
  expect(readRecentLogSearches(JSON.stringify([{ ...record, logSort: '{}' }]))).toEqual([]);
  expect(readRecentLogSearches(JSON.stringify([{ ...record, logAnalysis: '{}' }]))).toEqual([]);
  expect(readRecentLogSearches(JSON.stringify([{ ...record, logSort: undefined, sort: 'oldest' }]))[0]).toMatchObject({
    sort: 'oldest'
  });
});
it('preserves executed SUM throughput and additional measures through recent storage', () => {
  const logAnalysis = JSON.stringify({
    version: 1,
    representation: 'timeseries',
    transform: 'throughput',
    measure: { function: 'sum', field: 'attribute:bytes' },
    additionalMeasures: [{ function: 'avg', field: 'attribute:bytes' }],
    limit: 20,
    order: 'measure-desc',
    minCount: 1
  });
  const value = draftFromQuery({ signal: 'logs', timeRange: 'last-30m', query: 'service:checkout', logAnalysis });
  expect(readRecentLogSearches(JSON.stringify(addRecentLogSearch([], value, 1000)))[0]?.logAnalysis).toBe(logAnalysis);
});
it('retains Transactions mode and rejects corrupt identity settings when reading recent queries', () => {
  const logTransactions = JSON.stringify({
    version: 1,
    field: 'attribute:request.id',
    limit: 20,
    order: 'related-count-desc'
  });
  const input = draftFromQuery({
    signal: 'logs',
    timeRange: 'last-30m',
    logAggregation: 'transactions',
    logTransactions
  });
  const stored = addRecentLogSearch([], input, 1000);
  expect(readRecentLogSearches(JSON.stringify(stored))[0]).toMatchObject({
    logAggregation: 'transactions',
    logTransactions
  });
  expect(readRecentLogSearches(JSON.stringify([{ ...stored[0], logTransactions: 'broken' }]))).toEqual([]);
});

it('summarizes v2 outputs without dumping definitions or mislabeling the syntax', () => {
  const logCalculatedV2 = JSON.stringify({
    version: 2,
    nextFieldSeq: 2,
    fields: [{ id: 'c1', kind: 'formula', name: 'durationSeconds', expression: '@duration_ms / 1000' }]
  });
  const entry = addRecentLogSearch(
    [],
    draftFromQuery({ signal: 'logs', timeRange: 'last-30m', searchSyntax: 'structured-v2', logCalculatedV2 }),
    1000
  )[0]!;
  const t = ((key: string) => key) as TFunction;
  const summary = recentLogSearchSummary(entry, t);
  expect(summary).toContain('durationSeconds');
  expect(summary).toContain('explore.logAuthoring.structured');
  expect(summary).not.toContain('unsupportedMode');
  expect(summary).not.toContain('"fields"');
});
