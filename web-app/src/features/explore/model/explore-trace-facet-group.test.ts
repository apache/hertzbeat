/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { describe, expect, it } from 'vitest';
import { draftFromQuery, buildSubmissionPatch } from './explore-submission-model';
import type { TraceExploreSubmissionDraft } from './explore-submission-types';
import type { TraceExploreQuery } from './explore-query';
import {
  readTraceFacetGroup,
  traceFacetAction,
  traceFacetModeAction,
  traceFacetClearAction
} from './explore-trace-facet-action';
const scope: TraceExploreQuery = { signal: 'traces', timeRange: 'last-30m' };
const draft = () => draftFromQuery(scope) as TraceExploreSubmissionDraft;
function apply(d: TraceExploreSubmissionDraft, patch: ReturnType<typeof traceFacetAction>) {
  expect(patch).toBeDefined();
  return { ...d, [patch!.field]: patch!.value };
}
describe('Canonical trace facet groups', () => {
  it('composes two services, two operations and environment with separate canonical filters', () => {
    let d = draft();
    d = apply(d, traceFacetAction(d, scope, 'serviceName', 'Checkout', 'include'));
    d = apply(d, traceFacetAction(d, scope, 'serviceName', 'payment', 'include'));
    d = apply(d, traceFacetAction(d, scope, 'operationName', 'GET /a', 'include'));
    d = apply(d, traceFacetAction(d, scope, 'operationName', 'POST /b', 'include'));
    d = apply(d, traceFacetAction(d, scope, 'environment', 'prod', 'exclude'));
    expect(d.resourceFilter).toBe(
      'service.name IN ("Checkout", "payment") AND deployment.environment.name NOT IN ("prod")'
    );
    expect(d.attributeFilter).toBe('span.name IN ("GET /a", "POST /b")');
    expect(d.query).toBe('');
    expect(d.serviceName).toBe('');
    expect(buildSubmissionPatch(d).valid).toBe(true);
  });
  it('toggles values, changes mode and clears only the owned group', () => {
    let d = { ...draft(), resourceFilter: 'service.name = "a" AND host.name = "kept"' };
    d = apply(d, traceFacetAction(d, scope, 'serviceName', 'b', 'include'));
    expect(readTraceFacetGroup(d, scope, 'serviceName').values).toEqual(['a', 'b']);
    d = apply(d, traceFacetModeAction(d, scope, 'serviceName', 'exclude'));
    expect(d.resourceFilter).toContain('service.name NOT IN ("a", "b")');
    d = apply(d, traceFacetAction(d, scope, 'serviceName', 'a', 'exclude'));
    expect(readTraceFacetGroup(d, scope, 'serviceName').values).toEqual(['b']);
    d = apply(d, traceFacetClearAction(d, scope, 'serviceName'));
    expect(d.resourceFilter).toBe('host.name = "kept"');
  });
  it('clears the last value to an empty filter while preserving unrelated pending fields', () => {
    let d = { ...draft(), resourceFilter: 'service.name IN ("a")', query: '', traceId: 'pending-id' };
    d = apply(d, traceFacetAction(d, scope, 'serviceName', 'a', 'include'));
    expect(d.resourceFilter).toBe('');
    expect(d.traceId).toBe('pending-id');
  });
  it.each([
    'service.name=a AND service.name=b',
    'service.name IN ("a") AND service.name NOT IN ("b")',
    'service.name=a OR service.name=b',
    'service.name LIKE a',
    'service.name =~ "a.*"',
    'service.name IN ("a",)',
    'service.name CONTAINS "a"'
  ])('protects raw advanced or ambiguous same-field expression %s', resourceFilter => {
    const d = { ...draft(), resourceFilter };
    expect(readTraceFacetGroup(d, scope, 'serviceName').state).toBe('raw');
    expect(traceFacetAction(d, scope, 'serviceName', 'c', 'include')).toBeUndefined();
    expect(traceFacetClearAction(d, scope, 'serviceName')).toBeUndefined();
    expect(d.resourceFilter).toBe(resourceFilter);
  });
  it.each(['span_name', 'spanName'])('refuses to compose over an operation alias %s', key => {
    const d = { ...draft(), attributeFilter: `${key}="GET /a"` };
    expect(readTraceFacetGroup(d, scope, 'operationName').state).toBe('raw');
    expect(traceFacetAction(d, scope, 'operationName', 'GET /b', 'include')).toBeUndefined();
  });
  it.each([
    ['serviceName', { serviceName: 'fixed' }],
    ['environment', { environment: 'prod' }],
    ['operationName', { query: 'GET /fixed' }],
    ['serviceName', { entityId: '123' }],
    ['environment', { entityId: '123' }]
  ] as const)('does not widen applied fixed %s context', (field, context) => {
    const q = { ...scope, ...context };
    const d = draftFromQuery(q) as TraceExploreSubmissionDraft;
    expect(readTraceFacetGroup(d, q, field).state).toBe('locked');
    expect(traceFacetAction(d, q, field, 'new', 'include')).toBeUndefined();
    expect(d).toEqual(draftFromQuery(q));
  });
  it('keeps workspace/entity type/namespace/instance/collector/endpoint and unrelated raw filters intact', () => {
    const q = {
      ...scope,
      entityType: 'service',
      serviceNamespace: 'commerce',
      instance: 'instance-a',
      collectorId: 'collector-a',
      endpoint: '/orders'
    };
    let d = { ...draftFromQuery(q), attributeFilter: 'http.method = "GET"' } as TraceExploreSubmissionDraft;
    d = apply(d, traceFacetAction(d, q, 'serviceName', 'Checkout', 'include'));
    expect(d.serviceNamespace).toBe('commerce');
    expect(d.instance).toBe('instance-a');
    expect(d.endpoint).toBe('/orders');
    expect(d.attributeFilter).toBe('http.method = "GET"');
    expect(Object.keys(traceFacetAction(d, q, 'serviceName', 'Other', 'include')!)).toEqual(['field', 'value']);
  });
  it('preserves original case and safely quotes comma/AND values without backend escape invention', () => {
    let d = draft();
    d = apply(d, traceFacetAction(d, scope, 'operationName', 'GET /a,b AND c', 'include'));
    expect(readTraceFacetGroup(d, scope, 'operationName').values).toEqual(['GET /a,b AND c']);
    expect(traceFacetAction(d, scope, 'operationName', 'both"and\'quotes', 'include')).toBeUndefined();
    expect(traceFacetAction(d, scope, 'operationName', String.raw`GET /a\b`, 'include')).toBeUndefined();
  });
});

