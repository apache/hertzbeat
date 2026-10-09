/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { expect, it } from 'vitest';
import { metricSplitDomain, splitMetricSeries } from '@/platform/perses';
import type { MetricSeries } from './explore-signal-model';
const row = (key: string, host: string, points: unknown[][]): MetricSeries => ({
  key,
  name: 'cpu',
  labels: { host },
  points
});
it('orders groups by average returned sample value, leaves missing last, and retains original series', () => {
  const series = [
    row('a', 'first', [
      [2000, 2],
      [1000, 99]
    ]),
    row('b', 'second', [[2000, 5]]),
    row('c', 'empty', [[2000, null]])
  ];
  const result = splitMetricSeries(series, { mode: 'split', hidden: [], splitBy: 'host', splitLimit: 2 });
  expect(result.groups.map(group => group.value)).toEqual(['first', 'second']);
  expect(result.total).toBe(3);
  expect(result.groups[0]?.series[0]).toBe(series[0]);
  expect(
    splitMetricSeries(series, { mode: 'split', hidden: [], splitBy: 'host', splitOrder: 'bottom' }).groups.map(
      group => group.value
    )
  ).toEqual(['second', 'first', 'empty']);
});
it('does not silently choose an absent label or omit unlabeled returned series', () => {
  const series = [row('a', 'one', [[1000, 0]]), { ...row('b', 'two', [[1000, -1]]), labels: {} }];
  expect(splitMetricSeries(series, { mode: 'split', hidden: [], splitBy: 'unknown' }).groups).toEqual([]);
  expect(splitMetricSeries(series, { mode: 'split', hidden: [], splitBy: 'host' }).groups).toHaveLength(2);
});
it('keeps constant-domain finite and handles the maximum returned sample population', () => {
  const sample = row(
    'a',
    'host',
    Array.from({ length: 153600 }, (_, index) => [index, 7])
  );
  expect(metricSplitDomain([{ value: 'host', series: [sample] }])).toEqual({ min: 6.93, max: 7.07 });
});
it('does not overflow uniform bounds for finite extreme constants', () => {
  const result = metricSplitDomain([{ value: 'host', series: [row('a', 'host', [[1000, Number.MAX_VALUE]])] }]);
  expect(Number.isFinite(result?.max)).toBe(true);
  expect(Number.isFinite(result?.min)).toBe(true);
});
it('ranks by one explicit output instead of comparing values with unrelated units', () => {
  const series = [
    { ...row('a1', 'first', [[1000, 9]]), refId: 'a', unit: 'percent' },
    { ...row('a2', 'second', [[1000, 2]]), refId: 'a', unit: 'percent' },
    { ...row('b1', 'second', [[1000, 9000]]), refId: 'b', unit: 'bytes' }
  ];
  expect(
    splitMetricSeries(series, { mode: 'split', hidden: [], splitBy: 'host' }).groups.map(group => group.value)
  ).toEqual(['first', 'second']);
  expect(
    splitMetricSeries(series, { mode: 'split', hidden: [], splitBy: 'host', splitRankBy: 'b' }).groups.map(
      group => group.value
    )
  ).toEqual(['second', 'first']);
});
it('preserves hidden rank data and resolves removed rank to the same effective selector', () => {
  const visible = [
    { ...row('b1', 'first', [[1000, 1]]), refId: 'b' },
    { ...row('b2', 'second', [[1000, 99]]), refId: 'b' }
  ];
  const all = [
    ...visible,
    { ...row('a1', 'first', [[1000, 8]]), refId: 'a' },
    { ...row('a2', 'second', [[1000, 2]]), refId: 'a' }
  ];
  const hidden = splitMetricSeries(visible, { mode: 'split', hidden: ['a'], splitBy: 'host', splitRankBy: 'a' }, all);
  expect(hidden.groups.map(group => group.value)).toEqual(['first', 'second']);
  expect(hidden.rankBy).toBe('a');
  const removed = splitMetricSeries(visible, { mode: 'split', hidden: [], splitBy: 'host', splitRankBy: 'z' }, all);
  expect(removed.rankBy).toBe('b');
  expect(removed.groups.map(group => group.value)).toEqual(['second', 'first']);
});
