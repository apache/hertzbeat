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
import { parseMetricFormula, evaluateMetricFormula } from '@/platform/perses';
it('evaluates precedence, decimal constants, unary signs and documented functions', () => {
  const formula = parseMetricFormula('maximum(a, b) / (2 + .5) - -a');
  expect(formula.references).toEqual(['a', 'b']);
  expect(evaluateMetricFormula(formula.ast, { a: 2, b: 5 })).toBe(4);
});
it.each(['a / 0', 'a + b', 'a * 1e309'])('does not manufacture a numeric result for %s', expression => {
  if (expression.includes('1e')) expect(() => parseMetricFormula(expression)).toThrow();
  else expect(evaluateMetricFormula(parseMetricFormula(expression).ast, { a: 2 })).toBeNull();
});
it.each(['a.constructor', 'f1 + a', 'Math.max(a,b)', 'a ** b', 'minimum(a)', 'a b', '1;alert(1)', ''])(
  'rejects unsupported syntax %s',
  expression => {
    expect(() => parseMetricFormula(expression)).toThrow();
  }
);
it('bounds input and nesting before execution', () => {
  expect(() => parseMetricFormula('('.repeat(40) + 'a' + ')'.repeat(40))).toThrow();
  expect(() => parseMetricFormula('a+'.repeat(130) + 'a')).toThrow();
});
it('propagates explicit gaps and non-finite arithmetic', () => {
  const ast = parseMetricFormula('a / b').ast;
  expect(evaluateMetricFormula(ast, { a: null, b: 2 })).toBeNull();
  expect(evaluateMetricFormula(ast, { a: Number.MAX_VALUE, b: 0.01 })).toBeNull();
});
it('does not read inherited source values', () => {
  expect(
    evaluateMetricFormula(parseMetricFormula('a').ast, Object.create({ a: 7 }) as Record<string, number | null>)
  ).toBeNull();
});
