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

import { describe, expect, it } from 'vitest';
import { logInspectorFilterPatch, logInspectorFilterDisabledReason } from './explore-log-inspector-filter';
import { parseLogFilterExpression } from './explore-log-filter-expression';

const target = { scope: 'resource', key: 'service.name', value: 'checkout api' } as const;

describe('logInspectorFilterPatch', () => {
  it('keeps structured v2 when filtering or replacing a raw field', () => {
    const draft = { searchSyntax: 'structured-v2' as const, query: '#seconds:*' };
    expect(logInspectorFilterPatch(draft, { scope: 'attribute', key: 'route', value: 'api' }, '=')).toEqual({
      query: '(#seconds:*) AND @route:"api"'
    });
    expect(
      logInspectorFilterPatch(draft, { scope: 'attribute', key: 'route', value: 'api' }, '=', undefined, 'replace')
    ).toMatchObject({ searchSyntax: 'structured-v2', query: '@route:"api"' });
  });
  it('appends a literal scalar with the existing parser without changing another scope', () => {
    expect(logInspectorFilterPatch({ attributeFilter: 'status = 500' }, target, '=')).toEqual({
      resourceFilter: 'service.name = "checkout api"'
    });
    const result = logInspectorFilterPatch({ resourceFilter: 'env = prod' }, target, '!=');
    expect(result).toEqual({ resourceFilter: 'env = prod AND service.name != "checkout api"' });
    expect(parseLogFilterExpression(result!.resourceFilter!)).toMatchObject({ valid: true });
  });
  it('never overwrites an existing same field or repairs invalid syntax silently', () => {
    expect(logInspectorFilterPatch({ resourceFilter: 'service.name != old' }, target, '=')).toBeUndefined();
    expect(logInspectorFilterPatch({ resourceFilter: 'env = "unfinished' }, target, '=')).toBeUndefined();
    expect(logInspectorFilterPatch({ attributeFilter: 'service.name = other' }, target, '=')).toEqual({
      resourceFilter: 'service.name = "checkout api"'
    });
  });
  it.each(['', ' spaced ', 'line\nbreak', 'quote"', "quote'", 'path\\tail'])(
    'rejects values that backend stripping cannot preserve: %j',
    value => {
      expect(logInspectorFilterPatch({}, { ...target, value }, '=')).toBeUndefined();
    }
  );
  it('quotes delimiters literally and rejects unsafe field names', () => {
    expect(logInspectorFilterPatch({}, { scope: 'attribute', key: 'message', value: 'a AND b,c' }, '!=')).toEqual({
      attributeFilter: 'message != "a AND b,c"'
    });
    expect(logInspectorFilterPatch({}, { ...target, key: 'bad key' }, '=')).toBeUndefined();
  });
});

describe('inspector scope guards', () => {
  it.each(['hertzbeat.workspace_id', 'hertzbeat_workspace_id', 'workspace.id', 'workspace_id'])(
    'blocks backend-reserved workspace predicates: %s',
    key => {
      for (const scope of ['resource', 'attribute'] as const) {
        const field = { scope, key, value: 'default' };
        expect(logInspectorFilterDisabledReason({}, field, '=')).toBe('scope-locked');
        expect(logInspectorFilterPatch({}, field, '!=')).toBeUndefined();
      }
    }
  );
  it.each([
    ['service.name', { serviceName: 'checkout' }],
    ['service.namespace', { serviceNamespace: 'shop' }],
    ['deployment.environment.name', { environment: 'production' }],
    ['hertzbeat.entity_id', { entityId: '42' }]
  ] as const)('blocks resource scope already enforced by the query: %s', (key, scope) => {
    const field = { ...target, key };
    expect(logInspectorFilterDisabledReason({}, field, '=', scope)).toBe('scope-locked');
    expect(logInspectorFilterPatch({}, field, '!=', scope)).toBeUndefined();
    expect(logInspectorFilterPatch({}, { ...field, scope: 'attribute' }, '=', scope)).toBeDefined();
  });
  it('treats entity-bound canonical fields conservatively without inventing resolved values', () => {
    for (const key of ['service.name', 'service.namespace', 'deployment.environment.name']) {
      expect(logInspectorFilterDisabledReason({}, { ...target, key }, '=', { entityId: '42' })).toBe('scope-locked');
    }
    expect(
      logInspectorFilterPatch({}, { ...target, key: 'deployment.environment' }, '=', { entityId: '42' })
    ).toBeDefined();
    expect(logInspectorFilterPatch({}, target, '=', { serviceName: ' ' })).toBeDefined();
    expect(logInspectorFilterDisabledReason({}, target, '=')).toBeUndefined();
    expect(logInspectorFilterDisabledReason({ resourceFilter: 'service.name = old' }, target, '=')).toBe('invalid');
  });
});

