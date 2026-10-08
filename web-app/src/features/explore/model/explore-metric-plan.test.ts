/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { expect, it } from 'vitest';
import {
  encodeMetricPlan,
  parseMetricPlan,
  metricPlanFromQuery,
  nextMetricReference,
  validateMetricPlan
} from '@/platform/perses';
it('projects legacy queries without dropping controlled fields', () => {
  expect(
    metricPlanFromQuery({ query: 'cpu', metricFilter: 'host="one"', groupBy: 'host', aggregation: 'avg', step: '30' })
      .queries[0]
  ).toMatchObject({
    refId: 'a',
    metric: 'cpu',
    metricFilter: 'host="one"',
    groupBy: 'host',
    aggregation: 'avg',
    step: '30'
  });
});
it('roundtrips a composition and rejects unknown scope overrides', () => {
  const plan = metricPlanFromQuery({ query: 'cpu' });
  expect(parseMetricPlan(encodeMetricPlan(plan))).toEqual(plan);
  expect(() => parseMetricPlan(JSON.stringify({ ...plan, serviceName: 'other' }))).toThrow();
});
it('does not silently recover invalid plans using legacy scalar fields', () => {
  expect(() => metricPlanFromQuery({ metricPlan: '{broken', query: 'cpu' })).toThrow();
});
it('keeps removed references unresolved and does not retarget them on add', () => {
  const plan = {
    version: 1 as const,
    queries: [{ refId: 'b', metric: 'cpu' }],
    formulas: [{ id: 'f1', expression: 'a+b' }]
  };
  expect(nextMetricReference(plan)).toBe('c');
  expect(validateMetricPlan(plan)).toContainEqual({ row: 'f1', reason: 'reference', reference: 'a' });
});
it('blocks empty extra sources, duplicate refs and excessive sources', () => {
  const plan = metricPlanFromQuery({ query: 'cpu' });
  expect(validateMetricPlan({ ...plan, queries: [...plan.queries, { refId: 'b', metric: '' }] })).toContainEqual({
    row: 'b',
    reason: 'metric'
  });
  expect(() => parseMetricPlan(JSON.stringify({ ...plan, queries: [...plan.queries, ...plan.queries] }))).toThrow();
  expect(() =>
    parseMetricPlan(JSON.stringify({ ...plan, queries: 'abcde'.split('').map(refId => ({ refId, metric: 'cpu' })) }))
  ).toThrow();
});
it('preserves authoring and view through routing while rejecting invalid submission', async () => {
  const { buildExplorePath, parseExploreQuery } = await import('./explore-url-model');
  const { draftFromQuery, buildSubmissionPatch } = await import('./explore-submission-model');
  const metricPlan = encodeMetricPlan(metricPlanFromQuery({ query: 'cpu' }));
  const query = {
    signal: 'metrics' as const,
    timeRange: 'last-30m' as const,
    metricPlan,
    metricView: '{"mode":"split","hidden":[]}'
  };
  const restored = parseExploreQuery(new URL(buildExplorePath(query), 'http://local').searchParams);
  expect(restored).toMatchObject(query);
  expect(buildSubmissionPatch(draftFromQuery({ ...query, metricPlan: '{broken' }))).toEqual({
    valid: false,
    errors: [{ field: 'metricPlan', code: 'invalid_metric_plan' }]
  });
});
it('saves the entire composition and view and refuses invalid saved payloads', async () => {
  const { parseSavedExploreQuery } = await import('./explore-saved-query-schema');
  const plan = {
    version: 1 as const,
    queries: [
      { refId: 'a', metric: 'cpu' },
      { refId: 'b', metric: 'memory' }
    ],
    formulas: [{ id: 'f1', expression: 'a/b' }]
  };
  const query = {
    signal: 'metrics' as const,
    timeRange: 'last-30m' as const,
    metricPlan: encodeMetricPlan(plan),
    metricView: '{"mode":"split","hidden":["a"],"splitBy":"host","splitScale":"uniform"}'
  };
  expect(parseSavedExploreQuery(query)).toMatchObject(query);
  expect(parseSavedExploreQuery({ ...query, metricView: '{"mode":"unknown"}' })).toBeUndefined();
  expect(
    parseSavedExploreQuery({
      ...query,
      metricPlan: JSON.stringify({ ...plan, formulas: [{ id: 'f1', expression: 'c/a' }] })
    })
  ).toBeUndefined();
});
it('view changes do not change request or evidence ownership', async () => {
  const { exploreQueryKeys } = await import('../controller/explore-query-keys');
  const { exploreEvidenceScopeKey } = await import('./explore-model');
  const query = {
    signal: 'metrics' as const,
    timeRange: 'last-30m' as const,
    metricPlan: encodeMetricPlan(metricPlanFromQuery({ query: 'cpu' }))
  };
  const view = { ...query, metricView: '{"mode":"split","hidden":["a"]}' };
  expect(exploreQueryKeys.history(query, { from: 1000, to: 2000 }, 0)).toEqual(
    exploreQueryKeys.history(view, { from: 1000, to: 2000 }, 0)
  );
  expect(exploreEvidenceScopeKey(query)).toBe(exploreEvidenceScopeKey(view));
});
it('blocks malformed metric names in additional source rows before transport', () => {
  const plan = metricPlanFromQuery({ query: 'cpu' });
  expect(
    validateMetricPlan({ ...plan, queries: [...plan.queries, { refId: 'b', metric: 'sum(cpu)' }] })
  ).toContainEqual({ row: 'b', reason: 'metric' });
});

