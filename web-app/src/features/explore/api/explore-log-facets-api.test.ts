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

import { expect, it, vi } from 'vitest';
import { buildLogFacetPath, loadLogFacetValues, loadLogFacetFields } from './explore-log-facets-api';
const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/core/http/api-message', () => ({ apiMessageGet: get }));
const query = {
  signal: 'logs' as const,
  timeRange: 'last-30m' as const,
  serviceName: 'checkout',
  query: 'failed',
  attributeFilter: 'status=error',
  pageIndex: 3
};
const window = { from: 1000, to: 2000 };
const field = { id: 'attribute:http.status_code', source: 'attribute', key: 'http.status_code' };
const values = {
  state: 'ready',
  window: { start: 1000, end: 2000 },
  field,
  coverage: { mode: 'full_window' },
  matchedCount: 6,
  missingOrNullCount: 1,
  values: [
    { value: '', count: 3 },
    { value: 'unknown', count: 2 }
  ],
  truncated: false
};
it('uses the full committed scope with exact time and without pagination', () => {
  const url = new URL(buildLogFacetPath(query, window, 'values', field.id), 'http://local');
  expect(url.pathname).toBe('/api/logs/facets/values');
  expect(url.searchParams.get('start')).toBe('1000');
  expect(url.searchParams.get('end')).toBe('2000');
  expect(url.searchParams.get('attributeFilter')).toBe('status=error');
  expect(url.searchParams.get('serviceName')).toBe('checkout');
  expect(url.searchParams.has('pageIndex')).toBe(false);
  expect(url.searchParams.has('pageSize')).toBe(false);
  expect(url.searchParams.get('field')).toBe(field.id);
});
it('omits only the selected field from structured value requests', () => {
  const scoped = {
    ...query,
    searchSyntax: 'structured-v1',
    query: 'service:checkout AND status:("INFO" OR "WARN") AND @region:"east"',
    entityId: 'entity-1',
    start: 1000,
    end: 2000,
    timeZone: 'UTC',
    traceId: 'a'.repeat(32)
  };
  const statusValues = new URL(buildLogFacetPath(scoped, window, 'values', 'builtin:severityCategory'), 'http://local')
    .searchParams;
  expect(statusValues.get('search')).toBe('service:checkout AND @region:"east"');
  expect(statusValues.get('serviceName')).toBe('checkout');
  expect(statusValues.get('entityId')).toBe('entity-1');
  expect(statusValues.get('traceId')).toBe('a'.repeat(32));
  expect(statusValues.get('start')).toBe('1000');
  expect(statusValues.get('end')).toBe('2000');
  const serviceValues = new URL(buildLogFacetPath(scoped, window, 'values', 'builtin:serviceName'), 'http://local')
    .searchParams;
  expect(serviceValues.get('search')).toBe('status:("INFO" OR "WARN") AND @region:"east"');
  const fields = new URL(buildLogFacetPath(scoped, window, 'fields'), 'http://local').searchParams;
  expect(fields.get('search')).toBe(scoped.query);
});
it('preserves legacy and ambiguous Boolean value scopes', () => {
  for (const scoped of [
    { ...query, query: 'service:checkout', searchSyntax: undefined },
    { ...query, query: 'service:checkout OR @region:east', searchSyntax: 'structured-v1' }
  ]) {
    const params = new URL(buildLogFacetPath(scoped, window, 'values', 'builtin:serviceName'), 'http://local')
      .searchParams;
    expect(params.get('search')).toBe(scoped.query);
  }
});
it('preserves empty and literal unknown values independently from missing', async () => {
  get.mockResolvedValueOnce(values);
  expect(await loadLogFacetValues('path', window, field.id)).toEqual(values);
});
it('keeps unavailable counts null and rejects fabricated zero evidence', async () => {
  get.mockResolvedValueOnce({
    ...values,
    state: 'unavailable',
    values: [],
    matchedCount: null,
    missingOrNullCount: null
  });
  expect((await loadLogFacetValues('path', window, field.id)).matchedCount).toBeNull();
  get.mockResolvedValueOnce({ ...values, state: 'unavailable', values: [], matchedCount: 0 });
  await expect(loadLogFacetValues('path', window, field.id)).rejects.toThrow();
});
it.each([{ window: { start: 1, end: 2 } }, { field: { ...field, id: 'attribute:other' } }, { matchedCount: 1 }])(
  'rejects mismatched or impossible evidence %j',
  async patch => {
    get.mockResolvedValueOnce({ ...values, ...patch });
    await expect(loadLogFacetValues('path', window, field.id)).rejects.toThrow();
  }
);
it('preserves bounded field discovery separately from exact value counts', async () => {
  const fields = {
    state: 'ready',
    window: { start: 1000, end: 2000 },
    coverage: { mode: 'bounded_rows', rowLimit: 1000, scannedRows: 1000, hasMore: true },
    fields: [field],
    truncated: false
  };
  get.mockResolvedValueOnce(fields);
  expect(await loadLogFacetFields('path', window)).toEqual(fields);
});
it('accepts optional scalar evidence from bounded field discovery', async () => {
  const fields = {
    state: 'ready',
    window: { start: 1000, end: 2000 },
    coverage: { mode: 'bounded_rows', rowLimit: 1000, scannedRows: 1, hasMore: false },
    fields: [
      { ...field, scalar: true },
      { id: 'attribute:tags', source: 'attribute', key: 'tags', scalar: false }
    ],
    truncated: false
  };
  get.mockResolvedValueOnce(fields);
  expect(await loadLogFacetFields('path', window)).toEqual(fields);
});

