/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { expect, it } from 'vitest';
import { parseMetricView, encodeMetricView, visibleMetricSeries } from './metric-view';
it('strictly roundtrips number calculations and existing chart/visibility settings', () => {
  for (const numberCalculation of ['latest', 'min', 'max', 'avg', 'sum', 'count'] as const) {
    const view = {
      mode: 'number' as const,
      hidden: ['b'],
      numberCalculation,
      chart: { display: 'bar' as const, legend: false, min: 0, max: 10 }
    };
    expect(parseMetricView(encodeMetricView(view))).toEqual(view);
  }
  for (const value of [
    { mode: 'number', hidden: [], numberCalculation: 'median' },
    { mode: 'number', hidden: [], numberCalculation: null },
    { mode: 'number', hidden: [], unknown: 1 }
  ])
    expect(() => parseMetricView(JSON.stringify(value))).toThrow();
});
it('inherits output visibility but keeps all-gap number series honest without changing chart visibility', () => {
  const series = [
    { key: 'a', name: 'cpu', refId: 'a', labels: {}, points: [[1, 5]] },
    { key: 'b', name: 'cpu', refId: 'b', labels: {}, points: [[1, 10]] },
    { key: 'f1', name: 'f1', refId: 'f1', labels: {}, allowsGaps: true, points: [[1, null]] }
  ];
  expect(visibleMetricSeries(series, parseMetricView('{"mode":"number","hidden":["b"]}')).map(s => s.key)).toEqual([
    'a',
    'f1'
  ]);
  expect(visibleMetricSeries(series, parseMetricView('{"mode":"chart","hidden":["b"]}')).map(s => s.key)).toEqual([
    'a'
  ]);
});