it.each([
  '!value',
  '__hz_in__:a',
  '__hz_not_in__:a',
  '__hz_contains__:a',
  '__hz_not_contains__:a',
  '__hz_exists__',
  '__hz_not_exists__'
])('rejects backend operator encodings as scalar literals: %s', value => {
  for (const operator of ['=', '!='] as const) {
    const field = { ...target, value };
    expect(logInspectorFilterDisabledReason({}, field, operator)).toBe('legacy-value');
    expect(logInspectorFilterPatch({}, field, operator)).toBeUndefined();
  }
});
it.each(['ordinary!', '__hz_custom__:a', 'prefix__hz_in__:a', '__hz_exists__suffix'])(
  'preserves ordinary values outside exact backend reserved encodings: %s',
  value => {
    expect(logInspectorFilterPatch({}, { ...target, value }, '=')).toBeDefined();
  }
);

it.each(['constructor', '__proto__', 'toString'])('handles ordinary resource keys inherited by objects: %s', key => {
  expect(() => logInspectorFilterDisabledReason({}, { ...target, key }, '=')).not.toThrow();
});

it('explains legacy-only scalar limits without proposing scope or unsupported-value bypasses', () => {
  const scalar = { scope: 'attribute', key: 'proof.value', value: 'Rare%_\\tail' } as const;
  expect(logInspectorFilterDisabledReason({}, scalar, '=')).toBe('legacy-value');
  expect(logInspectorFilterDisabledReason({ searchSyntax: 'structured-v1' }, scalar, '=')).toBeUndefined();
  expect(logInspectorFilterDisabledReason({}, { ...scalar, key: 'workspace_id' }, '=')).toBe('scope-locked');
  expect(logInspectorFilterDisabledReason({}, { ...scalar, value: 'line\nbreak' }, '=')).toBe('invalid');
  expect(logInspectorFilterPatch({}, scalar, '=')).toBeUndefined();
});

it('replaces only the editable filter while preserving hard query scope', () => {
  const draft = { searchSyntax: 'structured-v1' as const, query: '@status:"old"', resourceFilter: 'region = west' };
  expect(
    logInspectorFilterPatch(draft, { scope: 'attribute', key: 'status', value: 'new' }, '=', undefined, 'replace')
  ).toEqual({
    searchSyntax: 'structured-v1',
    query: '@status:"new"',
    resourceFilter: '',
    attributeFilter: ''
  });
  expect(
    logInspectorFilterPatch(
      draft,
      { scope: 'resource', key: 'service.name', value: 'other' },
      '=',
      { serviceName: 'locked' },
      'replace'
    )
  ).toBeUndefined();
});

