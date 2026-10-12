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
import { logQuerySetResultSchema } from './log-query-set-result';
import { logQuerySetValues } from './log-query-set-values';

const analysis = { field: 'builtin:serviceName', limit: 25, order: 'count-desc', minCount: 1 };
const keys = [{ field: 'builtin:serviceName', kind: 'value', value: 'worker' }];
const a = { refId: 'a', alias: 'A', visible: false, search: 'service:api', analysis };
const b = { refId: 'b', alias: 'B', visible: true, search: 'service:worker', analysis };
const f1 = { refId: 'f1', alias: 'Total', visible: true, expression: 'a+b' };
const result = {
  version: 2,
  window: { start: 60000, end: 119999 },
  intervalMs: 60000,
  executed: { queries: [a, b], formulas: [f1] },
  sources: [
    {
      refId: 'a',
      alias: 'A',
      visible: false,
      sourceWindow: { start: 60000, end: 119999 },
      matchingTotal: 0,
      truncated: false,
      analysis,
      groups: [{ keys, cell: { count: 0 }, buckets: [{ start: 60000, cell: { count: 0 } }] }]
    },
    {
      refId: 'b',
      alias: 'B',
      visible: true,
      sourceWindow: { start: 60000, end: 119999 },
      matchingTotal: 3,
      truncated: false,
      analysis,
      groups: [{ keys, cell: { count: 3 }, buckets: [{ start: 60000, cell: { count: 3 } }] }]
    }
  ],
  formulas: [{ ...f1, dependsOn: ['a', 'b'] }]
};

it('keeps b-only union groups and hidden a as a real formula operand', () => {
  const decoded = logQuerySetResultSchema.parse(result);
  const values = logQuerySetValues(decoded);
  expect(values.groups).toHaveLength(1);
  expect(values.groups[0]?.values).toMatchObject({ a: 0, b: 3, f1: 3 });
  expect(values.groups[0]?.buckets[0]?.values).toMatchObject({ a: 0, b: 3, f1: 3 });
  expect(values.visible).toEqual(['b', 'f1']);
});

it('rejects a missing union cell rather than fabricating a zero', () => {
  expect(
    logQuerySetResultSchema.safeParse({ ...result, sources: [result.sources[0], { ...result.sources[1], groups: [] }] })
      .success
  ).toBe(false);
});

it('rejects inconsistent source counts and bucket totals', () => {
  expect(
    logQuerySetResultSchema.safeParse({
      ...result,
      sources: [result.sources[0], { ...result.sources[1], matchingTotal: 2 }]
    }).success
  ).toBe(false);
  const wrongBucket = {
    ...result.sources[1]!,
    groups: [{ ...result.sources[1]!.groups[0]!, buckets: [{ start: 60000, cell: { count: 2 } }] }]
  };
  expect(logQuerySetResultSchema.safeParse({ ...result, sources: [result.sources[0], wrongBucket] }).success).toBe(
    false
  );
});

it('keeps measured no-sample and divide-by-zero as null', () => {
  const measured = {
    ...result,
    executed: {
      queries: [
        {
          ...a,
          analysis: { ...analysis, measure: { function: 'avg', field: 'attribute:duration' }, order: 'measure-desc' }
        },
        b
      ],
      formulas: [{ ...f1, expression: 'b/a' }]
    },
    sources: [
      {
        ...result.sources[0],
        analysis: { ...analysis, measure: { function: 'avg', field: 'attribute:duration' }, order: 'measure-desc' },
        groups: [
          {
            keys,
            cell: { count: 0, measurement: { state: 'no_samples', sampleCount: 0, value: null } },
            buckets: [
              { start: 60000, cell: { count: 0, measurement: { state: 'no_samples', sampleCount: 0, value: null } } }
            ]
          }
        ]
      },
      result.sources[1]
    ],
    formulas: [{ ...f1, expression: 'b/a', dependsOn: ['a', 'b'] }]
  };
  const decoded = logQuerySetResultSchema.parse(measured);
  expect(logQuerySetValues(decoded).groups[0]?.values.f1).toBeNull();
});

