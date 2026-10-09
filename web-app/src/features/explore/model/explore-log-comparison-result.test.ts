/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { expect, it } from 'vitest';
import { logComparisonResultSchema } from '@/platform/perses';
const result = {
  window: { start: 1000, end: 62000 },
  analysis: {
    field: null,
    view: 'timeseries',
    limit: 20,
    order: 'count-desc',
    minCount: 1,
    measure: null,
    grouping: null
  },
  matchingA: 3,
  matchingB: 2,
  truncated: false,
  intervalMs: 60000,
  formula: '100*b/a',
  groups: [
    {
      keys: [],
      a: { count: 3 },
      b: { count: 2 },
      buckets: [
        { start: 0, a: { count: 3 }, b: { count: 0 } },
        { start: 60000, a: { count: 0 }, b: { count: 2 } }
      ]
    }
  ]
};
it('accepts complete disjoint paired buckets and proven zero cells', () => {
  expect(logComparisonResultSchema.parse(result)).toEqual(result);
});
it('rejects malformed population, grid, identity, measurement and formula', () => {
  const first = result.groups[0]!;
  for (const patch of [
    { matchingB: 1 },
    { formula: 'c/a' },
    { groups: [first, first] },
    { groups: [{ ...first, b: { count: 3 } }] },
    { groups: [{ ...first, a: { count: 0 } }] },
    { groups: [{ ...first, keys: [{ field: 'attribute:x', kind: 'value', value: 'x' }] }] },
    { groups: [{ ...first, buckets: first.buckets.slice(0, 1) }] },
    { groups: [{ ...first, buckets: first.buckets.map(b => ({ ...b, start: b.start + 1 })) }] },
    { groups: [{ ...first, a: { count: 3, measurement: { state: 'ready', sampleCount: 3, value: 0 } } }] }
  ])
    expect(logComparisonResultSchema.safeParse({ ...result, ...patch }).success).toBe(false);
});
