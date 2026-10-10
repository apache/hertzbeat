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
import { evaluateMetricComposition } from '@/platform/perses';
import type { MetricSourceResult } from '@/platform/perses';
const plan = {
  version: 1 as const,
  queries: [
    { refId: 'a', metric: 'one' },
    { refId: 'b', metric: 'two' }
  ],
  formulas: [{ id: 'f1', expression: 'a/b' }]
};
function source(refId: string, points: number[][], labels = { host: 'one' }): MetricSourceResult {
  return { refId, state: 'ready', series: [{ key: refId, name: refId, labels, points }] };
}
it('retains missing timestamps and divide-zero as explicit gaps', () => {
  const result = evaluateMetricComposition(plan, [
    source('a', [
      [1000, 4],
      [2000, 6],
      [3000, 8]
    ]),
    source('b', [
      [1000, 2],
      [3000, 0]
    ])
  ]);
  expect(result[0]?.series[0]?.points).toEqual([
    [1000, 2],
    [2000, null],
    [3000, null]
  ]);
});
it('does not cross join labels or broaden grouping', () => {
  expect(
    evaluateMetricComposition(plan, [
      source('a', [[1000, 4]]),
      source('b', [[1000, 2]], { host: 'two' })
    ])[0]?.series.every(series => series.points[0]?.[1] === null)
  ).toBe(true);
  expect(
    evaluateMetricComposition({ ...plan, queries: [{ ...plan.queries[0]!, groupBy: 'host' }, plan.queries[1]!] }, [
      source('a', [[1000, 4]]),
      source('b', [[1000, 2]])
    ])[0]?.reason
  ).toBe('grouping');
});
it('keeps independent formulas when a source fails', () => {
  const result = evaluateMetricComposition({ ...plan, formulas: [...plan.formulas, { id: 'f2', expression: 'a*2' }] }, [
    source('a', [[1000, 4]]),
    { refId: 'b', state: 'error', series: [] }
  ]);
  expect(result[0]?.reason).toBe('source');
  expect(result[1]?.series[0]?.points).toEqual([[1000, 8]]);
});
it.each([false, true])('retains partially unmatched label groups as gaps, reversed=%s', reverse => {
  const a = source('a', [[1000, 4]]);
  a.series.push({ ...a.series[0]!, key: 'other', labels: { host: 'two' } });
  const sources = [a, source('b', [[1000, 2]])];
  const formula = reverse ? 'b/a' : 'a/b';
  const result = evaluateMetricComposition({ ...plan, formulas: [{ id: 'f1', expression: formula }] }, sources);
  expect(result[0]?.series).toHaveLength(2);
  expect(result[0]?.series.find(series => series.labels.host === 'two')?.points).toEqual([[1000, null]]);
});
it('rejects known incompatible additive units and does not borrow units for ratios', () => {
  const a = source('a', [[1000, 4]]),
    b = source('b', [[1000, 2]]);
  a.series[0]!.unit = 's';
  b.series[0]!.unit = 'bytes';
  expect(evaluateMetricComposition({ ...plan, formulas: [{ id: 'f1', expression: 'a+b' }] }, [a, b])[0]?.reason).toBe(
    'unit'
  );
  expect(evaluateMetricComposition(plan, [a, b])[0]?.series[0]?.unit).toBeUndefined();
});
it('does not silently select among duplicate label identities', () => {
  const a = source('a', [[1000, 4]]);
  a.series.push({ ...a.series[0]!, key: 'duplicate' });
  expect(evaluateMetricComposition(plan, [a, source('b', [[1000, 2]])])[0]?.reason).toBe('labels');
});
it('does not label an all-gap formula as ready', () => {
  const result = evaluateMetricComposition({ ...plan, formulas: [{ id: 'f1', expression: 'a/0' }] }, [
    source('a', [[1000, 4]]),
    source('b', [[1000, 2]])
  ]);
  expect(result[0]).toMatchObject({ state: 'empty', reason: 'samples' });
  expect(result[0]?.series[0]?.points).toEqual([[1000, null]]);
});