it('keeps independently grouped sources in separate domains', () => {
  const otherAnalysis = { ...analysis, field: 'builtin:severityCategory' };
  const otherKeys = [{ field: 'builtin:severityCategory', kind: 'value', value: 'ERROR' }];
  const independent = {
    ...result,
    executed: { queries: [a, { ...b, analysis: otherAnalysis }], formulas: [] },
    sources: [
      result.sources[0],
      { ...result.sources[1], analysis: otherAnalysis, groups: [{ ...result.sources[1]!.groups[0], keys: otherKeys }] }
    ],
    formulas: []
  };
  const decoded = logQuerySetResultSchema.parse(independent);
  const rows = logQuerySetValues(decoded).groups;
  expect(rows).toHaveLength(2);
  expect(rows[0]).toMatchObject({ keys, visible: [] });
  expect(rows[0]?.values).toMatchObject({ a: 0 });
  expect(rows[0]?.values).not.toHaveProperty('b');
  expect(rows[1]).toMatchObject({ keys: otherKeys, visible: ['b'] });
  expect(rows[1]?.values).toMatchObject({ b: 3 });
  expect(rows[1]?.values).not.toHaveProperty('a');
});

it('evaluates a constant formula on the first source domain', () => {
  const constant = { refId: 'f1', alias: 'Constant', visible: true, expression: '2' };
  const decoded = logQuerySetResultSchema.parse({
    ...result,
    executed: { queries: [a, b], formulas: [constant] },
    formulas: [{ ...constant, dependsOn: [] }]
  });
  expect(logQuerySetValues(decoded).groups[0]?.values.f1).toBe(2);
  expect(logQuerySetValues(decoded).groups[0]?.buckets[0]?.values.f1).toBe(2);
});

it('applies query formula functions to actual buckets and reports cumulative summaries from the last bucket', () => {
  const twoBuckets = {
    ...result,
    sources: [
      {
        ...result.sources[0]!,
        sourceWindow: { start: 60000, end: 179999 },
        groups: [
          {
            ...result.sources[0]!.groups[0]!,
            buckets: [
              { start: 60000, cell: { count: 0 } },
              { start: 120000, cell: { count: 0 } }
            ]
          }
        ]
      },
      {
        ...result.sources[1]!,
        sourceWindow: { start: 60000, end: 179999 },
        matchingTotal: 5,
        groups: [
          {
            ...result.sources[1]!.groups[0]!,
            cell: { count: 5 },
            buckets: [
              { start: 60000, cell: { count: 2 } },
              { start: 120000, cell: { count: 3 } }
            ]
          }
        ]
      }
    ],
    window: { start: 60000, end: 179999 }
  };
  const decoded = logQuerySetResultSchema.parse(twoBuckets);
  const cumulative = logQuerySetValues(decoded, [{ ...f1, functions: [{ name: 'cumsum' as const }] }]);
  expect(cumulative.groups[0]?.buckets.map(bucket => bucket.values.f1)).toEqual([2, 5]);
  expect(cumulative.groups[0]?.values.f1).toBe(5);
  const integral = logQuerySetValues(decoded, [{ ...f1, functions: [{ name: 'integral' as const }] }]);
  expect(integral.groups[0]?.buckets.map(bucket => bucket.values.f1)).toEqual([120, 300]);
  expect(integral.groups[0]?.values.f1).toBe(300);
});

