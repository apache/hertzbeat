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
  traceHistogramSchema,
  traceFacetSchema,
  traceGroupsSchema,
  traceSpanPageSchema
} from './explore-trace-analytics';
const base = {
  state: 'ready',
  window: { start: 1000, end: 2000, endExclusive: true },
  population: 'matched_traces',
  coverage: { mode: 'window', rowLimit: null, scannedRows: null, truncated: false }
};
const histogram = {
  ...base,
  data: {
    totalCount: 3,
    errorCount: 1,
    intervalMs: 500,
    buckets: [
      { start: 1000, end: 1500, endExclusive: true, count: 1, errorCount: 0 },
      { start: 1500, end: 2000, endExclusive: true, count: 2, errorCount: 1 }
    ]
  }
};
it('requires complete consistent histogram bounds and totals instead of accepting page counts', () => {
  expect(traceHistogramSchema.parse(histogram)).toEqual(histogram);
  expect(() => traceHistogramSchema.parse({ ...histogram, data: { ...histogram.data, totalCount: 20 } })).toThrow();
  expect(() =>
    traceHistogramSchema.parse({ ...histogram, data: { ...histogram.data, buckets: [histogram.data.buckets[1]] } })
  ).toThrow();
  expect(() =>
    traceHistogramSchema.parse({
      ...histogram,
      data: { ...histogram.data, buckets: histogram.data.buckets.map(b => ({ ...b, endExclusive: false })) }
    })
  ).toThrow();
});
it('keeps unavailable evidence null and bounded evidence explicit', () => {
  expect(traceHistogramSchema.parse({ ...base, state: 'unavailable', coverage: null, data: null }).data).toBeNull();
  expect(() => traceHistogramSchema.parse({ ...histogram, state: 'unavailable' })).toThrow();
  expect(() =>
    traceHistogramSchema.parse({
      ...histogram,
      coverage: { mode: 'bounded', rowLimit: 1500, scannedRows: null, truncated: true }
    })
  ).toThrow();
  expect(() =>
    traceHistogramSchema.parse({
      ...histogram,
      coverage: { mode: 'bounded', rowLimit: 1500, scannedRows: 1, truncated: true }
    })
  ).toThrow();
  expect(
    traceHistogramSchema.parse({
      ...histogram,
      coverage: { mode: 'bounded', rowLimit: 1500, scannedRows: 1500, truncated: true }
    }).coverage
  ).toEqual({ mode: 'bounded', rowLimit: 1500, scannedRows: 1500, truncated: true });
});
it('permits multiple trace memberships but rejects fabricated partitions', () => {
  const facets = {
    ...base,
    data: {
      field: 'serviceName',
      totalCount: 3,
      missingCount: 1,
      membership: 'multiple',
      values: [
        { value: '', count: 2, errorCount: 1 },
        { value: 'unknown', count: 2, errorCount: 0 }
      ],
      truncated: false
    }
  };
  expect(traceFacetSchema.parse(facets).data?.values).toHaveLength(2);
  expect(() =>
    traceFacetSchema.parse({ ...facets, population: 'matched_spans', data: { ...facets.data, membership: 'single' } })
  ).toThrow();
  expect(() =>
    traceFacetSchema.parse({
      ...facets,
      data: { ...facets.data, values: [...facets.data.values, facets.data.values[0]] }
    })
  ).toThrow();
  const groups = {
    ...base,
    data: {
      groupBy: 'environment',
      totalCount: 3,
      membership: 'multiple',
      orderBy: 'count-desc',
      groups: [
        { value: null, count: 1, errorCount: 0 },
        { value: 'unknown', count: 3, errorCount: 1 }
      ],
      truncated: false
    }
  };
  expect(traceGroupsSchema.parse(groups).data?.groups[0]?.value).toBeNull();
});
it('preserves exact nanoseconds and refuses wrong span population or duplicate identities', () => {
  const row = {
    traceId: 'a'.repeat(32),
    spanId: 'b'.repeat(16),
    parentSpanId: null,
    serviceName: 'checkout',
    serviceNamespace: null,
    environment: null,
    operationName: 'GET',
    spanKind: 'SERVER',
    status: 'OK',
    startTimeUnixNano: '1000000001',
    durationNanos: '23'
  };
  const page = {
    ...base,
    population: 'matched_spans',
    data: { content: [row], totalElements: 1, pageIndex: 0, pageSize: 20, sort: 'newest' }
  };
  expect(traceSpanPageSchema.parse(page).data?.content[0]?.startTimeUnixNano).toBe('1000000001');
  expect(() => traceSpanPageSchema.parse({ ...page, population: 'matched_traces' })).toThrow();
  expect(() =>
    traceSpanPageSchema.parse({ ...page, data: { ...page.data, content: [row, row], totalElements: 2 } })
  ).toThrow();
});
