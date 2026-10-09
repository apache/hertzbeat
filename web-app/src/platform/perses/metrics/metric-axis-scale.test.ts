/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { expect, it } from 'vitest';
import { metricAxisScaleValid } from './metric-axis-scale';
it.each([
  [{ min: -1e308, max: 1e308 }, { min: 1, max: 4 }, false],
  [{ min: 0, max: 10 }, { min: 1, max: 4 }, true],
  [{ min: -8e307, max: 8e307 }, { min: 1, max: 4 }, true],
  [{ min: -1e308 }, { min: 1, max: 4 }, true],
  [{ max: 1e308 }, { min: -1e308, max: 4 }, false],
  [{}, { min: 1, max: 4 }, true],
  [{}, { min: -8e307, max: 8e307 }, false],
  [{ min: 0, max: 1e300 }, { min: 1e299, max: 4e299 }, true]
])('resolves installed renderer scale %j with data %j safely=%s', (bounds, extent, expected) => {
  expect(metricAxisScaleValid(bounds, extent)).toBe(expected);
});

it('uses the same partial bar bounds as the runtime, without adding a zero minimum', () => {
  expect(metricAxisScaleValid({ max: 5 }, { min: 10, max: 20 }, true)).toBe(false);
  expect(metricAxisScaleValid({ max: 25 }, { min: 10, max: 20 }, true)).toBe(true);
});
