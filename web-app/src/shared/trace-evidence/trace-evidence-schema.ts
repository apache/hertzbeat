/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
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

const integer = z.number().int().safe().nonnegative();
const epochMillis = integer.max(8_640_000_000_000_000);
const text = z
  .string()
  .refine(value => value.trim().length > 0)
  .nullable();
export const traceSpanIdSchema = z
  .string()
  .regex(/^[0-9a-f]{16}$/u)
  .refine(value => !/^0+$/u.test(value));
export const traceIdSchema = z
  .string()
  .regex(/^[0-9a-f]{32}$/u)
  .refine(value => !/^0+$/u.test(value));
export const positiveUint64DecimalSchema = z
  .string()
  .regex(/^[1-9]\d{0,19}$/u)
  .refine(value => value.length < 20 || value <= '18446744073709551615');
export const nonNegativeLongDecimalSchema = z
  .string()
  .regex(/^(0|[1-9]\d{0,18})$/u)
  .refine(value => value.length < 19 || value <= '9223372036854775807');

const serviceStat = z
  .object({ spanCount: integer.positive(), errorCount: integer })
  .refine(value => value.errorCount <= value.spanCount);

const representativeSpanSchema = z.object({
  spanId: traceSpanIdSchema,
  spanName: text,
  serviceName: text,
  serviceNamespace: text,
  startTime: epochMillis,
  durationNanos: integer
});
export const traceStructureShape = {
  rootState: z.enum(['unique', 'missing', 'ambiguous']),
  rootSpanCount: integer,
  representativeSpan: representativeSpanSchema,
  observedStartTime: epochMillis,
  observedEndTime: epochMillis
};
const traceEvidenceShape = {
  traceId: traceIdSchema,
  rootSpanId: traceSpanIdSchema.nullable(),
  serviceName: text,
  serviceNamespace: text,
  rootSpanName: text,
  durationNanos: integer.nullable(),
  startTime: epochMillis.nullable(),
  status: text,
  errorSpanCount: integer,
  resourceAttributes: z.record(z.string(), z.string()).nullable(),
  ...traceStructureShape,
  spanCount: integer.positive(),
  serviceStats: z.record(
    z.string().refine(value => value.trim().length > 0),
    serviceStat
  ),
  unattributedServiceStats: serviceStat.nullable()
};
export const traceEvidenceSchema = z.object(traceEvidenceShape).superRefine(validateTraceEvidence);

export type TraceEvidence = z.infer<typeof traceEvidenceSchema>;
export type RepresentativeSpan = z.infer<typeof representativeSpanSchema>;

export function validateTraceStructure(
  row: {
    rootState: 'unique' | 'missing' | 'ambiguous';
    rootSpanCount: number;
    rootSpanId: string | null;
    durationNanos: number | string | null;
    startTime: number | null;
    rootSpanName: string | null;
    serviceName: string | null;
    serviceNamespace: string | null;
    resourceAttributes: Record<string, string> | null;
    observedStartTime: number;
    observedEndTime: number;
    representativeSpan: { startTime: number; durationNanos: number };
  },
  context: z.RefinementCtx
) {
  const expected = row.rootSpanCount === 0 ? 'missing' : row.rootSpanCount === 1 ? 'unique' : 'ambiguous';
  if (
    row.rootState !== expected ||
    row.observedEndTime < row.observedStartTime ||
    row.representativeSpan.startTime !== row.observedStartTime ||
    !endWithinBounds(row.representativeSpan.startTime, row.representativeSpan.durationNanos, row.observedEndTime) ||
    !rootWithinBounds(row)
  ) {
    context.addIssue({ code: 'custom', message: 'Inconsistent observed trace structure' });
  }
  const rootValues = [row.rootSpanId, row.durationNanos, row.startTime];
  if (
    row.rootState === 'unique'
      ? rootValues.some(value => value === null)
      : [...rootValues, row.rootSpanName, row.serviceName, row.serviceNamespace, row.resourceAttributes].some(
          value => value !== null
        )
  ) {
    context.addIssue({ code: 'custom', message: 'Root evidence must match root cardinality' });
  }
}

function rootWithinBounds(row: Parameters<typeof validateTraceStructure>[0]) {
  if (row.startTime == null || row.durationNanos == null) return true;
  return (
    row.startTime >= row.observedStartTime && endWithinBounds(row.startTime, row.durationNanos, row.observedEndTime)
  );
}

function endWithinBounds(start: number, duration: number | string, end: number) {
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end)) return false;
  if (
    typeof duration === 'number'
      ? !Number.isSafeInteger(duration) || duration < 0
      : !/^(0|[1-9]\d{0,18})$/u.test(duration)
  )
    return false;
  const nanos = BigInt(duration);
  if (nanos > 9223372036854775807n) return false;
  return BigInt(start) + (nanos + 999999n) / 1000000n <= BigInt(end);
}

function validateTraceEvidence(row: z.infer<z.ZodObject<typeof traceEvidenceShape>>, context: z.RefinementCtx) {
  validateTraceStructure(row, context);
  const stats = [
    ...Object.values(row.serviceStats),
    ...(row.unattributedServiceStats ? [row.unattributedServiceStats] : [])
  ];
  const spans = stats.reduce((sum, stat) => sum + stat.spanCount, 0);
  const errors = stats.reduce((sum, stat) => sum + stat.errorCount, 0);
  if (
    !Number.isSafeInteger(spans) ||
    !Number.isSafeInteger(errors) ||
    spans !== row.spanCount ||
    errors !== row.errorSpanCount ||
    row.rootSpanCount > row.spanCount
  ) {
    context.addIssue({ code: 'custom', message: 'Service statistics do not match observed trace totals' });
  }
}