it.each(['__hz_exists__', '__hz_not_exists__', '__hz_contains__:foo', '__hz_not_contains__:foo'])(
  'protects backend-reserved literal %s rather than broadening its meaning',
  value => {
    const scope: TraceExploreQuery = { signal: 'traces', timeRange: 'last-30m' };
    const d = draftFromQuery(scope) as TraceExploreSubmissionDraft;
    expect(traceFacetAction(d, scope, 'operationName', value, 'include')).toBeUndefined();
    expect(traceFacetAction(d, scope, 'serviceName', value, 'exclude')).toBeUndefined();
    const raw = { ...d, attributeFilter: `span.name IN ("${value}")` };
    expect(readTraceFacetGroup(raw, scope, 'operationName').state).toBe('raw');
    expect(traceFacetClearAction(raw, scope, 'operationName')).toBeUndefined();
  }
);

it.each(['__hz_exists__', '__hz_not_exists__', '__hz_contains__:x', '__hz_not_contains__:x'])(
  'preserves unquoted reserved raw clauses for %s',
  value => {
    const q: TraceExploreQuery = { signal: 'traces', timeRange: 'last-30m' };
    for (const expression of [`service.name=${value}`, `service.name IN (${value})`]) {
      const d = { ...draftFromQuery(q), resourceFilter: expression } as TraceExploreSubmissionDraft;
      expect(readTraceFacetGroup(d, q, 'serviceName').state).toBe('raw');
      expect(traceFacetAction(d, q, 'serviceName', 'normal', 'include')).toBeUndefined();
      expect(traceFacetModeAction(d, q, 'serviceName', 'exclude')).toBeUndefined();
      expect(traceFacetClearAction(d, q, 'serviceName')).toBeUndefined();
      expect(d.resourceFilter).toBe(expression);
    }
  }
);
