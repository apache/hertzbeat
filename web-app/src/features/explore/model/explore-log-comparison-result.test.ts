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
import { logComparisonResultSchema } from '@/platform/perses';
const result = {
  window: { start: 1000, end: 62000 },
  analysis: {
    field: null,
    view: 'timeseries',
    limit: 20,
    order: 'count-desc',
    minCount: 1,
    measure: null,
    grouping: null
  },
  matchingA: 3,
  matchingB: 2,
  truncated: false,
  intervalMs: 60000,
  formula: '100*b/a',
  groups: [
    {
      keys: [],
      a: { count: 3 },
      b: { count: 2 },
      buckets: [
        { start: 0, a: { count: 3 }, b: { count: 0 } },
        { start: 60000, a: { count: 0 }, b: { count: 2 } }
      ]
    }
  ]
};
it('accepts complete disjoint paired buckets and proven zero cells', () => {
  expect(logComparisonResultSchema.parse(result)).toEqual(result);
});
it('rejects malformed population, grid, identity, measurement and formula', () => {
  const first = result.groups[0]!;
  for (const patch of [
    { matchingB: 1 },
    { formula: 'c/a' },
    { groups: [first, first] },
    { groups: [{ ...first, b: { count: 3 } }] },
    { groups: [{ ...first, a: { count: 0 } }] },
    { groups: [{ ...first, keys: [{ field: 'attribute:x', kind: 'value', value: 'x' }] }] },
    { groups: [{ ...first, buckets: first.buckets.slice(0, 1) }] },
    { groups: [{ ...first, buckets: first.buckets.map(b => ({ ...b, start: b.start + 1 })) }] },
    { groups: [{ ...first, a: { count: 3, measurement: { state: 'ready', sampleCount: 3, value: 0 } } }] }
  ])
    expect(logComparisonResultSchema.safeParse({ ...result, ...patch }).success).toBe(false);
});
