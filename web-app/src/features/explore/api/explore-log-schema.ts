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
  ExploreSignalContractError,
  type ExplorePageResult,
  type LogRow,
  type LogStreamGap
} from '../model/explore-signal-contract';
import {
  jsonValueSchema,
  nullableJavaLongSchema,
  nullableJsonMapSchema,
  nullableNonNegativeIntegerSchema,
  nonNegativeIntegerSchema,
  nullableStringSchema
} from './explore-wire-schema';

const instrumentationScopeSchema = z.object({
  name: nullableStringSchema,
  version: nullableStringSchema,
  attributes: nullableJsonMapSchema,
  droppedAttributesCount: nullableNonNegativeIntegerSchema
});

const logRowSchema: z.ZodType<LogRow> = z.object({
  timeUnixNano: nullableJavaLongSchema,
  observedTimeUnixNano: nullableJavaLongSchema,
  severityNumber: nullableNonNegativeIntegerSchema,
  severityText: nullableStringSchema,
  body: jsonValueSchema,
  attributes: nullableJsonMapSchema,
  droppedAttributesCount: nullableNonNegativeIntegerSchema,
  traceId: nullableStringSchema,
  spanId: nullableStringSchema,
  traceFlags: nullableNonNegativeIntegerSchema,
  resource: nullableJsonMapSchema,
  resourceSchemaUrl: nullableStringSchema,
  instrumentationScope: instrumentationScopeSchema.nullable(),
  scopeSchemaUrl: nullableStringSchema
});

const logStreamGapSchema: z.ZodType<LogStreamGap> = z
  .object({
    observedAt: z.number().int().safe().positive(),
    reason: z.literal('queue_overflow'),
    droppedCount: z.number().int().safe().positive()
  })
  .strict();

const logPageSchema = z
  .object({
    content: z.array(logRowSchema),
    totalElements: nonNegativeIntegerSchema,
    pageIndex: nonNegativeIntegerSchema,
    pageSize: nonNegativeIntegerSchema.positive()
  })
  .strict();

export function parseLogPage(value: unknown, pageIndex: number, pageSize: number): ExplorePageResult<LogRow> {
  const result = logPageSchema.safeParse(value);
  if (!result.success) throw new ExploreSignalContractError();
  const page = result.data;
  if (page.pageIndex !== pageIndex || page.pageSize !== pageSize) {
    throw new ExploreSignalContractError('Log page does not match request');
  }
  const totalPages = Math.ceil(page.totalElements / page.pageSize);
  validateLogPageContent(page, totalPages);
  return {
    content: page.content,
    totalElements: page.totalElements,
    totalPages,
    number: page.pageIndex,
    size: page.pageSize
  };
}

export function parseLogRow(value: unknown): LogRow {
  const result = logRowSchema.safeParse(value);
  if (!result.success) throw new ExploreSignalContractError();
  return result.data;
}

export function parseLogStreamGap(value: unknown): LogStreamGap {
  const result = logStreamGapSchema.safeParse(value);
  if (!result.success) throw new ExploreSignalContractError();
  return result.data;
}

function validateLogPageContent(page: z.infer<typeof logPageSchema>, totalPages: number) {
  const remaining = Math.max(0, page.totalElements - page.pageIndex * page.pageSize);
  if (page.content.length > Math.min(page.pageSize, remaining)) {
    throw new ExploreSignalContractError('Log page content is invalid');
  }
  if (page.pageIndex < totalPages && page.content.length === 0 && page.totalElements > 0) {
    throw new ExploreSignalContractError('Log page content is missing');
  }
}
