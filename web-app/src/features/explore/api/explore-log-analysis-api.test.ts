/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { expect, it, vi } from 'vitest';
import { loadLogAnalysis, DEFAULT_LOG_ANALYSIS } from '@/platform/perses';
import { buildLogAnalysisPath } from './explore-log-analysis-api';

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/core/http/api-message', () => ({ apiMessageGet: get }));
const query = {
  signal: 'logs' as const,
  timeRange: 'last-30m' as const,
  serviceName: 'checkout',
  query: 'status:ERROR',
  searchSyntax: 'structured-v1' as const,
  pageIndex: 3
};
const window = { from: 1000, to: 2000 };
it('shares groups request across table/toplist and preserves applied scope', () => {
  const table = buildLogAnalysisPath(query, window, { ...DEFAULT_LOG_ANALYSIS, representation: 'table' });
  const top = buildLogAnalysisPath(query, window, { ...DEFAULT_LOG_ANALYSIS, representation: 'toplist' });
  expect(table).toBe(top);
  const url = new URL(table, 'http://local');
  expect(url.pathname).toBe('/api/logs/analysis');
  expect(url.searchParams.get('search')).toBe('status:ERROR');
  expect(url.searchParams.get('serviceName')).toBe('checkout');
  expect(url.searchParams.has('pageIndex')).toBe(false);
  expect(url.searchParams.get('view')).toBe('groups');
});
it('rejects response metadata from a different applied grouping', async () => {
  get.mockResolvedValue({
    window: { start: 1000, end: 2000 },
    field: null,
    view: 'groups',
    limit: 10,
    order: 'count-desc',
    minCount: 1,
    matchingTotal: 0,
    truncated: false,
    intervalMs: null,
    groups: []
  });
  await expect(loadLogAnalysis('path', window, DEFAULT_LOG_ANALYSIS)).rejects.toThrow();
});

it('transports measure and rejects a valid response with the wrong echoed measure', async () => {
  const analysis = {
    ...DEFAULT_LOG_ANALYSIS,
    representation: 'table' as const,
    measure: { function: 'avg' as const, field: 'attribute:duration' },
    order: 'measure-desc' as const
  };
  const path = buildLogAnalysisPath(query, window, analysis);
  expect(new URL(path, 'http://local').searchParams.get('measure')).toBe(JSON.stringify(analysis.measure));
  get.mockResolvedValue({
    window: { start: 1000, end: 2000 },
    field: null,
    view: 'groups',
    limit: 20,
    order: 'measure-desc',
    minCount: 1,
    matchingTotal: 0,
    truncated: false,
    intervalMs: null,
    groups: [],
    measure: { ...analysis.measure, function: 'max' }
  });
  await expect(loadLogAnalysis(path, window, analysis)).rejects.toThrow();
});
it('sends ordered grouping without legacy field or limit and rejects reordered echo', async () => {
  const grouping = {
    version: 1 as const,
    dimensions: [
      { field: 'attribute:a', limit: 5 },
      { field: 'attribute:b', limit: 4 }
    ]
  };
  const analysis = { ...DEFAULT_LOG_ANALYSIS, representation: 'table' as const, grouping };
  const path = buildLogAnalysisPath(query, window, analysis);
  const params = new URL(path, 'http://local').searchParams;
  expect(JSON.parse(params.get('grouping')!)).toEqual(grouping);
  expect(params.has('field')).toBe(false);
  expect(params.has('limit')).toBe(false);
  get.mockResolvedValue({
    window: { start: 1000, end: 2000 },
    field: null,
    view: 'groups',
    limit: 20,
    order: 'count-desc',
    minCount: 1,
    matchingTotal: 0,
    truncated: false,
    intervalMs: null,
    groups: [],
    grouping: { ...grouping, dimensions: [...grouping.dimensions].reverse() }
  });
  await expect(loadLogAnalysis(path, window, analysis)).rejects.toThrow();
});
it('rejects silently ignored explicit intervals even on an empty response', async () => {
  const analysis = { ...DEFAULT_LOG_ANALYSIS, representation: 'timeseries' as const, intervalMs: 1000 };
  get.mockResolvedValue({
    window: { start: 1000, end: 2000 },
    field: null,
    view: 'timeseries',
    limit: 20,
    order: 'count-desc',
    minCount: 1,
    matchingTotal: 0,
    truncated: false,
    intervalMs: 60000,
    groups: []
  });
  await expect(loadLogAnalysis('path', window, analysis)).rejects.toThrow();
  get.mockResolvedValue({
    window: { start: 1000, end: 2000 },
    field: null,
    view: 'timeseries',
    limit: 20,
    order: 'count-desc',
    minCount: 1,
    matchingTotal: 0,
    truncated: false,
    intervalMs: 1000,
    groups: []
  });
  await expect(loadLogAnalysis('path', window, analysis)).resolves.toMatchObject({ intervalMs: 1000 });
});
it('requires throughput echo even for empty sum results and rejects incompatible views', async () => {
  const analysis = {
    ...DEFAULT_LOG_ANALYSIS,
    representation: 'timeseries',
    transform: 'throughput',
    measure: { function: 'sum', field: 'attribute:bytes' },
    order: 'measure-desc'
  } as const;
  const path = buildLogAnalysisPath(query, window, analysis);
  expect(new URL(path, 'http://local').searchParams.get('transform')).toBe('throughput');
  const result = {
    window: { start: 1000, end: 2000 },
    field: null,
    view: 'timeseries',
    limit: 20,
    order: 'measure-desc',
    minCount: 1,
    matchingTotal: 0,
    truncated: false,
    intervalMs: 60000,
    groups: [],
    measure: analysis.measure
  };
  get.mockResolvedValue(result);
  await expect(loadLogAnalysis(path, window, analysis)).rejects.toThrow();
  get.mockResolvedValue({ ...result, transform: 'throughput' });
  await expect(loadLogAnalysis(path, window, analysis)).resolves.toMatchObject({ transform: 'throughput' });
  expect(() => buildLogAnalysisPath(query, window, { ...analysis, representation: 'table' })).toThrow();
});
