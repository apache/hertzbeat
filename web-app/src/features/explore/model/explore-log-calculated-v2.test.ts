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
import {
  appendCalculatedExtraction,
  appendCalculatedFormula,
  parseLogCalculatedV2,
  removeCalculatedField,
  updateCalculatedExtraction,
  updateCalculatedFormula,
  validLogCalculatedV2Query
} from './explore-log-calculated-v2';

it('adds a multi-capture extraction with a stable id and accepts supported builtin sources', () => {
  const next = appendCalculatedExtraction(undefined, 'regex', 'builtin:body', '(?<method>GET) (?<latency>[0-9]+)', [
    'method',
    'latency'
  ]);
  expect(parseLogCalculatedV2(next)?.fields[0]).toEqual({
    id: 'c1',
    kind: 'extraction',
    engine: 'regex',
    source: 'builtin:body',
    pattern: '(?<method>GET) (?<latency>[0-9]+)',
    captures: [{ name: 'method' }, { name: 'latency' }]
  });
  for (const source of ['builtin:serviceName', 'builtin:environment', 'builtin:severityCategory']) {
    expect(appendCalculatedExtraction(next, 'regex', source, '(?<value>.+)', ['value'])).toBeDefined();
  }
  expect(appendCalculatedExtraction(next, 'grok', 'builtin:secret', '%{WORD:method}', ['method'])).toBeUndefined();
  expect(
    appendCalculatedExtraction(next, 'grok', 'resource:service.name', '%{WORD:method}', ['method'])
  ).toBeUndefined();
  const grok = appendCalculatedExtraction(next, 'grok', 'resource:service.name', '%{WORD:status}', ['status']);
  expect(parseLogCalculatedV2(grok)?.fields.map(field => field.id)).toEqual(['c1', 'c2']);
});

it('accepts underscore capture names supported by the extraction backend', () => {
  const raw = appendCalculatedExtraction(undefined, 'grok', 'builtin:body', '^%{notSpace:audit_token}$', [
    'audit_token'
  ]);
  expect(parseLogCalculatedV2(raw)?.fields[0]).toMatchObject({
    engine: 'grok',
    captures: [{ name: 'audit_token' }]
  });
});

it('edits extraction pattern while protecting referenced capture names in search, formula and sort', () => {
  const raw = JSON.stringify({
    version: 2,
    nextFieldSeq: 3,
    fields: [
      {
        id: 'c1',
        kind: 'extraction',
        engine: 'regex',
        source: 'builtin:body',
        pattern: '(?<latency>[0-9]+)',
        captures: [{ name: 'latency' }]
      },
      { id: 'c2', kind: 'formula', name: 'seconds', expression: '#latency / 1000' }
    ]
  });
  const changed = updateCalculatedExtraction(raw, 'c1', 'grok', 'builtin:body', '%{NUMBER:latency}', ['latency']);
  expect(parseLogCalculatedV2(changed)?.fields[0]).toMatchObject({ engine: 'grok', pattern: '%{NUMBER:latency}' });
  expect(
    updateCalculatedExtraction(raw, 'c1', 'regex', 'builtin:body', '(?<duration>[0-9]+)', ['duration'])
  ).toBeUndefined();
  const noFormula = JSON.stringify({ ...JSON.parse(raw), fields: [JSON.parse(raw).fields[0]] });
  expect(
    updateCalculatedExtraction(
      noFormula,
      'c1',
      'regex',
      'builtin:body',
      '(?<duration>[0-9]+)',
      ['duration'],
      '#latency:*'
    )
  ).toBeUndefined();
  const sort = JSON.stringify({ version: 1, field: 'calculated:latency', type: 'text', direction: 'desc' });
  expect(
    updateCalculatedExtraction(noFormula, 'c1', 'regex', 'builtin:body', '(?<duration>[0-9]+)', ['duration'], '', sort)
  ).toBeUndefined();
});

const sample = {
  version: 2,
  nextFieldSeq: 4,
  fields: [
    { id: 'c1', kind: 'formula', name: 'duration_seconds', expression: '@duration_ms / 1000' },
    {
      id: 'c3',
      kind: 'extraction',
      engine: 'regex',
      source: 'builtin:body',
      pattern: '^(?<token>[A-Za-z]+) (?<latency>[0-9.]+)$',
      captures: [{ name: 'token' }, { name: 'latency' }]
    }
  ]
};

it('keeps stable ids and distinct output names for formula and multi-capture extraction', () => {
  expect(parseLogCalculatedV2(JSON.stringify(sample))).toEqual(sample);
  expect(parseLogCalculatedV2(JSON.stringify({ ...sample, nextFieldSeq: 3 }))).toBeUndefined();
  expect(
    parseLogCalculatedV2(JSON.stringify({ ...sample, fields: [...sample.fields, sample.fields[0]] }))
  ).toBeUndefined();
  expect(
    parseLogCalculatedV2(
      JSON.stringify({
        ...sample,
        fields: [sample.fields[0], { ...sample.fields[1], captures: [{ name: 'duration_seconds' }] }]
      })
    )
  ).toBeUndefined();
  expect(
    parseLogCalculatedV2(JSON.stringify({ ...sample, fields: [{ ...sample.fields[0], outputs: [] }] }))
  ).toBeUndefined();
});

