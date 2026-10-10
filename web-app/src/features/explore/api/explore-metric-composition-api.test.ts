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

import { expect, it, vi } from 'vitest';
import { ApiMessageError } from '@/core/http/api-message';
import { loadMetricComposition } from './explore-metric-composition-api';
import type { MetricExploreQuery } from '../model/explore-query';
import type { MetricConsole } from '../model/explore-signal-contract';
const metricPlan = JSON.stringify({
  version: 1,
  queries: [
    { refId: 'a', metric: 'cpu' },
    { refId: 'b', metric: 'memory' }
  ],
  formulas: [{ id: 'f1', expression: 'a/b' }]
});
const evidence: MetricConsole = {
  context: null,
  query: 'cpu',
  datasource: 'greptime',
  queryMode: 'metric',
  results: {
    refId: 'a',
    status: 200,
    msg: null,
    frames: [
      {
        schema: { labels: { host: 'one' }, fields: [{ name: 'value', type: 'number', unit: null }], meta: null },
        data: [[1000, 4]]
      }
    ]
  },
  stats: null,
  emptyStateReason: null,
  errorMessage: null
};
it('captures one window and protected scope for all sources while retaining partial failure', async () => {
  const loader = vi
    .fn<(query: MetricExploreQuery, signal?: AbortSignal) => Promise<MetricConsole>>()
    .mockResolvedValueOnce(evidence)
    .mockRejectedValueOnce(new Error('Unavailable'));
  const abort = new AbortController();
  const result = await loadMetricComposition(
    { signal: 'metrics', timeRange: 'last-30m', serviceName: 'checkout', metricPlan },
    { from: 1000, to: 2000 },
    loader,
    abort.signal
  );
  expect(loader.mock.calls.map(([query]) => [query.start, query.end, query.serviceName, query.query])).toEqual([
    [1000, 2000, 'checkout', 'cpu'],
    [1000, 2000, 'checkout', 'memory']
  ]);
  expect(loader.mock.calls.every(([, signal]) => signal === abort.signal)).toBe(true);
  expect(result.composition?.sources.map(source => source.state)).toEqual(['ready', 'error']);
  expect(result.composition?.formulas[0]?.reason).toBe('source');
});
it('aborted generations cannot return completed evidence even when transport ignores abort', async () => {
  const abort = new AbortController();
  abort.abort();
  await expect(
    loadMetricComposition(
      { signal: 'metrics', timeRange: 'last-30m', metricPlan },
      { from: 1000, to: 2000 },
      vi.fn().mockResolvedValue(evidence),
      abort.signal
    )
  ).rejects.toThrow();
});
it('does not execute invalid plans or fall back to a scalar query', async () => {
  const loader = vi.fn();
  await expect(
    loadMetricComposition(
      { signal: 'metrics', timeRange: 'last-30m', query: 'cpu', metricPlan: '{broken' },
      { from: 1000, to: 2000 },
      loader
    )
  ).rejects.toThrow();
  expect(loader).not.toHaveBeenCalled();
});

it('isolates typed invalid queries from transport failures', async () => {
  const loader = vi
    .fn()
    .mockRejectedValueOnce(new ApiMessageError('observability_query_context_invalid', { status: 400 }))
    .mockRejectedValueOnce(new ApiMessageError('Gateway unavailable', { status: 503 }));
  const result = await loadMetricComposition(
    { signal: 'metrics', timeRange: 'last-30m', metricPlan },
    { from: 1000, to: 2000 },
    loader
  );
  expect(result.composition?.sources.map(source => source.state)).toEqual(['invalid_query', 'error']);
});
it.each([
  [403, 'permission', false],
  [429, 'overloaded', true]
] as const)('preserves HTTP %s beside a successful sibling', async (status, kind, retryable) => {
  const result = await loadMetricComposition(
    { signal: 'metrics', timeRange: 'last-30m', metricPlan },
    { from: 1000, to: 2000 },
    vi.fn().mockResolvedValueOnce(evidence).mockRejectedValueOnce(new ApiMessageError('Private detail', { status }))
  );
  expect(result.composition?.sources[0]).toMatchObject({ state: 'ready' });
  expect(result.composition?.sources[1]).toMatchObject({ state: 'error', failure: { kind, retryable }, series: [] });
  expect(result.composition?.formulas[0]).toMatchObject({ state: 'unavailable', reason: 'source' });
});
it('does not publish cancellation as a failed source after requests start', async () => {
  const abort = new AbortController();
  await expect(
    loadMetricComposition(
      { signal: 'metrics', timeRange: 'last-30m', metricPlan },
      { from: 1000, to: 2000 },
      () => {
        abort.abort();
        return Promise.reject(new ApiMessageError('Cancelled', { status: 429 }));
      },
      abort.signal
    )
  ).rejects.toMatchObject({ name: 'AbortError' });
});

