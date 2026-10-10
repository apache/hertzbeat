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

import { z } from 'zod';
const count = z.number().int().nonnegative().safe();
const field = z.enum(['serviceName', 'operationName', 'environment']);
const population = z.enum(['matched_traces', 'matched_spans']);
const windowSchema = z
  .object({ start: count.positive(), end: count.positive(), endExclusive: z.boolean() })
  .strict()
  .refine(value => value.end > value.start && value.end - value.start <= 86_400_000);
const coverage = z
  .object({
    mode: z.enum(['window', 'bounded']),
    rowLimit: count.nullable(),
    scannedRows: count.nullable(),
    truncated: z.boolean()
  })
  .strict()
  .refine(value =>
    value.mode === 'window'
      ? value.rowLimit === null && value.scannedRows === null && !value.truncated
      : value.rowLimit !== null &&
        value.rowLimit > 0 &&
        value.scannedRows !== null &&
        value.scannedRows <= value.rowLimit &&
        (!value.truncated || value.scannedRows === value.rowLimit)
  );
function evidence<T extends z.ZodTypeAny>(data: T) {
  return z
    .object({
      state: z.enum(['ready', 'unavailable']),
      window: windowSchema,
      population,
      coverage: coverage.nullable(),
      data: data.nullable()
    })
    .strict()
    .refine(value =>
      value.state === 'ready'
        ? value.coverage !== null && 'data' in value && value.data !== null
        : value.coverage === null && 'data' in value && value.data === null
    );
}
const counted = { count, errorCount: count };
const bucket = z.object({ start: count, end: count, endExclusive: z.boolean(), ...counted }).strict();
const histogramDataSchema = z
  .object({
    totalCount: count,
    errorCount: count,
    intervalMs: count.positive(),
    buckets: z.array(bucket).min(1).max(60)
  })
  .strict();
export const traceHistogramSchema = evidence(histogramDataSchema).refine(validHistogram);

function validHistogram(value: z.infer<ReturnType<typeof evidence<typeof histogramDataSchema>>>) {
  const data = value.data;
  if (!data) return true;
  let end = value.window.start;
  let total = 0;
  let errors = 0;
  for (const [index, item] of data.buckets.entries()) {
    const finalBucket = index === data.buckets.length - 1;
    if (!validBucketBounds(item, end, value.window.end, data.intervalMs, finalBucket, value.window.endExclusive)) {
      return false;
    }
    end = item.end;
    total += item.count;
    errors += item.errorCount;
  }
  return end === value.window.end && total === data.totalCount && errors === data.errorCount && errors <= total;
}

function validBucketBounds(
  item: z.infer<typeof bucket>,
  expectedStart: number,
  windowEnd: number,
  intervalMs: number,
  finalBucket: boolean,
  windowEndExclusive: boolean
) {
  return (
    item.start === expectedStart &&
    item.end > item.start &&
    item.end <= windowEnd &&
    item.end - item.start <= intervalMs &&
    item.errorCount <= item.count &&
    item.endExclusive === (finalBucket ? windowEndExclusive : true)
  );
}
const valueCount = z.object({ value: z.string(), ...counted }).strict();
const groupCount = z.object({ value: z.string().nullable(), ...counted }).strict();
const membership = z.enum(['single', 'multiple']);
export const traceFacetSchema = evidence(
  z
    .object({
      field,
      totalCount: count,
      missingCount: count,
      membership,
      values: z.array(valueCount).max(100),
      truncated: z.boolean()
    })
    .strict()
).refine(value => {
  const data = value.data;
  if (!data) return true;
  return (
    validMembership(value.population, data.membership) &&
    data.missingCount <= data.totalCount &&
    validCounts(data.values, data.totalCount) &&
    (data.membership === 'multiple' || partitionCount(data.values, data.missingCount, data.totalCount, data.truncated))
  );
});
export const traceGroupsSchema = evidence(
  z
    .object({
      groupBy: field,
      totalCount: count,
      membership,
      orderBy: z.enum(['count-desc', 'error-count-desc']),
      groups: z.array(groupCount).max(100),
      truncated: z.boolean()
    })
    .strict()
).refine(value => {
  const data = value.data;
  return (
    !data ||
    (validMembership(value.population, data.membership) &&
      validCounts(data.groups, data.totalCount) &&
      (data.membership === 'multiple' || partitionCount(data.groups, 0, data.totalCount, data.truncated)))
  );
});
const nano = z.string().regex(/^\d+$/u).max(20);
const spanRow = z
  .object({
    traceId: z.string().regex(/^[a-f0-9]{32}$/u),
    spanId: z.string().regex(/^[a-f0-9]{16}$/u),
    parentSpanId: z.string().nullable(),
    serviceName: z.string().nullable(),
    serviceNamespace: z.string().nullable(),
    environment: z.string().nullable(),
    operationName: z.string().nullable(),
    spanKind: z.string().nullable(),
    status: z.enum(['ERROR', 'OK', 'UNSET']),
    startTimeUnixNano: nano,
    durationNanos: nano.nullable()
  })
  .strict();
export const traceSpanPageSchema = evidence(
  z
    .object({
      content: z.array(spanRow).max(100),
      totalElements: count,
      pageIndex: count,
      pageSize: count.positive().max(100),
      sort: z.enum(['newest', 'oldest', 'duration_desc'])
    })
    .strict()
).refine(value => {
  const data = value.data;
  if (value.population !== 'matched_spans') return false;
  if (!data) return true;
  return (
    data.content.length <= data.pageSize &&
    data.content.length <= data.totalElements &&
    new Set(data.content.map(row => `${row.traceId}/${row.spanId}`)).size === data.content.length
  );
});
function validMembership(population: string, membership: string) {
  return membership === (population === 'matched_spans' ? 'single' : 'multiple');
}
function validCounts(values: Array<{ value: string | null; count: number; errorCount: number }>, total: number) {
  return (
    new Set(values.map(item => item.value)).size === values.length &&
    values.every(item => item.count <= total && item.errorCount <= item.count)
  );
}
function partitionCount(values: Array<{ count: number }>, missing: number, total: number, truncated: boolean) {
  const sum = values.reduce((acc, item) => acc + item.count, missing);
  return truncated ? sum <= total : sum === total;
}
export type TracePopulation = z.infer<typeof population>;
export type TraceFacetField = z.infer<typeof field>;
export type TraceHistogram = z.infer<typeof traceHistogramSchema>;
export type TraceFacet = z.infer<typeof traceFacetSchema>;
export type TraceGroups = z.infer<typeof traceGroupsSchema>;
export type TraceSpanPage = z.infer<typeof traceSpanPageSchema>;
export type TraceSpanRow = z.infer<typeof spanRow>;

export type TraceLoad<T> = { state: 'idle' | 'loading' | 'ready' | 'error' | 'permission'; data?: T };
