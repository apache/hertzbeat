/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { expect, it } from 'vitest';
import { hasUnappliedExploreDraft } from './explore-saved-query-view-model';
import { draftFromQuery } from './explore-submission-model';
import type { MetricExploreQuery } from './explore-query';
const plan = {
  version: 1,
  queries: [
    { refId: 'a', metric: 'cpu', metricFilter: '', groupBy: '', aggregation: '', step: '' },
    { refId: 'b', metric: 'memory' }
  ],
  formulas: [{ id: 'f1', expression: 'a / b' }]
};
const query: MetricExploreQuery = {
  signal: 'metrics',
  timeRange: 'last-30m',
  metricPlan: JSON.stringify(plan),
  start: 1000,
  end: 2000,
  timeZone: 'UTC',
  serviceName: 'checkout'
};
it('does not mark an untouched plan-only Dashboard reverse link as an edited draft', () => {
  expect(hasUnappliedExploreDraft(query, draftFromQuery(query))).toBe(false);
  expect(query.query).toBeUndefined();
});
it('retains actual composition and shared-scope edits as pending', () => {
  const draft = draftFromQuery(query);
  if (draft.signal !== 'metrics') throw new Error('Expected metric draft');
  expect(hasUnappliedExploreDraft(query, { ...draft, serviceName: 'another' })).toBe(true);
  expect(
    hasUnappliedExploreDraft(query, {
      ...draft,
      metricPlan: JSON.stringify({ ...plan, formulas: [{ id: 'f1', expression: 'a + b' }] })
    })
  ).toBe(true);
  expect(
    hasUnappliedExploreDraft(query, {
      ...draft,
      metricPlan: JSON.stringify({
        ...plan,
        queries: [{ ...plan.queries[0], metricFilter: 'host=one' }, plan.queries[1]]
      })
    })
  ).toBe(true);
  expect(
    hasUnappliedExploreDraft(query, {
      ...draft,
      metricPlan: JSON.stringify({ ...plan, queries: [{ ...plan.queries[0], metric: 'other_cpu' }, plan.queries[1]] })
    })
  ).toBe(true);
  expect(hasUnappliedExploreDraft(query, { ...draft, metricPlan: '{broken' })).toBe(true);
});
