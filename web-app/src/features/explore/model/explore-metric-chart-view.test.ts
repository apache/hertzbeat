/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { expect, it } from 'vitest';
import { encodeMetricView, parseMetricView } from '@/platform/perses';
it('keeps old defaults and roundtrips chart settings with zero and an automatic upper bound', () => {
  expect(parseMetricView()).toEqual({ mode: 'chart', hidden: [] });
  const raw = JSON.stringify({ mode: 'chart', hidden: ['b', 'f1'], chart: { display: 'bar', legend: false, min: 0 } });
  const parsed = parseMetricView(raw);
  expect(JSON.parse(encodeMetricView(parsed))).toEqual(JSON.parse(raw));
});
it.each([
  { min: -1e308, max: 1e308 },
  { min: 1, max: 1 },
  { min: 2, max: 1 },
  { min: null },
  { min: '0' },
  { display: 'pie' },
  { legend: 'false' },
  { extra: true }
])('refuses unsafe chart state %j', chart => {
  expect(() => parseMetricView(JSON.stringify({ mode: 'chart', hidden: [], chart }))).toThrow();
});
it('refuses nonfinite programmatic state rather than encoding null', () => {
  expect(() => encodeMetricView({ mode: 'chart', hidden: [], chart: { min: Infinity } } as never)).toThrow();
});
