/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { expect, it } from 'vitest';
import { getTimeSeriesValues } from '@perses-dev/components';
it('retains epoch bucket instants when a requested window starts partway through a bucket', () => {
  const series = {
    name: 'a',
    values: [
      [0, 2],
      [300000, 3],
      [600000, 4]
    ] as [number, number | null][]
  };
  const actual = getTimeSeriesValues(series, { startMs: 263117, endMs: 663117, rangeMs: 400000, stepMs: 300000 });
  expect(actual.filter(([, value]) => value !== null)).toEqual(series.values);
});
it('preserves irregular raw sample instants and still inserts nulls for missing steps', () => {
  const actual = getTimeSeriesValues(
    {
      name: 'a',
      values: [
        [1000, 1],
        [3500, 2],
        [5000, null]
      ]
    },
    { startMs: 1000, endMs: 5000, rangeMs: 4000, stepMs: 1000 }
  );
  expect(actual.filter(([, value]) => value !== null)).toEqual([
    [1000, 1],
    [3500, 2]
  ]);
  expect(actual).toContainEqual([2000, null]);
  expect(actual).toContainEqual([5000, null]);
});
it('keeps aligned series and their existing missing-sample padding unchanged', () => {
  expect(
    getTimeSeriesValues(
      {
        name: 'a',
        values: [
          [2000, 1],
          [4000, 2]
        ]
      },
      { startMs: 1000, endMs: 5000, rangeMs: 4000, stepMs: 1000 }
    )
  ).toEqual([
    [1000, null],
    [2000, 1],
    [3000, null],
    [4000, 2],
    [5000, null]
  ]);
});
