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
import { evaluateMetricComposition } from './metric-evaluation';
import type { MetricSourceResult } from './metric-composition';
function evaluate(expression: string, leftUnit = 'ms', rightUnit = 'ms') {
  const sources: MetricSourceResult[] = ['a', 'b'].map((refId, index) => ({
    refId,
    metric: refId,
    state: 'ready',
    series: [
      {
        key: refId,
        name: refId,
        labels: { host: 'one' },
        unit: index ? rightUnit : leftUnit,
        points: [[1000, index ? 100 : 10]]
      }
    ]
  }));
  return evaluateMetricComposition(
    {
      version: 1,
      queries: [
        { refId: 'a', metric: 'a' },
        { refId: 'b', metric: 'b' }
      ],
      formulas: [{ id: 'f1', expression }]
    },
    sources
  )[0];
}
it.each([
  ['abs(a)', 'ms'],
  ['log2(a)', undefined],
  ['log10(a)', undefined],
  ['pow(a,1)', 'ms'],
  ['pow(a,2)', undefined],
  ['pow(a,b)', undefined],
  ['pow(a,1+0)', undefined]
] as const)('uses conservative unit policy for %s', (expression, unit) => {
  const result = evaluate(expression);
  expect(result?.state).toBe('ready');
  expect(result?.series[0]?.unit).toBe(unit);
});
it.each(['abs(minimum(a,b))', 'log10(maximum(a,b))', 'pow(a+b,0)', 'pow(a,minimum(a,b))', 'log2(abs(a-b))'])(
  'does not mask incompatible child units inside %s',
  expression => {
    expect(evaluate(expression, 'ms', 'bytes')).toMatchObject({ state: 'unavailable', reason: 'unit', series: [] });
  }
);