it('adds a stable formula draft without reusing a deleted id', () => {
  const raw = JSON.stringify({
    version: 2,
    nextFieldSeq: 4,
    fields: [{ id: 'c1', kind: 'formula', name: 'first', expression: '@value * 2' }]
  });
  const next = parseLogCalculatedV2(appendCalculatedFormula(raw, 'second', '#first * 2'));
  expect(next?.fields.map(field => field.id)).toEqual(['c1', 'c4']);
  expect(next?.nextFieldSeq).toBe(5);
  expect(parseLogCalculatedV2(appendCalculatedFormula(undefined, 'first', '@value * 2'))?.fields[0]).toMatchObject({
    id: 'c1',
    name: 'first'
  });
});

it('edits a stable definition and blocks removal while search or another formula references its output', () => {
  const raw = JSON.stringify({
    version: 2,
    nextFieldSeq: 3,
    fields: [
      { id: 'c1', kind: 'formula', name: 'first', expression: '@value * 2' },
      { id: 'c2', kind: 'formula', name: 'second', expression: '#first * 2' }
    ]
  });
  expect(parseLogCalculatedV2(updateCalculatedFormula(raw, 'c1', 'first', '@value * 3'))?.fields[0]).toMatchObject({
    id: 'c1',
    expression: '@value * 3'
  });
  expect(removeCalculatedField(raw, 'c1', '')).toEqual({ blocked: true });
  expect(removeCalculatedField(raw, 'c2', '#second:*')).toEqual({ blocked: true });
  const afterSecond = removeCalculatedField(raw, 'c2', 'service:api');
  expect(afterSecond.blocked).toBe(false);
  expect(parseLogCalculatedV2(afterSecond.raw)?.fields.map(field => field.id)).toEqual(['c1']);
  expect(removeCalculatedField(afterSecond.raw, 'c1', 'service:api')).toEqual({ blocked: false, raw: undefined });
});

it('updates formula reference tokens on rename while protecting a referenced search', () => {
  const raw = JSON.stringify({
    version: 2,
    nextFieldSeq: 3,
    fields: [
      { id: 'c1', kind: 'formula', name: 'first', expression: '@value * 2' },
      { id: 'c2', kind: 'formula', name: 'second', expression: '#first + #firstExtra + "#first"' }
    ]
  });
  expect(updateCalculatedFormula(raw, 'c1', 'renamed', '@value * 2', '#first:*')).toBeUndefined();
  const renamed = parseLogCalculatedV2(updateCalculatedFormula(raw, 'c1', 'renamed', '@value * 2', 'service:api'));
  expect(renamed?.fields[0]).toMatchObject({ id: 'c1', name: 'renamed' });
  expect(renamed?.fields[1]).toMatchObject({ expression: '#renamed + #firstExtra + "#first"' });
});

it('keeps a calculated sort bound to its definition across delete and rename', () => {
  const raw = JSON.stringify({
    version: 2,
    nextFieldSeq: 2,
    fields: [{ id: 'c1', kind: 'formula', name: 'seconds', expression: '@duration_ms / 1000' }]
  });
  const sort = JSON.stringify({ version: 1, field: 'calculated:seconds', type: 'number', direction: 'asc' });
  expect(removeCalculatedField(raw, 'c1', '', sort)).toEqual({ blocked: true });
  expect(updateCalculatedFormula(raw, 'c1', 'duration', '@duration_ms / 1000', '', sort)).toBeUndefined();
  expect(validLogCalculatedV2Query({ logCalculatedV2: raw, searchSyntax: 'structured-v2', logSort: sort })).toBe(true);
  expect(validLogCalculatedV2Query({ logCalculatedV2: undefined, searchSyntax: 'structured-v1', logSort: sort })).toBe(
    false
  );
});

it('protects calculated grouping and measurement references during deletion and rename', () => {
  const raw = JSON.stringify({
    version: 2,
    nextFieldSeq: 2,
    fields: [{ id: 'c1', kind: 'formula', name: 'seconds', expression: '@duration_ms / 1000' }]
  });
  const grouped = JSON.stringify({
    version: 1,
    representation: 'timeseries',
    field: 'calculated:seconds',
    limit: 20,
    order: 'count-desc',
    minCount: 1
  });
  expect(removeCalculatedField(raw, 'c1', '', undefined, grouped)).toEqual({ blocked: true });
  expect(updateCalculatedFormula(raw, 'c1', 'renamed', '@duration_ms / 1000', '', undefined, grouped)).toBeUndefined();
  expect(updateCalculatedFormula(raw, 'c1', 'seconds', '@duration_ms / 2000', '', undefined, grouped)).toBeDefined();
});
