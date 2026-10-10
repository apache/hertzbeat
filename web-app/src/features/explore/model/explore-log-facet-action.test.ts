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
import { logFacetAction } from './explore-log-facet-action';
import { withoutSimpleFacetField } from './explore-log-structured-facet-action';
import { draftFromQuery, type LogExploreSubmissionDraft } from './explore-submission-model';
import type { LogExploreQuery } from './explore-query';
import { buildExplorePath, parseExploreQuery } from './explore-url-model';
import { buildSavedQueryPayload, readSavedQuery } from './explore-saved-query-model';
const scope: LogExploreQuery = { signal: 'logs', timeRange: 'last-30m', query: '' };
const draft = draftFromQuery(scope) as LogExploreSubmissionDraft;
it('adds legacy facet selections to the visible query', () => {
  const field = { id: 'attribute:http.route', source: 'attribute' as const, key: 'http.route' };
  expect(logFacetAction(draft, scope, field, '/checkout', '=')).toMatchObject({
    patch: { query: '-@http.route:"/checkout"', searchSyntax: 'structured-v1', attributeFilter: '' }
  });
  expect(
    logFacetAction(
      { ...draft, attributeFilter: 'http.route = "/checkout" AND status != "ok"' },
      scope,
      field,
      '/checkout',
      '='
    )
  ).toMatchObject({
    selected: true,
    patch: {
      query: '-@http.route:"/checkout"',
      attributeFilter: 'http.route = "/checkout" AND status != "ok"',
      searchSyntax: 'structured-v1'
    }
  });
});
it('keeps structured facet selections in the visible query and ORs values of the same field', () => {
  const status = { id: 'builtin:severityCategory', source: 'builtin', key: 'severityCategory' } as const;
  const service = { id: 'builtin:serviceName', source: 'builtin', key: 'serviceName' } as const;
  const initial = { ...draft, searchSyntax: 'structured-v1', query: 'service:api audit_pending_probe' };
  expect(logFacetAction(initial, scope, status, 'INFO', '=', 'single')).toEqual({
    selected: false,
    update: { field: 'query', value: 'service:api audit_pending_probe AND status:"INFO"' }
  });
  const withStatus = { ...initial, query: 'service:api status:info audit_pending_probe' };
  expect(logFacetAction(withStatus, scope, status, 'WARN', '=')).toEqual({
    selected: false,
    update: { field: 'query', value: 'service:api status:("info" OR "WARN") audit_pending_probe' }
  });
  const grouped = { ...initial, query: 'service:api status:(info OR warn)' };
  expect(logFacetAction(grouped, scope, status, 'WARN', '=').selected).toBe(true);
  expect(logFacetAction(grouped, scope, status, 'WARN', '=', 'single')).toEqual({
    selected: false,
    update: { field: 'query', value: 'service:api status:"WARN"' }
  });
  expect(logFacetAction(grouped, scope, service, 'billing', '=')).toEqual({
    selected: false,
    update: { field: 'query', value: 'service:("api" OR "billing") status:(info OR warn)' }
  });
  const afterStatus = { ...initial, query: 'service:api audit_pending_probe AND status:"INFO"' };
  expect(logFacetAction(afterStatus, scope, service, 'billing', '=')).toEqual({
    selected: false,
    update: { field: 'query', value: 'service:("api" OR "billing") audit_pending_probe AND status:"INFO"' }
  });
  expect(
    logFacetAction({ ...initial, query: 'service:api status:info' }, scope, status, 'INFO', '=', 'single')
  ).toEqual({
    selected: true,
    update: { field: 'query', value: 'service:api' }
  });
  expect(
    logFacetAction({ ...initial, query: 'service:api -status:error' }, scope, status, 'INFO', '=', 'single')
  ).toEqual({
    selected: false,
    update: { field: 'query', value: 'service:api status:"INFO"' }
  });
});
it('does not report a value as selected when another value is ORed in the same field', () => {
  const service = { id: 'builtin:serviceName', source: 'builtin', key: 'serviceName' } as const;
  const grouped = { ...draft, searchSyntax: 'structured-v1', query: 'service:(codex-app-server OR node_repl)' };
  expect(logFacetAction(grouped, scope, service, 'codex-app-server', '=', 'single')).toEqual({
    selected: false,
    update: { field: 'query', value: 'service:"codex-app-server"' }
  });
});
it('retains raw facet toggle and selected state in a calculated v2 query', () => {
  const field = { id: 'builtin:serviceName', source: 'builtin', key: 'serviceName' } as const;
  const current = { ...draft, searchSyntax: 'structured-v2', query: 'service:api' } as const;
  expect(logFacetAction(current, scope, field, 'worker', '=')).toEqual({
    selected: false,
    update: { field: 'query', value: 'service:("api" OR "worker")' }
  });
  expect(logFacetAction(current, scope, field, 'api', '=').selected).toBe(true);
});
it('treats unconstrained structured facets as all selected and toggles by exclusion', () => {
  const status = { id: 'builtin:severityCategory', source: 'builtin', key: 'severityCategory' } as const;
  const unconstrained = { ...draft, searchSyntax: 'structured-v1', query: 'service:api' };
  expect(logFacetAction(unconstrained, scope, status, 'ERROR', '=')).toEqual({
    selected: true,
    update: { field: 'query', value: 'service:api AND -status:"ERROR"' }
  });
  const excluded = { ...unconstrained, query: 'service:api -status:error' };
  expect(logFacetAction(excluded, scope, status, 'ERROR', '=')).toEqual({
    selected: false,
    update: { field: 'query', value: 'service:api' }
  });
  expect(logFacetAction(excluded, scope, status, 'INFO', '=')).toEqual({
    selected: true,
    update: { field: 'query', value: 'service:api -status:("error" OR "INFO")' }
  });
});
it('escapes a colon in a structured attribute key and toggles its exact clause', () => {
  const field = { id: 'attribute:zone:part', source: 'attribute', key: 'zone:part' } as const;
  const initial = { ...draft, searchSyntax: 'structured-v1', query: '' };
  expect(logFacetAction(initial, scope, field, 'east', '=', 'single')).toEqual({
    selected: false,
    update: { field: 'query', value: '@zone\\:part:"east"' }
  });
  const selected = { ...initial, query: '@zone\\:part:"east"' };
  expect(logFacetAction(selected, scope, field, 'east', '=').selected).toBe(true);
});
it('keeps quoted OR text intact when toggling a grouped facet', () => {
  const field = { id: 'attribute:message', source: 'attribute', key: 'message' } as const;
  const current = { ...draft, searchSyntax: 'structured-v1', query: '@message:("a OR b" OR "c")' };
  expect(logFacetAction(current, scope, field, 'a OR b', '=')).toEqual({
    selected: true,
    update: { field: 'query', value: '@message:"c"' }
  });
});
it('removes only simple own-field clauses from a facet value scope', () => {
  expect(withoutSimpleFacetField('service:api AND -service:"old" AND status:("INFO" OR "WARN")', 'service')).toBe(
    'status:("INFO" OR "WARN")'
  );
  expect(withoutSimpleFacetField('service:a OR service:b', 'service')).toBe('service:a OR service:b');
  expect(withoutSimpleFacetField('@region:"a OR b" AND service:api', '@region')).toBe('service:api');
});
it('does not weaken entity identity, invalid drafts, or unrepresentable literals', () => {
  const field = { id: 'resource:service.name', source: 'resource' as const, key: 'service.name' };
  expect(logFacetAction(draft, { ...scope, entityId: '1' }, field, 'checkout', '=')).toEqual({ selected: false });
  expect(logFacetAction({ ...draft, resourceFilter: 'broken (' }, scope, field, 'checkout', '=')).toEqual({
    selected: false
  });
  expect(logFacetAction(draft, scope, field, '', '=')).toEqual({ selected: false });
  expect(logFacetAction(draft, scope, field, '!operator', '=')).toMatchObject({
    selected: true,
    patch: { query: '-resource.service.name:"!operator"', searchSyntax: 'structured-v1' }
  });
});
it('uses dedicated builtin fields for inclusion and an atomic structured patch for safe exclusion', () => {
  const field = { id: 'builtin:severityCategory', source: 'builtin' as const, key: 'severityCategory' };
  expect(logFacetAction(draft, scope, field, 'ERROR', '=')).toMatchObject({
    selected: true,
    patch: { query: '-status:"ERROR"', searchSyntax: 'structured-v1', severityCategory: '' }
  });
  expect(logFacetAction(draft, scope, field, 'ERROR', '!=')).toMatchObject({
    selected: false,
    patch: { query: '-status:"ERROR"', searchSyntax: 'structured-v1' }
  });
  expect(logFacetAction(draft, scope, field, 'unknown', '=')).toEqual({ selected: false });
});
it('adds exact builtin exclusion, accumulates service exclusions and removes only a top-level selected clause', () => {
  const structured = { ...draft, searchSyntax: 'structured-v1', query: 'service:a OR service:b' };
  const service = { id: 'builtin:serviceName', source: 'builtin', key: 'serviceName' } as const;
  const environment = { id: 'builtin:environment', source: 'builtin', key: 'environment' } as const;
  expect(logFacetAction(structured, scope, service, 'checkout', '!=')).toEqual({
    selected: false,
    update: { field: 'query', value: '(service:a OR service:b) AND -service:"checkout"' }
  });
  const first = { ...structured, query: '-service:"checkout"' };
  expect(logFacetAction(first, scope, service, 'billing', '!=')).toEqual({
    selected: false,
    update: { field: 'query', value: '-service:("checkout" OR "billing")' }
  });
  expect(
    logFacetAction({ ...first, query: '-service:"checkout" AND -service:"billing"' }, scope, service, 'checkout', '!=')
  ).toEqual({
    selected: true,
    update: { field: 'query', value: '-service:"billing"' }
  });
  expect(
    logFacetAction(
      { ...structured, query: '(@route:x OR @route:y) AND -service:"checkout"' },
      scope,
      service,
      'checkout',
      '!='
    )
  ).toEqual({
    selected: true,
    update: { field: 'query', value: '(@route:x OR @route:y)' }
  });
  expect(
    logFacetAction({ ...structured, query: 'service:a OR -service:"checkout"' }, scope, service, 'checkout', '!=')
  ).toEqual({
    selected: false,
    update: { field: 'query', value: '(service:a OR -service:"checkout") AND -service:"checkout"' }
  });
  expect(
    logFacetAction(
      { ...structured, query: '-service:"checkout" AND service:a OR service:b' },
      scope,
      service,
      'checkout',
      '!='
    )
  ).toEqual({
    selected: false,
    update: { field: 'query', value: '(-service:"checkout" AND service:a OR service:b) AND -service:"checkout"' }
  });
  expect(logFacetAction({ ...structured, query: '-env:"prod"' }, scope, environment, 'prod', '!=')).toEqual({
    selected: true,
    update: { field: 'query', value: '' }
  });
  expect(
    logFacetAction({ ...structured, query: '(service:a)OR(service:b)' }, scope, service, 'checkout', '!=')
  ).toEqual({
    selected: false,
    update: { field: 'query', value: '((service:a)OR(service:b)) AND -service:"checkout"' }
  });
  expect(
    logFacetAction(
      { ...structured, query: '-status:"INFO" and service:a' },
      scope,
      { id: 'builtin:severityCategory', source: 'builtin', key: 'severityCategory' },
      'INFO',
      '!='
    )
  ).toEqual({
    selected: false,
    update: { field: 'query', value: '(-status:"INFO" and service:a) AND -status:"INFO"' }
  });
  expect(
    logFacetAction(
      { ...structured, query: '-service:"checkout" AND -service:"checkout"' },
      scope,
      service,
      'checkout',
      '!='
    )
  ).toEqual({
    selected: true,
    update: { field: 'query', value: '' }
  });
  expect(logFacetAction(structured, scope, service, 'a"b\\c', '!=')).toEqual({
    selected: false,
    update: { field: 'query', value: '(service:a OR service:b) AND -service:"a\\"b\\\\c"' }
  });
  expect(logFacetAction({ ...structured, query: '-service:"a\\"b\\\\c"' }, scope, service, 'a"b\\c', '!=')).toEqual({
    selected: true,
    update: { field: 'query', value: '' }
  });
});
it('toggles two generated service exclusions all the way back to an empty query', () => {
  const service = { id: 'builtin:serviceName', source: 'builtin', key: 'serviceName' } as const;
  let current = { ...draft, searchSyntax: 'structured-v1', query: '' };
  for (const value of ['checkout', 'billing', 'billing', 'checkout']) {
    const action = logFacetAction(current, scope, service, value, '!=');
    if (!action.update || action.update.field !== 'query') throw new Error('Expected query update');
    current = { ...current, query: action.update.value };
  }
  expect(current.query).toBe('');
});
it.each([
  ['checkout', 'billing', 'orders', 'orders', 'billing', 'checkout'],
  ['checkout', 'billing', 'orders', 'checkout', 'billing', 'orders']
])('toggles three generated exclusions in any order: %s', (...values) => {
  const service = { id: 'builtin:serviceName', source: 'builtin', key: 'serviceName' } as const;
  let current = { ...draft, searchSyntax: 'structured-v1', query: '' };
  for (const value of values) {
    const action = logFacetAction(current, scope, service, value, '!=');
    if (!action.update || action.update.field !== 'query') throw new Error('Expected query update');
    current = { ...current, query: action.update.value };
  }
  expect(current.query).toBe('');
});
it('carries generated exclusions through URL and saved-query readback with the current scope', () => {
  const severity = { id: 'builtin:severityCategory', source: 'builtin', key: 'severityCategory' } as const;
  const scoped = { ...scope, severityCategory: 'DEBUG', start: 1000, end: 2000 };
  const action = logFacetAction(draftFromQuery(scoped) as LogExploreSubmissionDraft, scoped, severity, 'INFO', '!=');
  const applied = { ...scoped, ...action.patch, signal: 'logs' as const, timeRange: 'last-30m' as const };
  const reopened = parseExploreQuery(new URLSearchParams(buildExplorePath(applied).split('?')[1]));
  expect(reopened).toMatchObject({
    severityCategory: undefined,
    start: 1000,
    end: 2000,
    query: 'status:"DEBUG" AND -status:"INFO"',
    searchSyntax: 'structured-v1'
  });
  expect(readSavedQuery(buildSavedQueryPayload(reopened, 'exclusion', 'Exclusion', ''))).toMatchObject({
    kind: 'ready',
    query: { severityCategory: undefined, query: 'status:"DEBUG" AND -status:"INFO"', searchSyntax: 'structured-v1' }
  });
});
it('never removes a locally scoped exclusion when an escaped unquoted OR is present', () => {
  const severity = { id: 'builtin:severityCategory', source: 'builtin', key: 'severityCategory' } as const;
  const current = { ...draft, searchSyntax: 'structured-v1', query: '-status:"INFO" AND service:a O\\R service:b' };
  expect(logFacetAction(current, scope, severity, 'INFO', '!=')).toEqual({
    selected: false,
    update: { field: 'query', value: '(-status:"INFO" AND service:a O\\R service:b) AND -status:"INFO"' }
  });
});
it('quotes legacy text before adding a visible facet and preserves locked service scope', () => {
  const service = { id: 'builtin:serviceName', source: 'builtin', key: 'serviceName' } as const;
  const environment = { id: 'builtin:environment', source: 'builtin', key: 'environment' } as const;
  const severity = { id: 'builtin:severityCategory', source: 'builtin', key: 'severityCategory' } as const;
  expect(logFacetAction({ ...draft, query: 'timeout' }, scope, severity, 'INFO', '!=')).toMatchObject({
    selected: false,
    patch: { query: '"timeout" AND -status:"INFO"', searchSyntax: 'structured-v1' }
  });
  expect(logFacetAction(draft, { ...scope, serviceName: 'checkout' }, service, 'checkout', '!=')).toEqual({
    selected: false
  });
  expect(logFacetAction(draft, { ...scope, environment: 'prod' }, environment, 'dev', '!=')).toEqual({
    selected: false
  });
  expect(logFacetAction(draft, { ...scope, entityId: '7' }, service, 'checkout', '!=')).toEqual({ selected: false });
  expect(logFacetAction({ ...draft, severityCategory: 'INFO' }, scope, severity, 'DEBUG', '!=')).toMatchObject({
    selected: false,
    patch: { query: 'status:"INFO" AND -status:"DEBUG"', searchSyntax: 'structured-v1' }
  });
});
it('adds structured raw facets outside the existing OR without guessing toggle removal', () => {
  const structured = { ...draft, searchSyntax: 'structured-v1', query: 'service:a OR service:b' };
  const field = { id: 'attribute:http.route', source: 'attribute' as const, key: 'http.route' };
  expect(logFacetAction(structured, scope, field, '/checkout', '=', 'single')).toEqual({
    selected: false,
    update: { field: 'query', value: '(service:a OR service:b) AND @http.route:"/checkout"' }
  });
  expect(logFacetAction(structured, scope, field, '/checkout', '!=')).toEqual({
    selected: false,
    update: { field: 'query', value: '(service:a OR service:b) AND -@http.route:"/checkout"' }
  });
  expect(logFacetAction({ ...structured, searchSyntax: 'future' }, scope, field, '/checkout', '=')).toEqual({
    selected: false
  });
  expect(
    logFacetAction(
      structured,
      { ...scope, entityId: '1' },
      { id: 'resource:service.name', source: 'resource', key: 'service.name' },
      'other',
      '='
    )
  ).toEqual({ selected: false });
});

it('escapes values when upgrading a legacy facet action into the visible query', () => {
  const field = { id: 'attribute:proof.value', source: 'attribute', key: 'proof.value' } as const;
  expect(logFacetAction(draft, scope, field, 'Rare%_\\tail', '=')).toMatchObject({
    selected: true,
    patch: { query: '-@proof.value:"Rare%_\\\\tail"', searchSyntax: 'structured-v1' }
  });
  expect(draft.searchSyntax).toBe('');
});