it('loads a shifted Explore source from the historical window and aligns its returned point', async () => {
  const shiftedPlan = JSON.stringify({
    version: 1,
    queries: [{ refId: 'a', metric: 'cpu', timeShiftSeconds: 3600 }],
    formulas: []
  });
  const loader = vi.fn().mockResolvedValue({
    ...evidence,
    context: { start: 3_600_000, end: 3_601_000 },
    results: { ...evidence.results, frames: [{ ...evidence.results?.frames?.[0], data: [[3_600_000, 4]] }] }
  });
  const result = await loadMetricComposition(
    { signal: 'metrics', timeRange: 'last-30m', serviceName: 'checkout', metricPlan: shiftedPlan },
    { from: 7_200_000, to: 7_201_000 },
    loader
  );
  expect(loader).toHaveBeenCalledWith(
    expect.objectContaining({
      serviceName: 'checkout',
      start: 3_600_000,
      end: 3_601_000,
      query: 'cpu'
    }),
    undefined
  );
  expect(result.composition?.sources[0]).toMatchObject({
    state: 'ready',
    series: [{ points: [[7_200_000, 4]] }]
  });
});

it('does not query outside the valid epoch for a shifted source', async () => {
  const loader = vi.fn();
  const result = await loadMetricComposition(
    {
      signal: 'metrics',
      timeRange: 'last-30m',
      metricPlan: JSON.stringify({
        version: 1,
        queries: [{ refId: 'a', metric: 'cpu', timeShiftSeconds: 3600 }],
        formulas: []
      })
    },
    { from: 1000, to: 2000 },
    loader
  );
  expect(loader).not.toHaveBeenCalled();
  expect(result.composition?.sources[0]).toMatchObject({ state: 'invalid_query', series: [] });
});

it('sends a planned rollup through the Explore scalar loader without widening scope', async () => {
  const loader = vi.fn().mockResolvedValue(evidence);
  await loadMetricComposition(
    {
      signal: 'metrics',
      timeRange: 'last-30m',
      serviceName: 'checkout',
      metricPlan: JSON.stringify({
        version: 1,
        queries: [{ refId: 'a', metric: 'cpu', rollup: { aggregation: 'avg', intervalSeconds: 300 } }],
        formulas: []
      })
    },
    { from: 1000, to: 2000 },
    loader
  );
  expect(loader).toHaveBeenCalledWith(
    expect.objectContaining({
      serviceName: 'checkout',
      temporalAggregation: 'rollup_avg_300',
      step: '300'
    }),
    undefined
  );
});

it('sends both nested time stages with the outer resolution and unchanged service scope', async () => {
  const loader = vi.fn().mockResolvedValue(evidence);
  await loadMetricComposition(
    {
      signal: 'metrics',
      timeRange: 'last-30m',
      serviceName: 'checkout',
      metricPlan: JSON.stringify({
        version: 1,
        queries: [
          {
            refId: 'a',
            metric: 'cpu',
            rollup: { aggregation: 'avg', intervalSeconds: 300 },
            nestedRollup: { aggregation: 'max', intervalSeconds: 1800 },
            step: '1800'
          }
        ],
        formulas: []
      })
    },
    { from: 1000, to: 2000 },
    loader
  );
  expect(loader).toHaveBeenCalledWith(
    expect.objectContaining({
      serviceName: 'checkout',
      temporalAggregation: 'nested_max_1800_after_avg_300',
      step: '1800'
    }),
    undefined
  );
});