it('preserves a bounded time shift in a saved plan and rejects an invalid offset', async () => {
  const { parseSavedExploreQuery } = await import('./explore-saved-query-schema');
  const base = metricPlanFromQuery({ query: 'cpu' });
  const plan = { ...base, queries: [{ ...base.queries[0]!, timeShiftSeconds: 3600 }] };
  const encoded = encodeMetricPlan(plan);
  expect(parseMetricPlan(encoded)).toEqual(plan);
  expect(parseSavedExploreQuery({ signal: 'metrics', timeRange: 'last-30m', metricPlan: encoded })).toBeDefined();
  for (const value of [-1, 0.5, 31_536_001]) {
    expect(() => encodeMetricPlan({ ...base, queries: [{ ...base.queries[0]!, timeShiftSeconds: value }] })).toThrow();
  }
});

it('retains a bounded server rollup and rejects invalid or conflicting controls', () => {
  const base = metricPlanFromQuery({ query: 'cpu' });
  const row = { ...base.queries[0]!, rollup: { aggregation: 'avg' as const, intervalSeconds: 300 } };
  const plan = { ...base, queries: [row] };
  expect(parseMetricPlan(encodeMetricPlan(plan))).toEqual(plan);
  expect(() =>
    encodeMetricPlan({ ...base, queries: [{ ...row, rollup: { ...row.rollup, intervalSeconds: 0 } }] })
  ).toThrow();
  expect(validateMetricPlan({ ...base, queries: [{ ...row, temporalAggregation: 'rate' }] })).toContainEqual({
    row: 'a',
    reason: 'rollup'
  });
});

it('retains two time-aggregation stages and rejects an invalid outer stage', () => {
  const base = metricPlanFromQuery({ query: 'cpu' });
  const row = {
    ...base.queries[0]!,
    rollup: { aggregation: 'avg' as const, intervalSeconds: 300 },
    nestedRollup: { aggregation: 'max' as const, intervalSeconds: 1800 },
    step: '1800'
  };
  expect(parseMetricPlan(encodeMetricPlan({ ...base, queries: [row] })).queries[0]).toEqual(row);
  expect(validateMetricPlan({ ...base, queries: [{ ...row, step: '300' }] })).toContainEqual({
    row: 'a',
    reason: 'rollup'
  });
  expect(
    validateMetricPlan({ ...base, queries: [{ ...row, nestedRollup: { ...row.nestedRollup, intervalSeconds: 60 } }] })
  ).toContainEqual({ row: 'a', reason: 'rollup' });
});

it('does not turn a standalone rollup URL control into an unshifted raw metric query', async () => {
  const { parseExploreQuery } = await import('./explore-url-model');
  for (const temporalAggregation of ['rollup_avg_300', 'nested_max_1800_after_avg_300', 'rollup_predict_300']) {
    const query = parseExploreQuery(
      new URLSearchParams({ signal: 'metrics', timeRange: 'last-30m', query: 'cpu', temporalAggregation })
    );
    expect(query.signal).toBe('metrics');
    if (query.signal === 'metrics') {
      expect(query.temporalAggregation).toBe(temporalAggregation);
      expect(() => metricPlanFromQuery(query)).toThrow('Rollup requires a metric plan');
    }
  }
});

it('roundtrips and saves number views strictly, while keeping presentation outside the evidence cache key', async () => {
  const { buildExplorePath, parseExploreQuery } = await import('./explore-url-model');
  const { parseSavedExploreQuery } = await import('./explore-saved-query-schema');
  const { exploreQueryKeys } = await import('../controller/explore-query-keys');
  const query = {
    signal: 'metrics' as const,
    timeRange: 'last-30m' as const,
    query: 'cpu',
    serviceName: 'one',
    metricView: JSON.stringify({
      mode: 'number',
      hidden: ['b'],
      numberCalculation: 'avg',
      chart: { display: 'bar', legend: false }
    })
  };
  expect(parseExploreQuery(new URL(buildExplorePath(query), 'http://local').searchParams)).toMatchObject(query);
  expect(parseSavedExploreQuery(query)).toMatchObject(query);
  expect(
    parseSavedExploreQuery({ ...query, metricView: '{"mode":"number","hidden":[],"numberCalculation":"invalid"}' })
  ).toBeUndefined();
  expect(exploreQueryKeys.history(query, { from: 1, to: 200 }, 0)).toEqual(
    exploreQueryKeys.history({ ...query, metricView: undefined }, { from: 1, to: 200 }, 0)
  );
  expect(exploreQueryKeys.history(query, { from: 1, to: 200 }, 0)).not.toEqual(
    exploreQueryKeys.history({ ...query, serviceName: 'two' }, { from: 1, to: 200 }, 0)
  );
});
