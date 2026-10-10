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

import { beforeEach, expect, it, vi } from 'vitest';
import { ApiMessageError, apiMessageGet } from '@/core/http/api-message';
import { queryHertzBeatData } from './hertzbeat-query-client';
import type { HertzBeatTraceSpansQuery, HertzBeatTraceGroupsQuery } from './hertzbeat-query-contract';
vi.mock('@/core/http/api-message', async original => ({
  ...(await original<typeof import('@/core/http/api-message')>()),
  apiMessageGet: vi.fn()
}));
const get = vi.mocked(apiMessageGet);
const common = {
  signal: 'traces' as const,
  timeWindow: { from: 1000, to: 2000 },
  endExclusive: true,
  context: { serviceName: 'checkout', environment: 'production' },
  operationName: 'GET /cart',
  resourceFilter: 'zone = west',
  attributeFilter: 'status = 500',
  errorOnly: true,
  minDurationMs: 1,
  maxDurationMs: 10,
  spanScope: 'entrypoint' as const,
  hideInternal: true,
  limit: 20
};
const spans: HertzBeatTraceSpansQuery = { ...common, queryKind: 'spans', sort: 'duration_desc' };
const groups: HertzBeatTraceGroupsQuery = {
  ...common,
  queryKind: 'groups',
  population: 'matched_traces',
  groupBy: 'operationName',
  orderBy: 'error-count-desc'
};
const envelope = {
  state: 'ready',
  window: { start: 1000, end: 2000, endExclusive: true },
  coverage: { mode: 'window', rowLimit: null, scannedRows: null, truncated: false }
};
const spanResponse = {
  ...envelope,
  population: 'matched_spans',
  data: { content: [], totalElements: 0, pageIndex: 0, pageSize: 20, sort: 'duration_desc' }
};
const groupResponse = {
  ...envelope,
  population: 'matched_traces',
  data: {
    groups: [],
    totalCount: 0,
    membership: 'multiple',
    groupBy: 'operationName',
    orderBy: 'error-count-desc',
    truncated: false
  }
};
beforeEach(() => {
  get.mockReset();
});
it.each([
  ['spans', spans, spanResponse],
  ['groups', groups, groupResponse]
] as const)('executes %s with the same-span predicates and exact scope', async (kind, query, response) => {
  get.mockResolvedValue(response);
  const result = await (query.queryKind === 'spans' ? queryHertzBeatData(query) : queryHertzBeatData(query));
  expect(result.state).toBe('ready');
  const path = String(get.mock.calls[0]?.[0]);
  const params = Object.fromEntries(new URLSearchParams(path.split('?')[1]));
  expect(path.split('?')[0]).toBe(kind === 'spans' ? '/api/traces/spans' : '/api/traces/stats/groups');
  expect(params).toMatchObject({
    start: '1000',
    end: '2000',
    endExclusive: 'true',
    serviceName: 'checkout',
    environment: 'production',
    operationName: 'GET /cart',
    resourceFilter: 'zone = west',
    attributeFilter: 'status = 500',
    errorOnly: 'true',
    minDurationMs: '1',
    maxDurationMs: '10',
    spanScope: 'entrypoint',
    hideInternal: 'true'
  });
  if (kind === 'spans')
    expect(params).toMatchObject({
      population: 'matched_spans',
      sort: 'duration_desc',
      pageIndex: '0',
      pageSize: '20'
    });
  else {
    expect(params).toMatchObject({
      population: 'matched_traces',
      groupBy: 'operationName',
      orderBy: 'error-count-desc',
      limit: '20'
    });
    expect(params).not.toHaveProperty('pageSize');
    expect(params).not.toHaveProperty('sort');
  }
});
it.each([
  ['window', { ...spanResponse, window: { ...envelope.window, end: 2001 } }],
  ['endExclusive', { ...spanResponse, window: { ...envelope.window, endExclusive: false } }],
  ['population', { ...spanResponse, population: 'matched_traces' }],
  ['pageSize', { ...spanResponse, data: { ...spanResponse.data, pageSize: 50 } }],
  ['sort', { ...spanResponse, data: { ...spanResponse.data, sort: 'newest' } }],
  ['unknown field', { ...spanResponse, extra: true }]
])('rejects the %s response mismatch', async (_name, response) => {
  get.mockResolvedValue(response);
  expect(await queryHertzBeatData(spans)).toMatchObject({ state: 'error', error: { kind: 'contract_error' } });
});
it.each([
  ['groupBy', { ...groupResponse.data, groupBy: 'serviceName' }],
  ['order', { ...groupResponse.data, orderBy: 'count-desc' }]
])('rejects a different group %s', async (_name, data) => {
  get.mockResolvedValue({ ...groupResponse, data });
  expect(await queryHertzBeatData(groups)).toMatchObject({ state: 'error', error: { kind: 'contract_error' } });
});
it('rejects excessive limits before requests and distinguishes permission from empty', async () => {
  expect(await queryHertzBeatData({ ...spans, limit: 1000 })).toMatchObject({
    state: 'error',
    error: { kind: 'invalid_request' }
  });
  expect(get).not.toHaveBeenCalled();
  get.mockRejectedValue(new ApiMessageError('Forbidden', { status: 403 }));
  expect(await queryHertzBeatData(groups)).toMatchObject({ state: 'error', error: { kind: 'permission' } });
});
it('forwards cancellation and rejects it instead of converting it to unavailable', async () => {
  const controller = new AbortController();
  get.mockImplementation(
    (_path, options) =>
      new Promise((_resolve, reject) =>
        options?.signal?.addEventListener('abort', () => reject(new ApiMessageError('Aborted')))
      )
  );
  const pending = queryHertzBeatData(spans, { signal: controller.signal });
  expect(get.mock.calls[0]?.[1]?.signal).toBe(controller.signal);
  controller.abort();
  await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
});
