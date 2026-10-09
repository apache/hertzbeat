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
import {
  traceStructureShape,
  validateTraceStructure,
  traceIdSchema as compositeTraceId,
  traceSpanIdSchema as compositeSpanId,
  positiveUint64DecimalSchema as positiveUint64Decimal,
  nonNegativeLongDecimalSchema as nonNegativeLongDecimal
} from '@/shared/trace-evidence';

const safeInteger = z.number().int().safe();
const nonNegativeInteger = safeInteger.nonnegative();
const nullableNonNegativeInteger = nonNegativeInteger.nullable();
const boundedText = z.string().trim().min(1).max(2_048);
const boundedStringMap = z.record(z.string().trim().min(1).max(192), z.string().max(4_096));
const compositeEvent = z
  .object({
    timeUnixNano: positiveUint64Decimal,
    name: z.string().max(512).nullable(),
    attributes: boundedStringMap,
    droppedAttributesCount: nullableNonNegativeInteger
  })
  .strict();
const compositeLink = z
  .object({
    traceId: compositeTraceId,
    spanId: compositeSpanId,
    traceState: z.string().max(512).nullable(),
    attributes: boundedStringMap,
    droppedAttributesCount: nullableNonNegativeInteger
  })
  .strict();
const compositeCodeHint = z
  .object({
    repositoryUrl: z.string().max(2_048).nullable(),
    provider: z.string().max(128).nullable(),
    defaultPath: z.string().max(2_048).nullable(),
    searchQuery: z.string().max(2_048).nullable(),
    label: z.string().max(256).nullable()
  })
  .strict();
const compositeSpan = z
  .object({
    spanId: compositeSpanId,
    parentSpanId: compositeSpanId.nullable(),
    spanName: boundedText.nullable(),
    serviceName: boundedText.nullable(),
    serviceNamespace: z.string().max(256).nullable(),
    deploymentEnvironment: z.string().max(128).nullable(),
    entityId: z.string().max(20).nullable(),
    entityType: z.string().max(64).nullable(),
    status: boundedText.nullable(),
    statusMessage: z.string().max(2_048).nullable(),
    spanKind: z.string().max(64).nullable(),
    traceState: z.string().max(512).nullable(),
    scopeName: z.string().max(256).nullable(),
    scopeVersion: z.string().max(128).nullable(),
    durationNanos: nonNegativeLongDecimal,
    startTimeUnixNano: nonNegativeLongDecimal,
    startTime: safeInteger.positive(),
    highlighted: z.boolean(),
    resourceAttributes: boundedStringMap,
    spanAttributes: boundedStringMap,
    events: z.array(compositeEvent).max(1_024),
    links: z.array(compositeLink).max(1_024),
    codeNavigationHint: compositeCodeHint.nullable()
  })
  .strict();
export const compositeDetail = z
  .object({
    rootSpanId: compositeSpanId.nullable(),
    serviceName: boundedText.nullable(),
    serviceNamespace: z.string().max(256).nullable(),
    deploymentEnvironment: z.string().max(128).nullable(),
    entityId: z.string().max(20).nullable(),
    entityType: z.string().max(64).nullable(),
    rootSpanName: boundedText.nullable(),
    durationNanos: nonNegativeLongDecimal.nullable(),
    status: boundedText.nullable(),
    startTime: safeInteger.nonnegative().nullable(),
    errorSpanCount: nonNegativeInteger,
    resourceAttributes: boundedStringMap.nullable(),
    ...traceStructureShape,
    missingParentCount: nonNegativeInteger,
    spans: z.array(compositeSpan).min(1).max(10_000)
  })
  .strict()
  .superRefine(validateTraceStructure);
const compositeGantt = z.discriminatedUnion('state', [
  z
    .object({
      state: z.literal('ready'),
      reason: z.literal('observed'),
      source: z.literal('greptime_traces'),
      detail: compositeDetail
    })
    .strict(),
  z
    .object({
      state: z.literal('empty'),
      reason: z.literal('no_data'),
      source: z.literal('greptime_traces'),
      detail: z.null()
    })
    .strict(),
  z
    .object({
      state: z.literal('unavailable'),
      reason: z.enum([
        'storage_unavailable',
        'malformed_data',
        'limit_exceeded',
        'identity_unavailable',
        'upstream_unavailable',
        'query_strategy_unavailable'
      ]),
      source: z.literal('greptime_traces'),
      detail: z.null()
    })
    .strict()
]);
export const traceCompositeSchema = z
  .object({
    traceId: compositeTraceId,
    selectedSpanId: compositeSpanId.nullable(),
    window: z.object({ start: safeInteger.positive(), end: safeInteger.positive() }).strict(),
    gantt: compositeGantt,
    sameTraceLogs: z.unknown(),
    red: z.unknown(),
    metrics: z.unknown(),
    dependencies: z.unknown()
  })
  .strict();