it('keeps unique no-sample cells null even when matching count is positive', () => {
  const unique = { function: 'unique', field: 'attribute:requestId' };
  const measured = {
    ...result,
    executed: {
      queries: [a, { ...b, analysis: { ...analysis, measure: unique, order: 'measure-desc' } }],
      formulas: []
    },
    sources: [
      result.sources[0],
      {
        ...result.sources[1],
        analysis: { ...analysis, measure: unique, order: 'measure-desc' },
        groups: [
          {
            keys,
            cell: { count: 3, measurement: { state: 'no_samples', sampleCount: 0, value: null } },
            buckets: [
              { start: 60000, cell: { count: 3, measurement: { state: 'no_samples', sampleCount: 0, value: null } } }
            ]
          }
        ]
      }
    ],
    formulas: []
  };
  expect(logQuerySetValues(logQuerySetResultSchema.parse(measured)).groups[0]?.values.b).toBeNull();
});

it('retains first-source group identity and order while aligning other sources and normalizing each duration', () => {
  const apiKeys = [{ field: 'builtin:serviceName', kind: 'value', value: 'api' }];
  const sourceA = {
    ...result.sources[0]!,
    matchingTotal: 2,
    analysis: { ...analysis, transform: 'throughput' },
    groups: [
      result.sources[0]!.groups[0]!,
      { keys: apiKeys, cell: { count: 2 }, buckets: [{ start: 60000, cell: { count: 2 } }] }
    ]
  };
  const sourceB = {
    ...result.sources[1]!,
    matchingTotal: 8,
    analysis: { ...analysis, transform: 'throughput' },
    groups: [
      { keys: apiKeys, cell: { count: 5 }, buckets: [{ start: 60000, cell: { count: 5 } }] },
      result.sources[1]!.groups[0]!
    ]
  };
  const decoded = logQuerySetResultSchema.parse({
    ...result,
    executed: {
      queries: [
        { ...a, analysis: sourceA.analysis },
        { ...b, analysis: sourceB.analysis }
      ],
      formulas: [f1]
    },
    sources: [sourceA, sourceB]
  });
  const values = logQuerySetValues(decoded);
  expect(values.visible).toEqual(['b', 'f1']);
  expect(values.groups.map(group => group.keys[0]?.value)).toEqual(['worker', 'api']);
  expect(values.groups[0]?.keys).toBe(decoded.sources[0]!.groups[0]!.keys);
  expect(values.groups[1]?.keys).toBe(decoded.sources[0]!.groups[1]!.keys);
  expect(values.groups[0]?.values).toEqual({ a: 0, b: 3 / 59.999, f1: 3 / 59.999 });
  expect(values.groups[1]?.values.f1).toBeCloseTo(7 / 59.999);
  expect(values.groups[1]?.buckets[0]?.values).toEqual({ a: 2 / 60, b: 5 / 60, f1: 2 / 60 + 5 / 60 });
});

it.each([
  ['ready', 1, -2, -4],
  ['no_samples', 0, null, null],
  ['non_finite', 1, null, null]
] as const)(
  'uses measured %s values instead of event counts and preserves ordered point functions',
  (state, sampleCount, value, expected) => {
    const measuredAnalysis = {
      ...analysis,
      measure: { function: 'avg', field: 'attribute:duration' },
      order: 'measure-desc'
    };
    const cell = { count: 3, measurement: { state, sampleCount, value } };
    const formula = { ...f1, expression: 'b*2' };
    const decoded = logQuerySetResultSchema.parse({
      ...result,
      executed: { queries: [a, { ...b, analysis: measuredAnalysis }], formulas: [formula] },
      sources: [
        result.sources[0],
        {
          ...result.sources[1],
          analysis: measuredAnalysis,
          groups: [{ keys, cell, buckets: [{ start: 60000, cell }] }]
        }
      ],
      formulas: [{ ...formula, dependsOn: ['b'] }]
    });
    const plain = logQuerySetValues(decoded);
    expect(plain.groups[0]?.values.b).toBe(value);
    expect(plain.groups[0]?.values.f1).toBe(expected);
    const processed = logQuerySetValues(decoded, [
      { ...formula, functions: [{ name: 'abs' }, { name: 'log10' }, { name: 'pow', exponent: 2 }] }
    ]);
    const point = expected === null ? null : Math.log10(Math.abs(expected)) ** 2;
    expect(processed.groups[0]?.values.f1).toBe(point);
    expect(processed.groups[0]?.buckets[0]?.values.f1).toBe(point);
  }
);

