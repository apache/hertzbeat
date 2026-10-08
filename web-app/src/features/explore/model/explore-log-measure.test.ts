/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { expect, it } from 'vitest';
import { DEFAULT_LOG_ANALYSIS, parseLogAnalysis, logAnalysisResultSchema } from '@/platform/perses';
const measure = { function: 'avg', field: 'attribute:duration' };
const result = {
  window: { start: 1000, end: 2000 },
  field: null,
  view: 'groups',
  limit: 20,
  order: 'measure-desc',
  minCount: 1,
  matchingTotal: 4,
  truncated: false,
  intervalMs: null,
  measure,
  groups: [
    { kind: 'all', value: null, count: 4, buckets: [], measurement: { state: 'ready', sampleCount: 2, value: -3 } }
  ]
};
it('accepts explicit measured state and preserves negative values with fewer samples than matching logs', () => {
  expect(parseLogAnalysis(JSON.stringify({ ...DEFAULT_LOG_ANALYSIS, measure, order: 'measure-desc' }))).toMatchObject({
    measure
  });
  expect(logAnalysisResultSchema.parse(result)).toEqual(result);
});
it('rejects incompatible orders, missing measurement, impossible samples and fake unavailable zero', () => {
  expect(() => parseLogAnalysis(JSON.stringify({ ...DEFAULT_LOG_ANALYSIS, measure }))).toThrow();
  for (const measurement of [
    undefined,
    { state: 'ready', sampleCount: 5, value: 2 },
    { state: 'no_samples', sampleCount: 0, value: 0 },
    { state: 'non_finite', sampleCount: 0, value: null }
  ])
    expect(() =>
      logAnalysisResultSchema.parse({ ...result, groups: [{ ...result.groups[0], measurement }] })
    ).toThrow();
});
it('keeps zero cardinality ready and rejects string measures on numeric functions', () => {
  expect(
    logAnalysisResultSchema.parse({
      ...result,
      measure: { function: 'unique', field: 'builtin:serviceName' },
      groups: [{ ...result.groups[0], measurement: { state: 'ready', sampleCount: 0, value: 0 } }]
    })
  ).toBeDefined();
  expect(() =>
    parseLogAnalysis(
      JSON.stringify({
        ...DEFAULT_LOG_ANALYSIS,
        measure: { function: 'avg', field: 'builtin:serviceName' },
        order: 'measure-desc'
      })
    )
  ).toThrow();
});
it('normalizes explicit count and rejects bucket sample totals inconsistent with the group', () => {
  expect(
    parseLogAnalysis(JSON.stringify({ ...DEFAULT_LOG_ANALYSIS, measure: { function: 'count' } })).measure
  ).toBeUndefined();
  expect(() =>
    logAnalysisResultSchema.parse({
      ...result,
      view: 'timeseries',
      intervalMs: 1000,
      groups: [
        {
          ...result.groups[0],
          buckets: [{ start: 1000, count: 4, measurement: { state: 'ready', sampleCount: 1, value: 2 } }]
        }
      ]
    })
  ).toThrow();
});
