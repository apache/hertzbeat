/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { expect, it, vi } from 'vitest';
import { DEFAULT_LOG_ANALYSIS, addLogFormula, migrateLogQuerySet } from '@/platform/perses';
import { logRepresentationChange, applyLogRepresentationChange } from './explore-log-representation-change';

it('applies a representation switch once from committed analysis without including an unfinished search draft', () => {
  const applied = JSON.stringify({ ...DEFAULT_LOG_ANALYSIS, representation: 'logs' as const });
  const apply = vi.fn(() => true);
  expect(applyLogRepresentationChange(applied, 'table', apply)).toBe(true);
  expect(apply).toHaveBeenCalledExactlyOnceWith({
    logAnalysis: JSON.stringify({ ...DEFAULT_LOG_ANALYSIS, representation: 'table' })
  });
});

it('keeps an unsubmitted Add formula and hidden source in the representation draft', () => {
  const draft = JSON.stringify({
    ...DEFAULT_LOG_ANALYSIS,
    representation: 'timeseries',
    comparison: { version: 1, formula: 'a * 2', hidden: ['a'] }
  });
  const next = logRepresentationChange(undefined, draft, 'table');
  expect(next.pending).toBe(true);
  expect(JSON.parse(next.value)).toMatchObject({
    representation: 'table',
    comparison: { formula: 'a * 2', hidden: ['a'] }
  });
});
it('does not restore a removed formula when switching back to Logs before Query', () => {
  const applied = JSON.stringify({
    ...DEFAULT_LOG_ANALYSIS,
    representation: 'timeseries',
    comparison: { version: 1, formula: 'a' }
  });
  const draft = JSON.stringify({ ...DEFAULT_LOG_ANALYSIS, representation: 'timeseries' });
  const next = logRepresentationChange(applied, draft, 'logs');
  expect(next.pending).toBe(true);
  expect(JSON.parse(next.value)).not.toHaveProperty('comparison');
});

it('unwraps an eligible final-formula query into the ordinary Logs search', () => {
  const querySet = {
    ...addLogFormula(migrateLogQuerySet(DEFAULT_LOG_ANALYSIS, 'service:api', 'structured-v1')),
    formulas: []
  };
  const draft = JSON.stringify({ ...DEFAULT_LOG_ANALYSIS, representation: 'timeseries', querySet });
  const next = logRepresentationChange(draft, draft, 'logs');
  expect(next.pending).toBe(false);
  expect(JSON.parse(next.value)).not.toHaveProperty('querySet');
  expect(next.query).toBe('service:api');
  expect(next.searchSyntax).toBe('structured-v1');
});

it('keeps multi-query query sets in their advanced model when switching to Logs', () => {
  const querySet = { ...addLogFormula(migrateLogQuerySet(DEFAULT_LOG_ANALYSIS, 'service:api')), formulas: [] };
  const withB = {
    ...querySet,
    queries: [...querySet.queries, { ...querySet.queries[0]!, refId: 'b', alias: 'b' }],
    nextSourceOrdinal: 2
  };
  const draft = JSON.stringify({ ...DEFAULT_LOG_ANALYSIS, representation: 'timeseries', querySet: withB });
  const next = logRepresentationChange(draft, draft, 'logs');
  expect(next).not.toHaveProperty('query');
  expect(JSON.parse(next.value)).toHaveProperty('querySet.queries', withB.queries);
});