it('calculates the existing 100-series and 6000-bucket-cell boundary without relaxing capacity validation', () => {
  const window = { start: 60000, end: 3659999 };
  const queries = ['a', 'b', 'c', 'd'].map(refId => ({ ...a, refId, alias: refId, visible: true }));
  const groups = Array.from({ length: 25 }, (_, index) => ({
    keys: [{ field: 'builtin:serviceName', kind: 'value', value: `service-${index}` }],
    cell: { count: 0 },
    buckets: Array.from({ length: 60 }, (_, bucket) => ({ start: 60000 + bucket * 60000, cell: { count: 0 } }))
  }));
  const input = {
    ...result,
    window,
    executed: { queries, formulas: [] },
    sources: queries.map(query => ({
      ...result.sources[0],
      refId: query.refId,
      alias: query.alias,
      visible: query.visible,
      sourceWindow: window,
      groups
    })),
    formulas: []
  };
  const values = logQuerySetValues(logQuerySetResultSchema.parse(input));
  expect(values.visible).toEqual(['a', 'b', 'c', 'd']);
  expect(values.groups).toHaveLength(25);
  expect(values.groups.every(group => group.buckets.length === 60)).toBe(true);
  expect(values.groups[24]?.buckets[59]?.values).toEqual({ a: 0, b: 0, c: 0, d: 0 });
  expect(
    logQuerySetResultSchema.safeParse({
      ...input,
      executed: { queries, formulas: [f1] },
      formulas: [{ ...f1, dependsOn: ['a', 'b'] }]
    }).success
  ).toBe(false);
});

it('rejects source-count overflow with no formulas and a small series domain', () => {
  const queries = ['a', 'b', 'c', 'd', 'e'].map(refId => ({ ...a, refId, alias: refId }));
  const sources = queries.map(query => ({ ...result.sources[0], refId: query.refId, alias: query.alias }));
  const withinLimit = {
    ...result,
    executed: { queries: queries.slice(0, 4), formulas: [] },
    sources: sources.slice(0, 4),
    formulas: []
  };
  expect(logQuerySetResultSchema.safeParse(withinLimit).success).toBe(true);
  const overflow = logQuerySetResultSchema.safeParse({ ...withinLimit, executed: { queries, formulas: [] }, sources });
  expect(overflow.success).toBe(false);
  if (overflow.success) throw Error('Expected source capacity rejection');
  expect(overflow.error.issues.map(issue => issue.path)).toEqual([['executed', 'queries'], ['sources']]);
});

it('rejects formula-count overflow with one source and a small series domain', () => {
  const formulas = Array.from({ length: 5 }, (_, index) => ({
    ...f1,
    refId: `f${index + 1}`,
    expression: 'a',
    dependsOn: ['a']
  }));
  const requested = formulas.map(({ refId, alias, visible, expression }) => ({ refId, alias, visible, expression }));
  const withinLimit = {
    ...result,
    executed: { queries: [a], formulas: requested.slice(0, 4) },
    sources: [result.sources[0]],
    formulas: formulas.slice(0, 4)
  };
  expect(logQuerySetResultSchema.safeParse(withinLimit).success).toBe(true);
  const overflow = logQuerySetResultSchema.safeParse({
    ...withinLimit,
    executed: { queries: [a], formulas: requested },
    formulas
  });
  expect(overflow.success).toBe(false);
  if (overflow.success) throw Error('Expected formula capacity rejection');
  expect(overflow.error.issues.map(issue => issue.path)).toEqual([['executed', 'formulas'], ['formulas']]);
});