it('uses collection grammar for nested keys without confusing dotted literal keys', () => {
  const draft = { searchSyntax: 'structured-v1' as const, query: '@status:"ok"' };
  const nested = {
    scope: 'attribute' as const,
    key: 'users',
    children: ['codes.v'],
    value: '4',
    valueKind: 'number' as const
  };
  expect(logInspectorFilterPatch(draft, nested, '=')).toEqual({ query: '(@status:"ok") AND @users[]["codes.v"][]:4' });
  expect(logInspectorFilterPatch(draft, nested, '!=')).toEqual({
    query: '(@status:"ok") AND NOT @users[]["codes.v"][]:4'
  });
  expect(logInspectorFilterPatch({}, nested, '=')).toBeUndefined();
  expect(logInspectorFilterPatch(draft, { ...nested, children: ['a', 'b', 'c', 'd'] }, '=')).toBeUndefined();
  expect(logInspectorFilterPatch(draft, { ...nested, value: '4.5' }, '=')).toBeUndefined();
  expect(logInspectorFilterPatch(draft, { ...nested, children: [], collection: true, key: 'codes' }, '=')).toEqual({
    query: '(@status:"ok") AND @codes[]:4'
  });
  expect(
    logInspectorFilterDisabledReason(draft, { ...nested, value: 'true', valueKind: 'boolean', collection: true }, '=')
  ).toBe('unsupported-collection');
});

it('keeps top-level collections out of legacy scalar filters', () => {
  const field = { scope: 'attribute', key: 'codes', value: '4', collection: true, valueKind: 'number' } as const;
  expect(logInspectorFilterPatch({}, field, '=')).toBeUndefined();
  expect(logInspectorFilterDisabledReason({}, field, '=')).toBe('legacy-value');
  expect(logInspectorFilterPatch({}, field, '=', undefined, 'replace')).toEqual({
    searchSyntax: 'structured-v1',
    query: '@codes[]:4',
    resourceFilter: '',
    attributeFilter: ''
  });
});

it('uses only whitelisted builtins and preserves hard trace and severity scope', () => {
  const trace = { scope: 'builtin', key: 'trace_id', value: 'a'.repeat(32) } as const;
  const status = { scope: 'builtin', key: 'status', value: 'ERROR' } as const;
  expect(logInspectorFilterPatch({}, trace, '=')).toEqual({
    query: 'trace_id:"' + 'a'.repeat(32) + '"',
    searchSyntax: 'structured-v1'
  });
  expect(logInspectorFilterPatch({ searchSyntax: 'structured-v1', query: 'codex' }, trace, '!=')).toEqual({
    query: '(codex) AND -trace_id:"' + 'a'.repeat(32) + '"'
  });
  expect(logInspectorFilterPatch({ query: 'literal' }, trace, '=')).toBeUndefined();
  expect(logInspectorFilterDisabledReason({ query: 'literal' }, trace, '=')).toBe('legacy-value');
  expect(logInspectorFilterPatch({ query: 'literal' }, trace, '=', undefined, 'replace')).toEqual({
    query: 'trace_id:"' + 'a'.repeat(32) + '"',
    searchSyntax: 'structured-v1',
    resourceFilter: '',
    attributeFilter: ''
  });
  expect(logInspectorFilterPatch({}, trace, '=', { traceId: 'b'.repeat(32) }, 'replace')).toBeUndefined();
  const span = { scope: 'builtin', key: 'span_id', value: 'b'.repeat(16) } as const;
  expect(logInspectorFilterPatch({}, span, '!=')).toEqual({
    query: '-span_id:"' + 'b'.repeat(16) + '"',
    searchSyntax: 'structured-v1'
  });
  expect(logInspectorFilterPatch({}, span, '=', { spanId: 'c'.repeat(16) }, 'replace')).toBeUndefined();
  expect(logInspectorFilterPatch({}, status, '=')).toEqual({ query: 'status:"ERROR"', searchSyntax: 'structured-v1' });
  expect(logInspectorFilterPatch({}, status, '=', { severityCategory: 'WARN' }, 'replace')).toBeUndefined();
  for (const invalid of [
    { ...trace, key: 'service' },
    { ...trace, key: 'workspace_id' },
    { ...trace, value: 'not-an-id' },
    { ...status, value: 'CUSTOM' },
    { ...trace, contextField: 'serviceName' as const }
  ])
    expect(logInspectorFilterPatch({}, invalid, '=')).toBeUndefined();
});
