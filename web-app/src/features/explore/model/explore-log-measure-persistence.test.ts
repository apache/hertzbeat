/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { expect, it } from 'vitest';
import { DEFAULT_LOG_ANALYSIS, encodeLogAnalysis, parseLogAnalysis } from '@/platform/perses';
import { buildSavedQueryPayload, readSavedQuery } from './explore-saved-query-model';
import { logAnalysisDrilldownPath } from './explore-log-analysis-navigation';
import { parseExploreQuery } from './explore-url-model';
const measure = { function: 'avg' as const, field: 'attribute:duration' };
const query = {
  signal: 'logs' as const,
  timeRange: 'last-30m' as const,
  query: 'a OR b',
  logAnalysis: encodeLogAnalysis({
    ...DEFAULT_LOG_ANALYSIS,
    representation: 'toplist',
    field: 'attribute:status',
    measure,
    order: 'measure-desc'
  })
};
it('migrates saved toplist to Logs while retaining its measure and group scope', () => {
  const migratedAnalysis = encodeLogAnalysis({
    ...parseLogAnalysis(query.logAnalysis),
    representation: 'logs'
  });
  const saved = readSavedQuery(buildSavedQueryPayload(query, 'measure-proof', 'Measure proof', ''));
  expect(saved).toMatchObject({
    kind: 'ready',
    query: { ...query, query: '"a OR b"', searchSyntax: 'structured-v1', logAnalysis: migratedAnalysis }
  });
  if (saved.kind !== 'ready' || saved.query.signal !== 'logs') throw new Error('Expected saved Logs query');
  expect(parseLogAnalysis(saved.query.logAnalysis!)).toMatchObject({ measure, representation: 'logs' });
  const path = logAnalysisDrilldownPath(
    query,
    { from: 1000, to: 2000 },
    { id: 'attribute:status', source: 'attribute', key: 'status' },
    { kind: 'value', value: 'ok', count: 9, buckets: [], measurement: { state: 'ready', sampleCount: 2, value: 5 } }
  );
  const target = parseExploreQuery(new URLSearchParams(path!.split('?')[1]));
  expect(target).toMatchObject({ query: '"a OR b"', searchSyntax: 'structured-v1' });
  if (target.signal !== 'logs') throw new Error('Expected logs');
  expect(JSON.parse(target.logGroupSelection!).groups).toEqual([
    { field: 'attribute:status', kind: 'value', value: 'ok' }
  ]);
  expect(target.returnTo).toBeUndefined();
  expect(parseLogAnalysis(target.logAnalysis!)).toEqual(DEFAULT_LOG_ANALYSIS);
});
it('preserves SUM throughput through saved queries and exact drilldown return', () => {
  const rateQuery = {
    ...query,
    logAnalysis: encodeLogAnalysis({
      ...DEFAULT_LOG_ANALYSIS,
      representation: 'timeseries',
      field: 'attribute:status',
      measure: { function: 'sum', field: 'attribute:duration' },
      transform: 'throughput',
      order: 'measure-desc'
    })
  };
  const normalizedRateQuery = { ...rateQuery, query: '"a OR b"', searchSyntax: 'structured-v1' };
  expect(readSavedQuery(buildSavedQueryPayload(rateQuery, 'sum-rate', 'SUM rate', ''))).toMatchObject({
    kind: 'ready',
    query: normalizedRateQuery
  });
  const path = logAnalysisDrilldownPath(
    rateQuery,
    { from: 1000, to: 2000 },
    { id: 'attribute:status', source: 'attribute', key: 'status' },
    { kind: 'value', value: 'ok', count: 9, buckets: [] }
  );
  const target = parseExploreQuery(new URLSearchParams(path!.split('?')[1]));
  if (target.signal !== 'logs') throw new Error('Expected logs');
  expect(parseLogAnalysis(target.logAnalysis!)).toEqual(DEFAULT_LOG_ANALYSIS);
  const back = parseExploreQuery(new URLSearchParams(target.returnTo!.split('?')[1]));
  expect(back).toMatchObject({
    logAnalysis: rateQuery.logAnalysis,
    start: 1000,
    end: 2000,
    query: '"a OR b"',
    searchSyntax: 'structured-v1'
  });
});
