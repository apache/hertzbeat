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

import { expect, it } from 'vitest';
import type { LogAnalysisResult } from '@/platform/perses';
import { formulaOnlySeries, formulaOnlyValues } from '@/platform/perses';

const data = {
  window: { start: 1000, end: 3000 },
  view: 'timeseries',
  matchingTotal: 4,
  truncated: false,
  intervalMs: 1000,
  groups: [
    {
      kind: 'all',
      value: null,
      count: 4,
      buckets: [
        { start: 1000, count: 2 },
        { start: 2000, count: 2 }
      ]
    }
  ]
} as LogAnalysisResult;

it('calculates a-only formula from the applied full-window aggregate, with null on division by zero', () => {
  const result = formulaOnlyValues(data, 'a * 2');
  expect(result.groups[0]).toMatchObject({ value: 8, buckets: [{ value: 4 }, { value: 4 }] });
  expect(formulaOnlyValues(data, 'a / 0').groups[0]?.buckets.map(bucket => bucket.value)).toEqual([null, null]);
  expect(formulaOnlyValues({ ...data, truncated: true }, 'a').truncated).toBe(true);
});

it('plots real bucket a * 2 while hidden a remains the formula operand', () => {
  const series = formulaOnlySeries(data, 'a * 2', ['a'], () => 'all').outcome.data.series;
  expect(series).toHaveLength(1);
  expect(series[0]?.name).toContain('f1');
  expect(series[0]?.points.map(point => point.value)).toEqual([4, 4]);
});

it('normalizes full-window and bucket throughput before evaluating f1', () => {
  const values = formulaOnlyValues({ ...data, transform: 'throughput' }, 'a * 2');
  expect(values.groups[0]).toMatchObject({ a: 2, value: 4, buckets: [{ value: 4 }, { value: 4 }] });
});