it('looks up literal values before rank and validates independent search counts', async () => {
  const search = 'Rare%_\\tail ';
  const path = buildLogFacetPath(query, window, 'values', field.id, search);
  expect(new URL(path, 'http://local').searchParams.get('valueSearch')).toBe(search);
  const found = {
    ...values,
    matchedCount: 44,
    missingOrNullCount: 1,
    values: [{ value: search, count: 1 }],
    search: { query: search, matchedCount: 1 }
  };
  get.mockResolvedValueOnce(found);
  expect(await loadLogFacetValues(path, window, field.id, undefined, search)).toEqual(found);
  for (const patch of [
    { search: { query: 'other', matchedCount: 1 } },
    { search: undefined },
    { search: { query: search, matchedCount: 44 } }
  ]) {
    get.mockResolvedValueOnce({ ...found, ...patch });
    await expect(loadLogFacetValues(path, window, field.id, undefined, search)).rejects.toThrow();
  }
});
it('preserves full population for zero matches and unavailable search', async () => {
  const found = { ...values, values: [], search: { query: 'none', matchedCount: 0 } };
  get.mockResolvedValueOnce(found);
  expect((await loadLogFacetValues('path', window, field.id, undefined, 'none')).matchedCount).toBe(6);
  get.mockResolvedValueOnce({
    ...found,
    state: 'unavailable',
    matchedCount: null,
    missingOrNullCount: null,
    search: { query: 'none', matchedCount: null }
  });
  expect((await loadLogFacetValues('path', window, field.id, undefined, 'none')).state).toBe('unavailable');
});

it('keeps lookup admission literal, bounded and absent from field discovery', () => {
  expect(
    new URL(buildLogFacetPath(query, window, 'values', field.id, ''), 'http://local').searchParams.has('valueSearch')
  ).toBe(false);
  expect(
    new URL(buildLogFacetPath(query, window, 'fields', undefined, 'Rare'), 'http://local').searchParams.has(
      'valueSearch'
    )
  ).toBe(false);
  for (const search of [' ', '😀'.repeat(128), 'e\u0301'])
    expect(
      new URL(buildLogFacetPath(query, window, 'values', field.id, search), 'http://local').searchParams.get(
        'valueSearch'
      )
    ).toBe(search);
  for (const search of ['x'.repeat(257), '\uD800'])
    expect(() => buildLogFacetPath(query, window, 'values', field.id, search)).toThrow();
});

it('rejects a selectable zero-count value instead of inventing a match', async () => {
  get.mockResolvedValueOnce({
    ...values,
    matchedCount: 44,
    missingOrNullCount: 1,
    values: [{ value: 'phantom', count: 0 }],
    search: { query: 'phantom', matchedCount: 0 }
  });
  await expect(loadLogFacetValues('path', window, field.id, undefined, 'phantom')).rejects.toThrow();
});
