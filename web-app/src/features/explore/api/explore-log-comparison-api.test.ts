/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { expect, it, vi } from 'vitest';
import { loadLogComparison, DEFAULT_LOG_ANALYSIS } from '@/platform/perses';
import { buildLogComparisonRequest } from './explore-log-comparison-api';

const { post } = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('@/core/http/api-message', () => ({ apiMessagePostWithErrorEnvelope: post }));
const analysis = {
  ...DEFAULT_LOG_ANALYSIS,
  representation: 'table' as const,
  comparison: { version: 1 as const, search: 'status:error', searchSyntax: 'structured-v1' as const, formula: 'b/a' }
};
const query = {
  signal: 'logs' as const,
  timeRange: 'last-30m' as const,
  query: 'service:checkout',
  searchSyntax: 'structured-v1',
  serviceName: 'checkout',
  pageIndex: 5
};
const window = { from: 1000, to: 2000 };
it('separates both expressions from shared scope and excludes list pagination', () => {
  const request = buildLogComparisonRequest(query, window, analysis);
  expect(request.queries).toEqual([
    { id: 'a', search: query.query, searchSyntax: 'structured-v1' },
    { id: 'b', search: 'status:error', searchSyntax: 'structured-v1' }
  ]);
  expect(request.parameters).toMatchObject({ serviceName: 'checkout', start: '1000', end: '2000', view: 'groups' });
  for (const key of ['search', 'searchSyntax', 'pageIndex', 'sort', 'logAnalysis'])
    expect(request.parameters).not.toHaveProperty(key);
});
it('uses abortable POST and rejects a mismatched applied response formula', async () => {
  const request = buildLogComparisonRequest(query, window, analysis);
  post.mockResolvedValue({
    window: { start: 1000, end: 2000 },
    analysis: {
      field: null,
      measure: null,
      grouping: null,
      view: 'groups',
      limit: 20,
      order: 'count-desc',
      minCount: 1
    },
    matchingA: 0,
    matchingB: 5,
    truncated: false,
    intervalMs: null,
    groups: [],
    formula: 'a/b'
  });
  const signal = new AbortController().signal;
  await expect(loadLogComparison(request, window, analysis, signal)).rejects.toThrow();
  expect(post).toHaveBeenCalledWith('/api/logs/analysis/compare', request, { signal });
});

it('rejects ignored explicit intervals and missing comparison interval echoes even with no groups', async () => {
  const selected = { ...analysis, representation: 'timeseries' as const, intervalMs: 1000 };
  const request = buildLogComparisonRequest(query, window, selected);
  const response = {
    window: { start: 1000, end: 2000 },
    analysis: {
      field: null,
      measure: null,
      grouping: null,
      view: 'timeseries',
      limit: 20,
      order: 'count-desc',
      minCount: 1,
      intervalMs: 1000
    },
    matchingA: 0,
    matchingB: 0,
    truncated: false,
    intervalMs: 60000,
    groups: [],
    formula: 'b/a'
  };
  post.mockResolvedValue(response);
  await expect(loadLogComparison(request, window, selected)).rejects.toThrow();
  post.mockResolvedValue({ ...response, intervalMs: 1000, analysis: { ...response.analysis, intervalMs: undefined } });
  await expect(loadLogComparison(request, window, selected)).rejects.toThrow();
  post.mockResolvedValue({ ...response, intervalMs: 1000 });
  await expect(loadLogComparison(request, window, selected)).resolves.toMatchObject({ intervalMs: 1000 });
});
it('carries throughput metadata in paired requests and rejects a missing echo for empty results', async () => {
  const selected = { ...analysis, representation: 'timeseries', transform: 'throughput' } as const;
  const request = buildLogComparisonRequest(query, window, selected);
  expect(request.parameters.transform).toBe('throughput');
  const response = {
    window: { start: 1000, end: 2000 },
    analysis: {
      field: null,
      measure: null,
      grouping: null,
      view: 'timeseries',
      limit: 20,
      order: 'count-desc',
      minCount: 1
    },
    matchingA: 0,
    matchingB: 0,
    truncated: false,
    intervalMs: 60000,
    groups: [],
    formula: 'b/a'
  };
  post.mockResolvedValue(response);
  await expect(loadLogComparison(request, window, selected)).rejects.toThrow();
  post.mockResolvedValue({ ...response, analysis: { ...response.analysis, transform: 'throughput' } });
  await expect(loadLogComparison(request, window, selected)).resolves.toMatchObject({
    analysis: { transform: 'throughput' }
  });
});
