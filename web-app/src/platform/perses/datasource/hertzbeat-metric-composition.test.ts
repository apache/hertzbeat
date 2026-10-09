/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { describe, expect, it, vi } from 'vitest';
import { queryMetricComposition } from './hertzbeat-metric-composition';
import type {
  HertzBeatMetricCompositionQuery,
  HertzBeatMetricQuery,
  HertzBeatQueryOutcome
} from './hertzbeat-query-contract';
import type { HertzBeatMetricData } from './hertzbeat-query-schema';
const timeWindow = { from: 1000, to: 2000 };
const query: HertzBeatMetricCompositionQuery = {
  signal: 'metrics',
  queryKind: 'composition',
  timeWindow,
  context: { serviceName: 'checkout' },
  operationName: 'GET /cart',
  plan: {
    version: 1,
    queries: [
      { refId: 'a', metric: 'requests_total', metricFilter: 'method=GET', groupBy: 'method' },
      { refId: 'b', metric: 'errors_total', groupBy: 'method' }
    ],
    formulas: [{ id: 'f1', expression: 'a / b' }]
  }
};
function ready(name: string, values: number[]): HertzBeatQueryOutcome<HertzBeatMetricData> {
  return {
    state: 'ready',
    truncated: 'unknown',
    data: {
      timeWindow,
      source: 'test',
      series: [
        {
          key: name,
          name,
          labels: { method: 'GET' },
          points: values.map((value, index) => ({ timestamp: 1000 + index * 1000, value }))
        }
      ]
    }
  };
}
describe('shared metric composition execution', () => {
  it('retains scope, filters and operand gaps rather than making division by zero a fake zero', async () => {
    const load = vi.fn((source: HertzBeatMetricQuery) =>
      Promise.resolve(ready(source.metric.name, source.metric.name === 'requests_total' ? [12, 14] : [2, 0]))
    );
    const result = await queryMetricComposition(query, load);
    expect(load.mock.calls[0]?.[0]).toMatchObject({
      context: query.context,
      timeWindow,
      metric: { metricFilter: 'method=GET', groupBy: 'method', operationName: 'GET /cart' }
    });
    if (result.state !== 'ready') throw new Error('Expected partial or complete output');
    expect(result.data.formulas[0]?.series[0]?.points).toEqual([
      [1000, 6],
      [2000, null]
    ]);
  });
  it('retains successful sources when another source fails and marks dependent formulas unavailable', async () => {
    const result = await queryMetricComposition(query, source =>
      Promise.resolve(
        source.metric.name === 'requests_total'
          ? ready('requests_total', [12])
          : { state: 'error', error: { kind: 'unavailable', messageKey: 'perses.query.unavailable', retryable: true } }
      )
    );
    if (result.state !== 'ready') throw new Error('Expected partial or complete output');
    expect(result.data.sources.map(source => source.state)).toEqual(['ready', 'error']);
    expect(result.data.formulas[0]).toMatchObject({ state: 'unavailable', reason: 'source', series: [] });
  });
  it('does not return a composition from sources completing after cancellation', async () => {
    const controller = new AbortController();
    const result = queryMetricComposition(
      query,
      () => {
        controller.abort();
        return Promise.resolve(ready('requests_total', [12]));
      },
      controller.signal
    );
    await expect(result).rejects.toMatchObject({ name: 'AbortError' });
  });
});

it.each(['permission', 'overloaded'] as const)('retains homogeneous %s failures as a panel failure', async kind => {
  const error = { kind, messageKey: `perses.query.${kind}` as const, retryable: kind === 'overloaded' };
  const result = await queryMetricComposition(query, () => Promise.resolve({ state: 'error', error }));
  expect(result).toEqual({ state: 'error', error });
});
it('retains each failed sibling reason beside successful or empty output', async () => {
  const error = { kind: 'permission' as const, messageKey: 'perses.query.permission' as const, retryable: false };
  const result = await queryMetricComposition(query, source =>
    Promise.resolve(source.metric.name === 'requests_total' ? ready('requests_total', [12]) : { state: 'error', error })
  );
  expect(result).toMatchObject({
    state: 'ready',
    data: { sources: [{ state: 'ready' }, { state: 'error', failure: error }] }
  });
  const mixed = await queryMetricComposition(query, source =>
    Promise.resolve(
      source.metric.name === 'requests_total' ? { state: 'empty', truncated: false } : { state: 'error', error }
    )
  );
  expect(mixed).toMatchObject({ state: 'ready', data: { sources: [{ state: 'empty' }, { failure: error }] } });
});

