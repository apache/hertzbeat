/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { describe, expect, it } from 'vitest';
import { hertzBeatQuerySchema } from './hertzbeat-query-contract';
const query = {
  signal: 'metrics',
  queryKind: 'composition',
  timeWindow: { from: 1000, to: 2000 },
  plan: {
    version: 1,
    queries: [
      { refId: 'a', metric: 'requests_total' },
      { refId: 'b', metric: 'errors_total' }
    ],
    formulas: [{ id: 'f1', expression: 'b / a' }]
  }
};
describe('controlled metric composition document', () => {
  it('accepts a typed bounded plan without reducing it to its first source', () => {
    expect(hertzBeatQuerySchema.parse(query)).toEqual(query);
  });
  it.each([
    { formulas: [{ id: 'f1', expression: 'missing(a)' }] },
    { formulas: [{ id: 'f1', expression: 'a / c' }] },
    {
      queries: [
        { refId: 'a', metric: 'requests_total' },
        { refId: 'a', metric: 'errors_total' }
      ]
    },
    { queries: [{ refId: 'a', metric: 'select * from metrics' }] }
  ])('rejects invalid plans before any request %j', changes => {
    expect(hertzBeatQuerySchema.safeParse({ ...query, plan: { ...query.plan, ...changes } }).success).toBe(false);
  });
});
