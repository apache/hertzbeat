/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { expect, it, vi } from 'vitest';
import { DEFAULT_LOG_ANALYSIS, loadLogComparison } from '@/platform/perses';

import { buildLogComparisonRequest } from './explore-log-comparison-api';
const { post } = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('@/core/http/api-message', () => ({ apiMessagePostWithErrorEnvelope: post }));
const query = { signal: 'logs' as const, timeRange: 'last-30m' as const };
const window = { from: 1000000000, to: 1000001000 };
const analysis = {
  ...DEFAULT_LOG_ANALYSIS,
  representation: 'table' as const,
  comparison: { version: 1 as const, search: '', timeShiftMs: 3600000 }
};
const response = {
  window: { start: window.from, end: window.to },
  analysis: { field: null, view: 'groups', limit: 20, order: 'count-desc', minCount: 1, measure: null, grouping: null },
  matchingA: 0,
  matchingB: 0,
  truncated: false,
  intervalMs: null,
  groups: [],
  bTimeShiftMs: 3600000,
  bWindow: { start: 996400000, end: 996401000 }
};
it('verifies exact shifted metadata even when the query has no groups', async () => {
  const request = buildLogComparisonRequest(query, window, analysis);
  post.mockResolvedValue(response);
  await expect(loadLogComparison(request, window, analysis)).resolves.toHaveProperty('bTimeShiftMs', 3600000);
  for (const patch of [
    { bTimeShiftMs: undefined, bWindow: undefined },
    { bTimeShiftMs: undefined },
    { bWindow: undefined },
    { bWindow: { start: 996400001, end: 996401000 } },
    { bTimeShiftMs: 86400000 },
    { bTimeShiftMs: null, bWindow: null }
  ]) {
    post.mockResolvedValue({ ...response, ...patch });
    await expect(loadLogComparison(request, window, analysis)).rejects.toThrow();
  }
});
it('rejects unsafe shifted endpoints before issuing an atomic request', () => {
  expect(() => buildLogComparisonRequest(query, { from: 1000, to: 2000 }, analysis)).toThrow();
});
it('preserves old same-window shape and rejects unexpected shifted metadata', async () => {
  const old = { ...analysis, comparison: { version: 1 as const, search: '' } };
  const request = buildLogComparisonRequest(query, window, old);
  expect(request.queries[1]).not.toHaveProperty('timeShiftMs');
  post.mockResolvedValue({ ...response, bTimeShiftMs: undefined, bWindow: undefined });
  await expect(loadLogComparison(request, window, old)).resolves.toHaveProperty('matchingB', 0);
  post.mockResolvedValue(response);
  await expect(loadLogComparison(request, window, old)).rejects.toThrow();
});

it('rejects an offset whose shifted start lands exactly at zero', () => {
  expect(() => buildLogComparisonRequest(query, { from: 3600000, to: 3601000 }, analysis)).toThrow();
});

it('leaves unshifted request window validation on its existing path', () => {
  const old = { ...analysis, comparison: { version: 1 as const, search: '' } };
  expect(buildLogComparisonRequest(query, { from: 0, to: 1000 }, old).queries[1]).not.toHaveProperty('timeShiftMs');
});
