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

import { investigationLogRecordSchema, investigationTraceIdSchema } from '@/features/explore';

import {
  boundedMap,
  nonNegativeInteger,
  nonNegativeLongDecimal,
  nullableText,
  positiveLongDecimal,
  positiveTimestamp,
  requiredText,
  safeInteger
} from './alert-investigation-schema-primitives';
export { identityBlockSchema } from './alert-investigation-identity-schema';

const stateSchema = z.enum(['ready', 'empty', 'unavailable']);
const reasonSchema = z.enum([
  'observed',
  'no_data',
  'storage_unavailable',
  'malformed_data',
  'limit_exceeded',
  'identity_unavailable',
  'upstream_unavailable',
  'query_strategy_unavailable'
]);
const listBlock = <Source extends 'otlp_metrics' | 'greptime_logs' | 'greptime_traces' | 'greptime_semantic_graph'>(
  source: Source
) => z.object({ state: stateSchema, reason: reasonSchema, source: z.literal(source), truncated: z.boolean() }).strict();

const metricSeriesSchema = z
  .object({
    name: requiredText(256),
    labels: boundedMap(64, 1_024),
    points: z
      .array(z.object({ timestamp: positiveTimestamp, value: z.number().finite() }).strict())
      .min(1)
      .max(1_440)
  })
  .strict();
const traceSummarySchema = z
  .object({
    traceId: investigationTraceIdSchema,
    startTimeUnixNano: positiveLongDecimal,
    durationNanos: nonNegativeLongDecimal,
    status: z.enum(['error', 'ok', 'unset', 'unknown']),
    spanCount: nonNegativeInteger.min(1).max(5_000),
    serviceName: requiredText(256)
  })
  .strict();
const topologyEdgeSchema = z
  .object({
    observedAt: positiveTimestamp,
    sourceType: requiredText(64),
    sourceId: requiredText(512),
    targetType: requiredText(64),
    targetId: requiredText(512),
    relationType: requiredText(64),
    provenance: requiredText(64),
    confidence: z.number().finite().min(0).max(1),
    requestCount: nonNegativeInteger,
    errorCount: nonNegativeInteger
  })
  .strict()
  .refine(value => value.errorCount <= value.requestCount);

export const metricsBlockSchema = listBlock('otlp_metrics')
  .extend({ series: z.array(metricSeriesSchema).max(20) })
  .superRefine((value, context) => validateListBlock(value, value.series, context));
export const logsBlockSchema = listBlock('greptime_logs')
  .extend({ records: z.array(investigationLogRecordSchema).max(100) })
  .superRefine((value, context) => validateListBlock(value, value.records, context));
export const tracesBlockSchema = listBlock('greptime_traces')
  .extend({ traces: z.array(traceSummarySchema).max(50) })
  .superRefine((value, context) => validateListBlock(value, value.traces, context));
export const topologyBlockSchema = listBlock('greptime_semantic_graph')
  .extend({ edges: z.array(topologyEdgeSchema).max(100) })
  .superRefine((value, context) => validateListBlock(value, value.edges, context));

const collectionEventSchema = z
  .object({
    observedAt: positiveTimestamp,
    durationMillis: safeInteger.min(-1),
    outcome: requiredText(32),
    collectorId: nullableText(128),
    target: nullableText(512),
    metricSet: nullableText(192),
    failureClass: nullableText(32),
    phase: nullableText(32),
    fieldCount: nonNegativeInteger,
    rowCount: nonNegativeInteger
  })
  .strict();

export const collectionBlockSchema = z
  .object({
    state: stateSchema,
    reason: reasonSchema,
    source: z.literal('greptime_collection_events'),
    event: collectionEventSchema.nullable()
  })
  .strict()
  .superRefine((value, context) => validateValueBlock(value, value.event, context));

function validateListBlock(
  block: { state: z.infer<typeof stateSchema>; reason: z.infer<typeof reasonSchema>; truncated: boolean },
  values: unknown[],
  context: z.RefinementCtx
) {
  validateEvidenceState(block, values.length > 0, context);
  if (block.state !== 'ready' && block.truncated) addIssue(context, 'Non-ready evidence cannot be truncated');
}

function validateValueBlock(
  block: { state: z.infer<typeof stateSchema>; reason: z.infer<typeof reasonSchema> },
  value: unknown,
  context: z.RefinementCtx
) {
  validateEvidenceState(block, value !== null, context);
}

function validateEvidenceState(
  block: { state: z.infer<typeof stateSchema>; reason: z.infer<typeof reasonSchema> },
  hasPayload: boolean,
  context: z.RefinementCtx
) {
  const validReason =
    (block.state === 'ready' && block.reason === 'observed') ||
    (block.state === 'empty' && block.reason === 'no_data') ||
    (block.state === 'unavailable' && !['observed', 'no_data'].includes(block.reason));
  if (!validReason || (block.state === 'ready') !== hasPayload) {
    addIssue(context, 'Evidence state, reason, and payload are inconsistent');
  }
}

function addIssue(context: z.RefinementCtx, message: string) {
  context.addIssue({ code: 'custom', message });
}
