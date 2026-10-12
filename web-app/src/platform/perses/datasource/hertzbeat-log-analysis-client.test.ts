/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { beforeEach, expect, it, vi } from 'vitest';
import { apiMessageGet, apiMessagePostWithErrorEnvelope } from '@/core/http/api-message';
import { queryHertzBeatData } from './hertzbeat-query-client';
import type { HertzBeatLogAnalysisQuery } from './hertzbeat-query-contract';
vi.mock('@/core/http/api-message', async original => ({
  ...(await original<object>()),
  apiMessageGet: vi.fn(),
  apiMessagePostWithErrorEnvelope: vi.fn()
}));
const base: HertzBeatLogAnalysisQuery = {
  signal: 'logs',
  queryKind: 'analysis',
  timeWindow: { from: 7200000, to: 7260000 },
  context: { serviceName: 'checkout', environment: 'proof' },
  search: '  exact  ',
  logNumericRange: { version: 1, field: 'attribute:value', min: -1, max: 3 },
  logGroupSelection: { version: 1, groups: [{ field: 'attribute:key', kind: 'value', value: '2.0' }] },
  analysis: { version: 1, representation: 'table', limit: 20, order: 'count-desc', minCount: 1, intervalMs: 1000 }
};
const result = {
  window: { start: 7200000, end: 7260000 },
  field: null,
  view: 'groups',
  limit: 20,
  order: 'count-desc',
  minCount: 1,
  matchingTotal: 9,
  truncated: false,
  intervalMs: null,
  groups: []
};
beforeEach(() => vi.resetAllMocks());
it('dispatches logs analysis with complete common scope and retains empty population metadata', async () => {
  vi.mocked(apiMessageGet).mockResolvedValue(result);
  const abort = new AbortController();
  expect(await queryHertzBeatData(base, { signal: abort.signal })).toEqual({
    state: 'ready',
    truncated: false,
    data: { kind: 'single', data: result }
  });
  const [path, options] = vi.mocked(apiMessageGet).mock.calls[0]!;
  const url = new URL(path, 'http://local');
  expect(url.pathname).toBe('/api/logs/analysis');
  expect(url.searchParams.get('search')).toBe('  exact  ');
  expect(url.searchParams.get('serviceName')).toBe('checkout');
  expect(url.searchParams.get('environment')).toBe('proof');
  expect(JSON.parse(url.searchParams.get('logGroupSelection')!)).toEqual(base.logGroupSelection);
  expect(JSON.parse(url.searchParams.get('logNumericRange')!)).toEqual(base.logNumericRange);
  expect(url.searchParams.has('intervalMs')).toBe(false);
  expect(url.searchParams.has('pageSize')).toBe(false);
  expect(options).toMatchObject({ signal: abort.signal, preserveErrorEnvelope: true });
});
it('uses one paired request with original search, formula and source-b shift', async () => {
  const analysis = {
    ...base.analysis,
    comparison: { version: 1 as const, search: ' b ', formula: 'a+b', timeShiftMs: 3600000 }
  };
  const paired = {
    window: result.window,
    analysis: {
      field: null,
      view: 'groups',
      limit: 20,
      order: 'count-desc',
      minCount: 1,
      measure: null,
      grouping: null
    },
    matchingA: 0,
    matchingB: 4,
    truncated: false,
    intervalMs: null,
    groups: [],
    formula: 'a+b',
    bTimeShiftMs: 3600000,
    bWindow: { start: 3600000, end: 3660000 }
  };
  vi.mocked(apiMessagePostWithErrorEnvelope).mockResolvedValue(paired);
  expect(
    await queryHertzBeatData({
      ...base,
      analysis,
      logSort: { version: 1, field: 'attribute:duration', type: 'number', direction: 'desc' }
    })
  ).toMatchObject({
    state: 'ready',
    data: { kind: 'comparison', data: paired }
  });
  expect(apiMessageGet).not.toHaveBeenCalled();
  expect(apiMessagePostWithErrorEnvelope).toHaveBeenCalledTimes(1);
  const [, body] = vi.mocked(apiMessagePostWithErrorEnvelope).mock.calls[0]!;
  expect(body).toMatchObject({
    formula: 'a+b',
    queries: [
      { id: 'a', search: '  exact  ' },
      { id: 'b', search: ' b ', timeShiftMs: 3600000 }
    ]
  });
  expect((body as { parameters: Record<string, string> }).parameters).not.toHaveProperty('logSort');
});
it('dispatches saved v2 query sets through one bounded endpoint with source-owned searches', async () => {
  const sourceAnalysis = { limit: 20, order: 'count-desc' as const, minCount: 1 };
  const queries = [
    { refId: 'a', alias: 'Current', visible: false, search: 'service:api', analysis: sourceAnalysis },
    { refId: 'b', alias: 'Worker', visible: true, search: 'service:worker', analysis: sourceAnalysis }
  ];
  const formulas = [{ refId: 'f1', alias: 'Total', visible: true, expression: 'a+b' }];
  const analysis = {
    ...base.analysis,
    representation: 'timeseries' as const,
    intervalMs: 60000,
    querySet: { version: 2 as const, queries, formulas, nextSourceOrdinal: 2, nextFormulaSeq: 2 }
  };
  const response = {
    version: 2,
    window: result.window,
    intervalMs: 60000,
    executed: { queries, formulas },
    sources: queries.map(source => ({
      refId: source.refId,
      alias: source.alias,
      visible: source.visible,
      sourceWindow: result.window,
      matchingTotal: 0,
      truncated: false,
      analysis: sourceAnalysis,
      groups: []
    })),
    formulas: [{ ...formulas[0], dependsOn: ['a', 'b'] }]
  };
  vi.mocked(apiMessagePostWithErrorEnvelope).mockResolvedValue(response);
  expect(await queryHertzBeatData({ ...base, analysis })).toMatchObject({
    state: 'ready',
    data: { kind: 'querySet', data: response }
  });
  expect(apiMessageGet).not.toHaveBeenCalled();
  const [path, body] = vi.mocked(apiMessagePostWithErrorEnvelope).mock.calls[0]!;
  expect(path).toBe('/api/logs/analysis/queries');
  expect(body).toMatchObject({ version: 2, queries, formulas });
  expect((body as { parameters: Record<string, string> }).parameters).not.toHaveProperty('search');
});
it('dispatches an a-only formula through full-window analysis without a synthetic b request', async () => {
  const analysis = {
    ...base.analysis,
    comparison: { version: 1 as const, formula: 'a * 2', hidden: ['a'] as ('a' | 'b' | 'formula')[] }
  };
  vi.mocked(apiMessageGet).mockResolvedValue(result);
  expect(await queryHertzBeatData({ ...base, analysis })).toMatchObject({
    state: 'ready',
    data: { kind: 'single', data: result }
  });
  expect(apiMessagePostWithErrorEnvelope).not.toHaveBeenCalled();
  expect(new URL(String(vi.mocked(apiMessageGet).mock.calls[0]![0]), 'http://local').pathname).toBe(
    '/api/logs/analysis'
  );
});
it.each([
  { ...result, window: { start: 1, end: 2 } },
  { ...result, order: 'count-asc' },
  { ...result, extra: true }
])('fails closed on response or echo mismatch', async response => {
  vi.mocked(apiMessageGet).mockResolvedValue(response);
  expect(await queryHertzBeatData(base)).toMatchObject({ state: 'error', error: { kind: 'contract_error' } });
});
it('keeps dormant extras out of timeseries HTTP without deleting the stored descriptor', async () => {
  const analysis = {
    ...base.analysis,
    representation: 'timeseries' as const,
    intervalMs: 60000,
    transform: 'throughput' as const,
    additionalMeasures: [{ function: 'sum' as const, field: 'attribute:value' }]
  };
  vi.mocked(apiMessageGet).mockResolvedValue({
    ...result,
    matchingTotal: 0,
    view: 'timeseries',
    transform: 'throughput',
    intervalMs: 60000
  });
  expect(await queryHertzBeatData({ ...base, analysis })).toMatchObject({ state: 'ready' });
  const params = new URL(String(vi.mocked(apiMessageGet).mock.calls[0]![0]), 'http://local').searchParams;
  expect(params.get('transform')).toBe('throughput');
  expect(params.has('additionalMeasures')).toBe(false);
  expect(analysis.additionalMeasures).toHaveLength(1);
});
it('propagates cancellation rather than changing it to an unavailable result', async () => {
  const abort = new AbortController();
  const reason = new DOMException('Aborted', 'AbortError');
  vi.mocked(apiMessageGet).mockImplementation(() => {
    abort.abort(reason);
    return Promise.reject(reason);
  });
  await expect(queryHertzBeatData(base, { signal: abort.signal })).rejects.toBe(reason);
});
