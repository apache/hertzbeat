/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { describe, expect, it } from 'vitest';
import { logInspectorFilterPatch } from './explore-log-inspector-filter';

const draft = { searchSyntax: 'structured-v1', query: 'status:ERROR OR status:WARN' };

describe('structured inspector actions', () => {
  it('appends an exact quoted predicate outside the whole existing disjunction', () => {
    expect(logInspectorFilterPatch(draft, { scope: 'attribute', key: 'http.route', value: '/pay*' }, '=')).toEqual({
      query: '(status:ERROR OR status:WARN) AND @http.route:"/pay*"'
    });
  });
  it('preserves quotes, slashes and edge whitespace rather than dropping the action', () => {
    const value = ' "quoted" \u005ctail ';
    expect(
      logInspectorFilterPatch({ searchSyntax: 'structured-v1' }, { scope: 'attribute', key: 'detail', value }, '!=')
    ).toEqual({ query: '-@detail:' + JSON.stringify(value) });
  });
  it('does not mix unknown query semantics with legacy filters', () => {
    expect(
      logInspectorFilterPatch({ searchSyntax: 'future' }, { scope: 'attribute', key: 'detail', value: 'a' }, '=')
    ).toBeUndefined();
  });
  it('does not emit unrepresentable controls or exceed the server input bound', () => {
    expect(
      logInspectorFilterPatch(draft, { scope: 'attribute', key: 'detail', value: 'line\nbreak' }, '=')
    ).toBeUndefined();
    expect(
      logInspectorFilterPatch(
        { ...draft, query: 'x'.repeat(8190) },
        { scope: 'attribute', key: 'detail', value: 'a' },
        '='
      )
    ).toBeUndefined();
  });
  it('keeps the workspace boundary outside user-authored predicates for every alias', () => {
    for (const key of ['hertzbeat.workspace.id', 'hertzbeat_workspace_id', 'workspace.id', 'workspace_id']) {
      expect(logInspectorFilterPatch(draft, { scope: 'resource', key, value: 'other' }, '=')).toBeUndefined();
    }
  });
});

it('maps a displayed canonical service through context instead of fabricating a raw attribute', () => {
  const field = { scope: 'resource', key: 'service_name', value: 'checkout', contextField: 'serviceName' } as const;
  expect(logInspectorFilterPatch(draft, field, '=')).toEqual({ serviceName: 'checkout' });
  expect(logInspectorFilterPatch(draft, field, '!=')).toBeUndefined();
  expect(logInspectorFilterPatch(draft, field, '=', { entityId: '42' })).toBeUndefined();
});
it('keeps derived canonical identity out of raw filters in legacy searches too', () => {
  const target = { scope: 'resource', key: 'service_name', value: 'resolved', contextField: 'serviceName' } as const;
  expect(logInspectorFilterPatch({}, target, '=')).toEqual({ serviceName: 'resolved' });
  expect(logInspectorFilterPatch({}, target, '!=')).toBeUndefined();
});
