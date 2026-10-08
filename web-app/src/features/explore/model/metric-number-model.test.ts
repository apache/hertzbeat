/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { expect, it } from 'vitest';
import type { MetricSeries } from '@/platform/perses';
import { reduceMetricNumber } from './metric-number-model';
const series = (points: unknown[][]): MetricSeries => ({ key: 'a', name: 'cpu', labels: {}, unit: 's', points });
it('keeps empty, all-null and nonfinite samples empty even for count', () => {
  for (const points of [
    [],
    [[1, null]],
    [
      [1, NaN],
      [2, Infinity],
      [NaN, 1],
      [3, 'NaN']
    ]
  ])
    for (const calculation of ['latest', 'min', 'max', 'avg', 'sum', 'count'] as const)
      expect(reduceMetricNumber(series(points), calculation)).toMatchObject({ kind: 'empty', count: 0 });
});
it('latest uses the greatest valid timestamp and ignores later gaps', () => {
  expect(
    reduceMetricNumber(
      series([
        [30, null],
        [20, 4],
        [1, 8],
        [15, 2],
        [40, Infinity]
      ]),
      'latest'
    )
  ).toMatchObject({ kind: 'ready', value: 4, timestamp: 20, count: 3, unit: 's' });
});
it('reduces all returned valid points rather than a hundred-row table snapshot', () => {
  const data = series(Array.from({ length: 151 }, (_, i) => [i, i + 1]));
  for (const [calculation, value] of [
    ['min', 1],
    ['max', 151],
    ['avg', 76],
    ['sum', 11476],
    ['count', 151]
  ] as const)
    expect(reduceMetricNumber(data, calculation)).toMatchObject({ kind: 'ready', value, count: 151 });
  expect(reduceMetricNumber(data, 'count')).not.toHaveProperty('unit');
});
it('distinguishes legitimate zero, trustworthy absent units and mixed independent series', () => {
  expect(reduceMetricNumber(series([[1, 0]]), 'latest')).toMatchObject({ kind: 'ready', value: 0 });
  expect(reduceMetricNumber({ ...series([[1, 2]]), unit: undefined }, 'sum').unit).toBeUndefined();
  expect(
    [series([[1, 2]]), { ...series([[1, 9]]), unit: 'bytes' }].map(s => reduceMetricNumber(s, 'latest'))
  ).toMatchObject([
    { value: 2, unit: 's' },
    { value: 9, unit: 'bytes' }
  ]);
});
it('does not expose Infinity as a numeric value and can average large finite samples', () => {
  expect(
    reduceMetricNumber(
      series([
        [1, 1e308],
        [2, 1e308]
      ]),
      'sum'
    )
  ).toMatchObject({ kind: 'unavailable', count: 2 });
  expect(
    reduceMetricNumber(
      series([
        [1, 1e308],
        [2, 1e308]
      ]),
      'avg'
    )
  ).toMatchObject({ kind: 'ready', value: 1e308 });
});

it('preserves small finite samples through signed cancellation and reordered inputs', () => {
  for (const values of [
    [1e16, 1, -1e16],
    [1e16, -1e16, 1],
    [1, 1e16, -1e16]
  ]) {
    const item: MetricSeries = {
      key: 'signed',
      name: 'signed',
      labels: {},
      points: values.map((value, i) => [i + 1, value])
    };
    expect(reduceMetricNumber(item, 'sum')).toMatchObject({ kind: 'ready', value: 1, count: 3 });
    expect(reduceMetricNumber(item, 'avg')).toMatchObject({ kind: 'ready', value: 1 / 3, count: 3 });
  }
});

it.each([1e-16, 1e-15, Number.MIN_VALUE])(
  'keeps residual %s through intermediate overflow in every ordering',
  residual => {
    const arrangements = [
      [1e308, 1e308, -1e308, -1e308, residual],
      [1e308, -1e308, 1e308, -1e308, residual],
      [residual, 1e308, 1e308, -1e308, -1e308],
      [-1e308, -1e308, residual, 1e308, 1e308]
    ];
    for (const values of arrangements) {
      const item = series(values.map((value, i) => [i + 1, value]));
      expect(reduceMetricNumber(item, 'sum')).toMatchObject({ kind: 'ready', value: residual, count: 5 });
      expect(reduceMetricNumber(item, 'avg')).toMatchObject(
        residual === Number.MIN_VALUE
          ? { kind: 'unavailable', count: 5 }
          : { kind: 'ready', value: residual / 5, count: 5 }
      );
    }
  }
);
it('distinguishes exact cancellation from nonzero average underflow and genuine overflow', () => {
  const values = [Number.MAX_VALUE, Number.MAX_VALUE, -Number.MAX_VALUE];
  for (const points of [values, values.slice().reverse()]) {
    const item = series(points.map((value, i) => [i + 1, value]));
    expect(reduceMetricNumber(item, 'sum')).toMatchObject({ kind: 'ready', value: Number.MAX_VALUE, count: 3 });
    expect(reduceMetricNumber(item, 'avg')).toMatchObject({ kind: 'ready', value: Number.MAX_VALUE / 3, count: 3 });
  }
  expect(
    reduceMetricNumber(
      series([
        [1, Number.MIN_VALUE],
        [2, 0]
      ]),
      'avg'
    )
  ).toMatchObject({ kind: 'unavailable', count: 2 });
  expect(
    reduceMetricNumber(
      series([
        [1, 1e308],
        [2, -1e308]
      ]),
      'avg'
    )
  ).toMatchObject({ kind: 'ready', value: 0, count: 2 });
  expect(
    reduceMetricNumber(
      series([
        [1, Number.MAX_VALUE],
        [2, Number.MAX_VALUE]
      ]),
      'sum'
    )
  ).toMatchObject({ kind: 'unavailable', count: 2 });
  expect(
    reduceMetricNumber(
      series([
        [1, -Number.MAX_VALUE],
        [2, -Number.MAX_VALUE]
      ]),
      'sum'
    )
  ).toMatchObject({ kind: 'unavailable', count: 2 });
});
