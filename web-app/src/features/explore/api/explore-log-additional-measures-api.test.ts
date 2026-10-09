/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { expect, it, vi } from 'vitest';
import { DEFAULT_LOG_ANALYSIS, loadLogAnalysis, loadLogComparison } from '@/platform/perses';

import { buildLogComparisonRequest } from './explore-log-comparison-api';
const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('@/core/http/api-message', () => ({ apiMessageGet: get, apiMessagePostWithErrorEnvelope: post }));
const additionalMeasures = [
  { function: 'avg' as const, field: 'attribute:duration' },
  { function: 'unique' as const, field: 'builtin:serviceName' }
];
const analysis = { ...DEFAULT_LOG_ANALYSIS, representation: 'table' as const, additionalMeasures };
const window = { from: 1000, to: 2000 };
const metadata = { field: null, view: 'groups', limit: 20, order: 'count-desc', minCount: 1, additionalMeasures };
const base = {
  ...metadata,
  window: { start: 1000, end: 2000 },
  matchingTotal: 0,
  truncated: false,
  intervalMs: null,
  groups: []
};
it('requires exact ordered extra metadata even when single results are empty', async () => {
  for (const echoed of [undefined, [...additionalMeasures].reverse(), additionalMeasures.slice(0, 1)]) {
    get.mockResolvedValue({ ...base, additionalMeasures: echoed });
    await expect(loadLogAnalysis('path', window, analysis)).rejects.toThrow();
  }
  get.mockResolvedValue(base);
  await expect(loadLogAnalysis('path', window, analysis)).resolves.toHaveProperty(
    'additionalMeasures',
    additionalMeasures
  );
  await expect(loadLogAnalysis('path', window, { ...analysis, representation: 'toplist' })).rejects.toThrow();
});
it('validates each extra value against its descriptor and raw population', async () => {
  const values = [
    { state: 'ready', value: 2.5, sampleCount: 2 },
    { state: 'ready', value: 1, sampleCount: 2 }
  ];
  const response = {
    ...base,
    matchingTotal: 2,
    groups: [{ kind: 'all', value: null, count: 2, buckets: [], additionalMeasurements: values }]
  };
  get.mockResolvedValue(response);
  await expect(loadLogAnalysis('path', window, analysis)).resolves.toHaveProperty('groups');
  for (const additionalMeasurements of [
    undefined,
    values.slice(0, 1),
    [{ ...values[0], sampleCount: 3 }, values[1]],
    [...values].reverse()
  ]) {
    get.mockResolvedValue({ ...response, groups: [{ ...response.groups[0], additionalMeasurements }] });
    await expect(loadLogAnalysis('path', window, analysis)).rejects.toThrow();
  }
});
it('validates paired missing-b extras and rejects missing or foreign empty echoes atomically', async () => {
  const paired = { ...analysis, comparison: { version: 1 as const, search: '', formula: 'a/b' } };
  const request = buildLogComparisonRequest({ signal: 'logs', timeRange: 'last-30m' }, window, paired);
  const response = {
    window: base.window,
    analysis: { ...metadata, measure: null, grouping: null },
    matchingA: 0,
    matchingB: 0,
    intervalMs: null,
    groups: [],
    truncated: false,
    formula: 'a/b'
  };
  post.mockResolvedValue(response);
  await expect(loadLogComparison(request, window, paired)).resolves.toHaveProperty('formula', 'a/b');
  post.mockResolvedValue({ ...response, analysis: { ...response.analysis, additionalMeasures: undefined } });
  await expect(loadLogComparison(request, window, paired)).rejects.toThrow();
  const group = {
    keys: [],
    a: {
      count: 1,
      additionalMeasurements: [
        { state: 'ready', value: 1, sampleCount: 1 },
        { state: 'ready', value: 1, sampleCount: 1 }
      ]
    },
    b: {
      count: 0,
      additionalMeasurements: [
        { state: 'no_samples', value: null, sampleCount: 0 },
        { state: 'ready', value: 0, sampleCount: 0 }
      ]
    },
    buckets: []
  };
  post.mockResolvedValue({ ...response, matchingA: 1, groups: [group] });
  await expect(loadLogComparison(request, window, paired)).resolves.toHaveProperty('matchingB', 0);
  post.mockResolvedValue({ ...response, matchingA: 1, groups: [{ ...group, b: { count: 0 } }] });
  await expect(loadLogComparison(request, window, paired)).rejects.toThrow();
});
