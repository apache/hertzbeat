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
import { buildSignalApiPath } from './explore-api';
import { buildTraceAnalyticsPath, loadTraceAnalytics } from './explore-trace-analytics-api';
const get = vi.hoisted(() => vi.fn());
vi.mock('@/core/http/api-message', () => ({ apiMessageGet: get }));
const query = {
  signal: 'traces' as const,
  timeRange: 'last-30m' as const,
  serviceName: 'checkout',
  query: 'GET /cart',
  attributeFilter: 'status = 500',
  pageIndex: 2,
  endExclusive: true
};
const window = { from: 1000, to: 2000 };
const request = { kind: 'histogram' as const, population: 'matched_spans' as const };
beforeEach(() => get.mockReset());
it('shares executed predicates but removes presentation pagination from aggregates', () => {
  const path = buildTraceAnalyticsPath(query, window, request),
    params = new URLSearchParams(path.split('?')[1]);
  expect(params.get('serviceName')).toBe('checkout');
  expect(params.get('operationName')).toBe('GET /cart');
  expect(params.get('attributeFilter')).toBe('status = 500');
  expect(params.get('endExclusive')).toBe('true');
  expect(params.has('pageIndex')).toBe(false);
  expect(params.has('sort')).toBe(false);
  expect(params.get('population')).toBe('matched_spans');
  const spans = buildTraceAnalyticsPath(query, window, { ...request, kind: 'spans' });
  expect(new URLSearchParams(spans.split('?')[1]).get('pageIndex')).toBe('2');
});
it('rejects wrong window and population even when unavailable and forwards cancellation', async () => {
  const path = buildTraceAnalyticsPath(query, window, request),
    signal = new AbortController().signal;
  const unavailable = {
    state: 'unavailable',
    window: { start: 1000, end: 2000, endExclusive: true },
    population: 'matched_spans',
    coverage: null,
    data: null
  };
  get.mockResolvedValue(unavailable);
  expect(await loadTraceAnalytics(path, request, signal)).toEqual(unavailable);
  expect(get).toHaveBeenCalledWith(path, { signal });
  get.mockResolvedValue({ ...unavailable, window: { ...unavailable.window, endExclusive: false } });
  await expect(loadTraceAnalytics(path, request)).rejects.toThrow();
  get.mockResolvedValue({ ...unavailable, population: 'matched_traces' });
  await expect(loadTraceAnalytics(path, request)).rejects.toThrow();
});

it('forwards identical canonical groups and fixed context to all five trace shapes', () => {
  const q = {
    ...query,
    serviceNamespace: 'commerce',
    environment: 'prod',
    entityId: '123',
    monitorId: '456',
    timeZone: 'UTC',
    instance: 'i-a',
    collectorId: 'c-a',
    endpoint: '/orders',
    resourceFilter: 'hertzbeat.entity.type="service" AND service.name IN ("Checkout", "payment")',
    attributeFilter: 'span.name NOT IN ("GET /a", "POST /b")'
  };
  const paths = [
    buildSignalApiPath({ ...q, start: window.from, end: window.to }),
    ...(['spans', 'facets', 'histogram', 'groups'] as const).map(kind =>
      buildTraceAnalyticsPath(q, window, { kind, population: 'matched_spans', field: 'serviceName' })
    )
  ];
  for (const path of paths) {
    const params = new URLSearchParams(path.split('?')[1]);
    for (const key of [
      'serviceName',
      'serviceNamespace',
      'environment',
      'entityId',
      'instance',
      'collectorId',
      'endpoint',
      'resourceFilter',
      'attributeFilter'
    ] as const)
      expect(params.get(key)).toBe(String(q[key]));
    expect(params.has('entityType')).toBe(false); // Entity type is preserved through the canonical resource predicate.
    expect(params.get('operationName')).toBe('GET /cart');
    expect(params.get('start')).toBe('1000');
    expect(params.get('end')).toBe('2000');
    expect(params.get('endExclusive')).toBe('true');
  }
});
