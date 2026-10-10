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
import { evaluateMetricFormula, parseMetricFormula } from './metric-formula';
import { validateMetricPlan } from './metric-plan';
it.each([
  ['abs(a)', { a: -8 }, 8],
  ['log2(a)', { a: 8 }, 3],
  ['log10(a)', { a: 100 }, 2],
  ['pow(a, b)', { a: 2, b: 3 }, 8],
  ['pow(abs(a), 2)', { a: -3 }, 9],
  ['log10(maximum(a, b))', { a: 10, b: 100 }, 2],
  ['minimum(abs(a), maximum(b, 2))', { a: -5, b: 3 }, 3]
] as const)('evaluates %s pointwise', (expression, values, expected) => {
  expect(evaluateMetricFormula(parseMetricFormula(expression).ast, values)).toBe(expected);
});
it.each([
  'abs()',
  'abs(a,b)',
  'log2(a,b)',
  'log10()',
  'pow(a)',
  'pow(a,b,c)',
  'minimum(a)',
  'maximum(a,b,c)',
  'log(a)',
  'absx(a)',
  'log2a',
  'pow(a,)',
  'ABS(a)'
])('rejects invalid function arity or name: %s', expression => {
  expect(() => parseMetricFormula(expression)).toThrow();
});
it.each([
  ['abs(a)', { a: null }],
  ['abs(a/b)', { a: 1, b: 0 }],
  ['log2(a)', { a: 0 }],
  ['log10(a)', { a: -1 }],
  ['pow(a,b)', { a: -2, b: 0.5 }],
  ['pow(a,b)', { a: 0, b: -1 }],
  ['pow(a,1000)', { a: 1000 }],
  ['pow(a,0)', { a: null }]
] as const)('keeps missing/domain/nonfinite output null: %s', (expression, values) => {
  expect(evaluateMetricFormula(parseMetricFormula(expression).ast, values)).toBeNull();
});
it('retains nesting, size and unknown-reference guards', () => {
  expect(() => parseMetricFormula('abs('.repeat(25) + 'a' + ')'.repeat(25))).toThrow();
  expect(() => parseMetricFormula(' '.repeat(256) + 'a')).toThrow();
  expect(parseMetricFormula('pow(abs(b), log2(a))').references).toEqual(['a', 'b']);
  expect(
    validateMetricPlan({
      version: 1,
      queries: [{ refId: 'a', metric: 'cpu' }],
      formulas: [{ id: 'f1', expression: 'log2(z)' }]
    })
  ).toEqual([{ row: 'f1', reason: 'reference', reference: 'z' }]);
});
