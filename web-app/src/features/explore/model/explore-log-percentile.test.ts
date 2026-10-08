/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { expect, it } from 'vitest';
import { DEFAULT_LOG_ANALYSIS, encodeLogAnalysis, parseLogAnalysis, validLogMeasurement } from '@/platform/perses';
import { buildSavedQueryPayload, readSavedQuery } from './explore-saved-query-model';
import { buildExplorePath, parseExploreQuery } from './explore-url-model';
import { logComparisonDrilldownPath } from './explore-log-comparison-navigation';

it.each(['p50', 'p75', 'p90', 'p95', 'p98', 'p99'])(
  'preserves %s through paired saved URL and exact drilldown return',
  fn => {
    const raw = JSON.stringify({
      ...DEFAULT_LOG_ANALYSIS,
      representation: 'table',
      field: 'attribute:route',
      order: 'measure-desc',
      measure: { function: fn, field: 'attribute:duration' },
      comparison: { version: 1, search: 'error', formula: 'b/a' }
    });
    const analysis = parseLogAnalysis(raw);
    const query = {
      signal: 'logs' as const,
      timeRange: 'last-30m' as const,
      query: 'request',
      logAnalysis: encodeLogAnalysis(analysis)
    };
    const reopened = parseExploreQuery(new URLSearchParams(buildExplorePath(query).split('?')[1]));
    const migratedAnalysis = encodeLogAnalysis({ ...analysis, representation: 'timeseries' });
    expect(reopened).toMatchObject({
      signal: 'logs',
      timeRange: query.timeRange,
      query: '"request"',
      searchSyntax: 'structured-v1',
      logAnalysis: migratedAnalysis
    });
    expect(readSavedQuery(buildSavedQueryPayload(query, 'quantile', 'Quantile', ''))).toMatchObject({
      kind: 'ready',
      query: { ...query, query: '"request"', searchSyntax: 'structured-v1', logAnalysis: migratedAnalysis }
    });
    const path = logComparisonDrilldownPath(
      query,
      { from: 1000, to: 3000 },
      analysis,
      {
        keys: [{ field: 'attribute:route', kind: 'value', value: '/checkout' }],
        a: { count: 10 },
        b: { count: 3 },
        buckets: []
      },
      'b'
    );
    const target = parseExploreQuery(new URLSearchParams(path!.split('?')[1]));
    const back = parseExploreQuery(new URLSearchParams(target.returnTo!.split('?')[1]));
    expect(back).toMatchObject({
      signal: 'logs',
      timeRange: query.timeRange,
      query: '"request"',
      searchSyntax: 'structured-v1',
      logAnalysis: migratedAnalysis
    });
    expect(validLogMeasurement(analysis.measure, { state: 'no_samples', sampleCount: 0, value: null }, 3)).toBe(true);
    expect(validLogMeasurement(analysis.measure, { state: 'non_finite', sampleCount: 3, value: null }, 3)).toBe(true);
  }
);
it('rejects unapproved percentile functions and builtin numeric fields', () => {
  for (const measure of [
    { function: 'p96', field: 'attribute:duration' },
    { function: 'p95', field: 'builtin:serviceName' }
  ])
    expect(() =>
      parseLogAnalysis(
        JSON.stringify({ ...DEFAULT_LOG_ANALYSIS, representation: 'table', order: 'measure-desc', measure })
      )
    ).toThrow();
});
