/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { expect, it } from 'vitest';
import { parseLogTransactions, validLogTransactionMode } from './explore-log-transactions';
import { buildExplorePath, parseExploreQuery } from './explore-model';
import { parseSavedExploreQuery } from './explore-saved-query-schema';
import { buildSignalApiPath } from '../api/explore-api';
import { buildSubmissionPatch, draftFromQuery } from './explore-submission-model';
const descriptor = { version: 1, field: 'attribute:request.id', limit: 20, order: 'related-count-desc' };
const logTransactions = JSON.stringify(descriptor);
const query = {
  signal: 'logs' as const,
  timeRange: 'last-30m' as const,
  severityCategory: 'ERROR',
  logAggregation: 'transactions',
  logTransactions
};
it('requires an explicit valid identity configuration only for active Transactions', () => {
  expect(parseLogTransactions(logTransactions)).toEqual(descriptor);
  expect(validLogTransactionMode(undefined, undefined)).toBe(true);
  expect(validLogTransactionMode('fields', logTransactions)).toBe(true);
  expect(validLogTransactionMode('transactions', undefined)).toBe(false);
  expect(validLogTransactionMode('transactions', logTransactions)).toBe(true);
  expect(validLogTransactionMode('patterns', undefined)).toBe(true);
  expect(parseSavedExploreQuery({ ...query, logAggregation: 'patterns', logTransactions: undefined })).toHaveProperty(
    'logAggregation',
    'patterns'
  );
  expect(validLogTransactionMode('patterns', 'broken')).toBe(false);
  expect(validLogTransactionMode('unknown', logTransactions)).toBe(false);
});
it('rejects malformed descriptors without silently treating them as raw logs', () => {
  for (const change of [
    { version: 2 },
    { field: 'builtin:serviceName' },
    { field: 'resource:workspace.id' },
    { limit: 0 },
    { limit: 101 },
    { order: 'seed-count-desc' },
    { extra: true }
  ]) {
    expect(parseLogTransactions(JSON.stringify({ ...descriptor, ...change }))).toBeUndefined();
  }
  expect(
    parseLogTransactions('{"version":1,"version":1,"field":"attribute:id","limit":20,"order":"related-count-desc"}')
  ).toBeUndefined();
  expect(validLogTransactionMode('fields', 'broken')).toBe(false);
});
it('preserves active mode and dormant field analysis across URL, save and submission', () => {
  const saved = {
    ...query,
    logAnalysis: JSON.stringify({
      version: 1,
      representation: 'logs',
      field: 'builtin:serviceName',
      limit: 20,
      order: 'count-desc',
      minCount: 1
    })
  };
  const canonical = { ...query, severityCategory: undefined, query: 'status:"ERROR"', searchSyntax: 'structured-v1' };
  const reopened = parseExploreQuery(new URL(buildExplorePath(query), 'http://local').searchParams);
  const savedQuery = parseSavedExploreQuery(query);
  expect(reopened).toMatchObject(canonical);
  expect(savedQuery).toMatchObject(canonical);
  if (!savedQuery) throw new Error('Expected restored query');
  expect(buildSignalApiPath(savedQuery, 10_000_000)).toBe(buildSignalApiPath(reopened, 10_000_000));
  const draft = draftFromQuery(query);
  expect(draft).toMatchObject({ logAggregation: 'transactions', logTransactions });
  expect(buildSubmissionPatch(draft)).toMatchObject({
    valid: true,
    patch: { logAggregation: 'transactions', logTransactions }
  });
  expect(parseExploreQuery(new URL(buildExplorePath(saved), 'http://local').searchParams)).toHaveProperty(
    'logAnalysis',
    saved.logAnalysis
  );
});
it('keeps invalid route text visible but blocks submission and saved records', () => {
  const invalid = parseExploreQuery(
    new URLSearchParams('signal=logs&logAggregation=transactions&logTransactions=broken')
  );
  expect(invalid).toMatchObject({ logAggregation: 'transactions', logTransactions: 'broken' });
  expect(buildSubmissionPatch(draftFromQuery(invalid))).toMatchObject({ valid: false });
  expect(parseSavedExploreQuery({ ...query, logTransactions: 'broken' })).toBeUndefined();
  expect(parseSavedExploreQuery({ ...query, live: true })).toBeUndefined();
});

it('does not export active transactions as a raw-log dashboard', async () => {
  const { buildExploreDashboardHandoff } = await import('./explore-dashboard-handoff');
  expect(
    buildExploreDashboardHandoff(query, {
      timeWindow: { from: 1000, to: 2000 },
      timeZone: 'UTC',
      title: 'Transactions',
      dashboardKey: 'proof'
    })
  ).toMatchObject({ state: 'unsupported', reason: 'log-transactions' });
});

it('blocks direct API scope construction for invalid or live transaction routes', async () => {
  const { buildSignalApiPath } = await import('../api/explore-api');
  for (const value of [
    { ...query, logTransactions: 'broken' },
    { ...query, logAggregation: 'unknown' },
    { ...query, live: true }
  ])
    expect(() => buildSignalApiPath(value)).toThrow();
});
