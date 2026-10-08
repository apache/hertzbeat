/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { TFunction } from 'i18next';
import { logGroupingFieldLabel } from './explore-log-grouping';
import { expect, it } from 'vitest';
import { DEFAULT_LOG_ANALYSIS, parseLogAnalysis, logAnalysisResultSchema } from '@/platform/perses';
const grouping = {
  version: 1,
  dimensions: [
    { field: 'attribute:a', limit: 5 },
    { field: 'attribute:b', limit: 4 }
  ]
};
it('accepts ordered grouping with derived product and rejects competing legacy controls', () => {
  expect(
    parseLogAnalysis(JSON.stringify({ ...DEFAULT_LOG_ANALYSIS, representation: 'table', grouping }))
  ).toHaveProperty('grouping', grouping);
  for (const patch of [
    { field: 'attribute:a' },
    { limit: 19 },
    { representation: 'toplist' },
    {
      grouping: {
        version: 1,
        dimensions: [
          { field: 'attribute:a', limit: 11 },
          { field: 'attribute:b', limit: 10 }
        ]
      }
    }
  ])
    expect(() =>
      parseLogAnalysis(JSON.stringify({ ...DEFAULT_LOG_ANALYSIS, representation: 'table', grouping, ...patch }))
    ).toThrow();
});
it('validates ordered tuple keys rather than joined labels or legacy kind/value', () => {
  const keys = [
    { field: 'attribute:a', kind: 'value', value: 'a / b' },
    { field: 'attribute:b', kind: 'value', value: 'c' }
  ];
  const result = {
    window: { start: 1000, end: 2000 },
    field: null,
    grouping,
    view: 'groups',
    limit: 20,
    order: 'count-desc',
    minCount: 1,
    matchingTotal: 2,
    truncated: false,
    intervalMs: null,
    groups: [{ kind: null, value: null, keys, count: 2, buckets: [] }]
  };
  expect(logAnalysisResultSchema.parse(result)).toEqual(result);
  expect(() =>
    logAnalysisResultSchema.parse({ ...result, groups: [{ ...result.groups[0], keys: [...keys].reverse() }] })
  ).toThrow();
});
it('keeps scalar tuple identity distinct when display labels would collide', async () => {
  const { groupIdentity } = await import('@/platform/perses');
  const keys = (a: string, b: string) => [
    { field: 'attribute:a', kind: 'value' as const, value: a },
    { field: 'attribute:b', kind: 'value' as const, value: b }
  ];
  expect(groupIdentity({ kind: null, value: null, keys: keys('a / b', 'c') })).not.toBe(
    groupIdentity({ kind: null, value: null, keys: keys('a', 'b / c') })
  );
});
it('preserves four-field grouping in saved state and exact drilldown return with all keys', async () => {
  const { encodeLogAnalysis } = await import('@/platform/perses');
  const { buildSavedQueryPayload, readSavedQuery } = await import('./explore-saved-query-model');
  const { logAnalysisDrilldownPath } = await import('./explore-log-analysis-navigation');
  const { parseExploreQuery } = await import('./explore-url-model');
  const dimensions = ['a', 'b', 'c', 'd'].map(field => ({ field: `attribute:${field}`, limit: 2 }));
  const query = {
    signal: 'logs' as const,
    timeRange: 'last-30m' as const,
    searchSyntax: 'structured-v1' as const,
    query: 'a OR b',
    logAnalysis: encodeLogAnalysis({
      ...DEFAULT_LOG_ANALYSIS,
      representation: 'timeseries',
      limit: 16,
      grouping: { version: 1, dimensions }
    })
  };
  const saved = readSavedQuery(buildSavedQueryPayload(query, 'tuple-proof', 'Tuple proof', ''));
  expect(saved.kind).toBe('ready');
  if (saved.kind !== 'ready' || saved.query.signal !== 'logs') throw new Error('Expected saved Logs query');
  expect(saved.query).toMatchObject(query);
  expect(parseLogAnalysis(saved.query.logAnalysis!)).toMatchObject({
    representation: 'timeseries',
    limit: 16,
    grouping: { version: 1, dimensions }
  });
  const keys = dimensions.map(item => ({ field: item.field, kind: 'value' as const, value: '2.0' }));
  const path = logAnalysisDrilldownPath(query, { from: 1000, to: 2000 }, null, {
    kind: null,
    value: null,
    keys,
    count: 3,
    buckets: []
  });
  const target = parseExploreQuery(new URLSearchParams(path!.split('?')[1]));
  if (target.signal !== 'logs') throw new Error('Expected logs');
  expect(target.query).toBe('a OR b');
  expect(JSON.parse(target.logGroupSelection!).groups).toEqual(keys);
  const returned = parseExploreQuery(new URLSearchParams(target.returnTo!.split('?')[1]));
  expect(returned).toMatchObject({ query: 'a OR b', searchSyntax: 'structured-v1', start: 1000, end: 2000 });
  if (returned.signal !== 'logs') throw new Error('Expected Logs return');
  expect(parseLogAnalysis(returned.logAnalysis!)).toMatchObject({
    representation: 'timeseries',
    limit: 16,
    grouping: { version: 1, dimensions }
  });
});

it('localizes common built-in grouping identifiers and preserves custom field paths', () => {
  const t = ((key: string) => key) as TFunction;
  for (const field of ['serviceName', 'environment', 'severityCategory']) {
    expect(logGroupingFieldLabel(`builtin:${field}`, t)).toBe(`explore.logFacets.builtin.${field}`);
  }
  expect(logGroupingFieldLabel('attribute:serviceName', t)).toBe('attribute:serviceName');
});
