/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { expect, it } from 'vitest';
import { DEFAULT_LOG_ANALYSIS, encodeLogAnalysis, parseLogAnalysis, logAnalysisResultSchema } from '@/platform/perses';
it('roundtrips analysis without changing the separate legacy log view', () => {
  expect(
    parseLogAnalysis(
      encodeLogAnalysis({ ...DEFAULT_LOG_ANALYSIS, representation: 'toplist', field: 'attribute:http.status_code' })
    )
  ).toEqual({ ...DEFAULT_LOG_ANALYSIS, representation: 'toplist', field: 'attribute:http.status_code' });
  expect(() => parseLogAnalysis('{broken')).toThrow();
  expect(() => parseLogAnalysis(JSON.stringify({ ...DEFAULT_LOG_ANALYSIS, limit: 101 }))).toThrow();
});
const result = {
  window: { start: 1000, end: 2000 },
  field: null,
  view: 'groups',
  limit: 20,
  order: 'count-desc',
  minCount: 1,
  matchingTotal: 4,
  truncated: false,
  intervalMs: null,
  groups: [{ kind: 'all', value: null, count: 4, buckets: [] }]
};
it('rejects impossible population and keeps missing, null and empty distinct', () => {
  expect(logAnalysisResultSchema.parse(result)).toEqual(result);
  expect(() => logAnalysisResultSchema.parse({ ...result, matchingTotal: 3 })).toThrow();
  expect(() =>
    logAnalysisResultSchema.parse({ ...result, groups: [{ ...result.groups[0], kind: 'value', value: null }] })
  ).toThrow();
});
it('accepts the honest first partial epoch bucket and rejects out-of-window evidence', () => {
  const timeline = {
    ...result,
    view: 'timeseries',
    intervalMs: 60_000,
    groups: [{ ...result.groups[0], buckets: [{ start: 0, count: 4 }] }]
  };
  expect(logAnalysisResultSchema.parse(timeline)).toEqual(timeline);
  expect(() =>
    logAnalysisResultSchema.parse({
      ...timeline,
      groups: [{ ...timeline.groups[0], buckets: [{ start: 60_000, count: 4 }] }]
    })
  ).toThrow();
});