it('queries the shifted backend window under the same scope and aligns points to the applied window', async () => {
  const applied = { from: 7_200_000, to: 7_201_000 };
  const shifted = { from: 3_600_000, to: 3_601_000 };
  const plan = {
    ...query.plan,
    queries: [{ refId: 'a', metric: 'requests_total', timeShiftSeconds: 3600 }],
    formulas: []
  };
  const load = vi.fn((source: HertzBeatMetricQuery) =>
    Promise.resolve({
      state: 'ready' as const,
      truncated: 'unknown' as const,
      data: {
        timeWindow: source.timeWindow,
        source: 'test',
        series: [
          {
            key: 'requests',
            name: 'requests_total',
            labels: { method: 'GET' },
            points: [{ timestamp: shifted.from, value: 12 }]
          }
        ]
      }
    })
  );
  const result = await queryMetricComposition({ ...query, timeWindow: applied, plan }, load);
  expect(load).toHaveBeenCalledWith(
    expect.objectContaining({
      context: query.context,
      timeWindow: shifted,
      metric: expect.objectContaining({ name: 'requests_total' })
    })
  );
  expect(result).toMatchObject({ state: 'ready', data: { sources: [{ series: [{ points: [[applied.from, 12]] }] }] } });
});

it('compares current and shifted samples without inventing a value for a missing point', async () => {
  const applied = { from: 7_200_000, to: 7_201_000 };
  const plan = {
    ...query.plan,
    queries: [
      { refId: 'a', metric: 'requests_total' },
      { refId: 'b', metric: 'requests_total', timeShiftSeconds: 3600 }
    ],
    formulas: [{ id: 'f1', expression: 'a-b' }]
  };
  const result = await queryMetricComposition({ ...query, timeWindow: applied, plan }, source =>
    Promise.resolve({
      state: 'ready',
      truncated: 'unknown',
      data: {
        timeWindow: source.timeWindow,
        source: 'test',
        series: [
          {
            key: source.metric.name,
            name: source.metric.name,
            labels: { method: 'GET' },
            points:
              source.timeWindow.from === applied.from
                ? [
                    { timestamp: applied.from, value: 12 },
                    { timestamp: applied.to, value: 15 }
                  ]
                : [{ timestamp: applied.from - 3_600_000, value: 5 }]
          }
        ]
      }
    })
  );
  expect(result).toMatchObject({
    state: 'ready',
    data: {
      formulas: [
        {
          state: 'ready',
          series: [
            {
              points: [
                [applied.from, 7],
                [applied.to, null]
              ]
            }
          ]
        }
      ]
    }
  });
});

it('rejects a time shift before epoch without calling the backend', async () => {
  const load = vi.fn(() => Promise.resolve(ready('requests_total', [2])));
  const result = await queryMetricComposition(
    {
      ...query,
      plan: { ...query.plan, queries: [{ refId: 'a', metric: 'requests_total', timeShiftSeconds: 3600 }], formulas: [] }
    },
    load
  );
  expect(load).not.toHaveBeenCalled();
  expect(result).toMatchObject({ state: 'error', error: { kind: 'invalid_request', retryable: false } });
});

it('executes bounded rollup at the server with the same protected scope', async () => {
  const load = vi.fn((source: HertzBeatMetricQuery) => Promise.resolve(ready(source.metric.name, [12])));
  const result = await queryMetricComposition(
    {
      ...query,
      plan: {
        version: 1,
        queries: [{ refId: 'a', metric: 'requests_total', rollup: { aggregation: 'avg', intervalSeconds: 300 } }],
        formulas: []
      }
    },
    load
  );
  expect(result.state).toBe('ready');
  expect(load).toHaveBeenCalledWith(
    expect.objectContaining({
      context: query.context,
      metric: expect.objectContaining({ temporalAggregation: 'rollup_avg_300', stepSeconds: 300 })
    })
  );
});
