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

import { LOG_RECORD_UID_PATTERN } from '../model/explore-field-contract';

import { z } from 'zod';
import {
  traceStructureShape,
  validateTraceStructure,
  traceIdSchema,
  traceSpanIdSchema,
  positiveUint64DecimalSchema as positiveUint64Decimal,
  nonNegativeLongDecimalSchema as nonNegativeLongDecimal
} from '@/shared/trace-evidence';
import { validInvestigationForest } from '../model/explore-investigation-forest';

const JAVA_LONG_MAX = '9223372036854775807';
const positiveDecimal = z
  .string()
  .regex(/^[1-9]\d{0,18}$/u)
  .refine(value => value.length < JAVA_LONG_MAX.length || value <= JAVA_LONG_MAX);
const positiveEntityId = positiveDecimal;
const requiredText = (maximum: number) => z.string().trim().min(1).max(maximum).refine(hasPrintableText);
const nullableText = (maximum: number) => requiredText(maximum).nullable();

function hasPrintableText(value: string) {
  return Array.from(value).every(character => {
    const code = character.charCodeAt(0);
    return code > 31 && code !== 127;
  });
}
const safeInteger = z.number().int().safe();
const nonNegativeInteger = safeInteger.nonnegative();
const positiveTimestamp = safeInteger.positive();
export const investigationTraceIdSchema = traceIdSchema;
export const investigationSpanIdSchema = traceSpanIdSchema;
const boundedMap = z.record(requiredText(192), z.string().max(4_096)).refine(value => Object.keys(value).length <= 128);
const nullableAttributeCount = nonNegativeInteger.nullable();
const spanEventSchema = z
  .object({
    timeUnixNano: positiveUint64Decimal,
    name: nullableText(512),
    attributes: boundedMap,
    droppedAttributesCount: nullableAttributeCount
  })
  .strict();
const spanLinkSchema = z
  .object({
    traceId: investigationTraceIdSchema,
    spanId: investigationSpanIdSchema,
    traceState: z.string().max(512).refine(hasPrintableText).nullable(),
    attributes: boundedMap,
    droppedAttributesCount: nullableAttributeCount
  })
  .strict();
const codeNavigationHintSchema = z
  .object({
    repositoryUrl: nullableText(2_048),
    provider: nullableText(128),
    defaultPath: nullableText(2_048),
    searchQuery: nullableText(2_048),
    label: nullableText(256)
  })
  .strict();

export const investigationWindowSchema = z
  .object({ start: positiveTimestamp, end: positiveTimestamp })
  .strict()
  .refine(value => value.start < value.end && value.end - value.start <= 86_400_000);

export const investigationIdentitySchema = z
  .object({
    workspaceId: requiredText(128),
    entityId: positiveEntityId,
    entityType: requiredText(64),
    serviceName: requiredText(256),
    serviceNamespace: nullableText(256),
    deploymentEnvironment: nullableText(128)
  })
  .strict();

const truncatedFieldsSchema = z
  .object({
    attributes: z
      .array(requiredText(192))
      .max(128)
      .refine(keys => new Set(keys).size === keys.length)
      .optional(),
    resourceAttributes: z
      .array(requiredText(192))
      .max(128)
      .refine(keys => new Set(keys).size === keys.length)
      .optional()
  })
  .strict()
  .optional()
  .transform(value => ({ attributes: value?.attributes ?? [], resourceAttributes: value?.resourceAttributes ?? [] }));

function validateTruncatedFields(
  record: {
    attributes: Record<string, string>;
    resourceAttributes: Record<string, string>;
    truncatedFields?: { attributes?: string[]; resourceAttributes?: string[] } | undefined;
  },
  context: z.RefinementCtx
) {
  for (const scope of ['attributes', 'resourceAttributes'] as const) {
    const values = record[scope];
    const keys = record.truncatedFields?.[scope];
    if (!values || !Array.isArray(keys)) continue;
    for (const key of keys) {
      if (typeof key !== 'string') continue;
      const value = values[key];
      if (value === undefined || value.length < 4_095 || value.length > 4_096) {
        context.addIssue({ code: 'custom', message: 'Truncated field metadata does not match its bounded value' });
      }
    }
  }
}

