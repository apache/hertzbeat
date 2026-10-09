/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { describe, expect, it } from 'vitest';
import { hertzBeatQuerySchema } from './hertzbeat-query-contract';
const scope = { signal: 'traces', timeWindow: { from: 1000, to: 2000 }, endExclusive: true };
describe('trace panel query populations', () => {
  it('accepts matching spans as a distinct query shape', () => {
    const query = { ...scope, queryKind: 'spans', sort: 'duration_desc', limit: 20 };
    expect(hertzBeatQuerySchema.parse(query)).toEqual(query);
  });
  it('preserves groups and their explicit population', () => {
    const query = {
      ...scope,
      queryKind: 'groups',
      population: 'matched_spans',
      groupBy: 'serviceName',
      orderBy: 'count-desc',
      limit: 20
    };
    expect(hertzBeatQuerySchema.parse(query)).toEqual(query);
  });
  it('refuses an unbounded or ambiguous group', () => {
    expect(hertzBeatQuerySchema.safeParse({ ...scope, queryKind: 'groups', groupBy: 'arbitrary' }).success).toBe(false);
    expect(hertzBeatQuerySchema.safeParse({ ...scope, queryKind: 'spans', limit: 1000 }).success).toBe(false);
  });
});

it('accepts console metric identifiers consistently in scalar and composition requests', () => {
  for (const name of ['http.server-duration', 'm'.repeat(256)]) {
    expect(
      hertzBeatQuerySchema.safeParse({
        signal: 'metrics',
        queryKind: 'time-series',
        timeWindow: { from: 1000, to: 2000 },
        metric: { name }
      }).success
    ).toBe(true);
  }
});