export const investigationLogRecordSchema = z
  .object({
    logRecordUid: z.string().regex(LOG_RECORD_UID_PATTERN),
    timeUnixNano: positiveDecimal,
    observedTimeUnixNano: positiveDecimal.nullable(),
    severityNumber: nonNegativeInteger.max(24).nullable(),
    severityText: nullableText(64),
    body: z.string().max(65_536).nullable(),
    traceId: investigationTraceIdSchema.nullable(),
    spanId: investigationSpanIdSchema.nullable(),
    identity: investigationIdentitySchema.nullable(),
    attributes: boundedMap,
    resourceAttributes: boundedMap,
    truncatedFields: truncatedFieldsSchema
  })
  .strict()
  .superRefine(validateTruncatedFields);

const traceSpanSchema = z
  .object({
    spanId: investigationSpanIdSchema,
    parentSpanId: investigationSpanIdSchema.nullable(),
    spanName: nullableText(512),
    serviceName: nullableText(256),
    serviceNamespace: nullableText(256),
    deploymentEnvironment: nullableText(128),
    entityId: positiveEntityId.nullable(),
    entityType: nullableText(64),
    status: requiredText(64),
    statusMessage: nullableText(2_048),
    spanKind: nullableText(64),
    traceState: nullableText(512),
    scopeName: nullableText(256),
    scopeVersion: nullableText(128),
    durationNanos: nonNegativeLongDecimal,
    startTime: nonNegativeInteger,
    startTimeUnixNano: nonNegativeLongDecimal,
    highlighted: z.boolean(),
    resourceAttributes: boundedMap,
    spanAttributes: boundedMap,
    events: z.array(spanEventSchema).max(1_024),
    links: z.array(spanLinkSchema).max(1_024),
    codeNavigationHint: codeNavigationHintSchema.nullable()
  })
  .strict();

export const investigationTraceDetailSchema = z
  .object({
    partial: z.boolean().optional().default(false),
    rootSpanId: investigationSpanIdSchema.nullable(),
    serviceName: nullableText(256),
    serviceNamespace: nullableText(256),
    deploymentEnvironment: nullableText(128),
    entityId: positiveEntityId.nullable(),
    entityType: nullableText(64),
    rootSpanName: nullableText(512),
    durationNanos: nonNegativeLongDecimal.nullable(),
    status: nullableText(64),
    startTime: nonNegativeInteger.nullable(),
    errorSpanCount: nonNegativeInteger,
    resourceAttributes: boundedMap.nullable(),
    ...traceStructureShape,
    missingParentCount: nonNegativeInteger,
    spans: z.array(traceSpanSchema).min(1).max(10_000)
  })
  .strict()
  .superRefine((detail, context) => {
    validateTraceStructure(detail, context);
    if (!validInvestigationForest(detail)) {
      context.addIssue({ code: 'custom', message: 'Trace span identity or observed structure is inconsistent' });
    }
  });

const redValuesShape = {
  requestCount: nonNegativeInteger,
  errorCount: nonNegativeInteger,
  requestRatePerSecond: z.number().finite().nonnegative(),
  errorRate: z.number().finite().min(0).max(1),
  latencyAverageMs: z.number().finite().nonnegative().nullable(),
  latencyP95Ms: z.number().finite().nonnegative().nullable()
};
export const redSummarySchema = z
  .object(redValuesShape)
  .strict()
  .refine(value => value.errorCount <= value.requestCount);
export const redPointSchema = z.object({ timestamp: positiveTimestamp, ...redValuesShape }).strict();

export const metricSeriesSchema = z
  .object({
    metricName: z.string().regex(/^[A-Za-z_:][A-Za-z0-9_:]{0,254}$/u),
    unit: z.string().max(64).nullable(),
    labels: boundedMap,
    points: z
      .array(z.object({ timestamp: positiveTimestamp, value: z.number().finite() }).strict())
      .min(1)
      .max(1_200)
  })
  .strict();

export const dependencyEdgeSchema = z
  .object({
    sourceServiceName: requiredText(256),
    targetServiceName: requiredText(256),
    sourceEntityId: positiveEntityId.nullable(),
    targetEntityId: positiveEntityId.nullable(),
    spanId: investigationSpanIdSchema,
    status: requiredText(64),
    durationMillis: z.number().finite().nonnegative()
  })
  .strict();
