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
  ExploreSignalMissingError,
  type ExplorePageResult,
  type TraceDetail,
  type TraceRow,
  type TraceSpan
} from '../model/explore-signal-contract';
import {
  nullableJavaLongSchema,
  nullableJsonMapSchema,
  nullableNonNegativeIntegerSchema,
  nullableStringMapSchema,
  nullableStringSchema,
  nonNegativeIntegerSchema,
  parseExplorePage
} from './explore-wire-schema';

const traceRowShape = {
  traceId: z.string().min(1),
  rootSpanId: nullableStringSchema,
  serviceName: nullableStringSchema,
  serviceNamespace: nullableStringSchema,
  rootSpanName: nullableStringSchema,
  durationNanos: nullableJavaLongSchema,
  status: nullableStringSchema,
  startTime: nullableNonNegativeIntegerSchema,
  errorSpanCount: nonNegativeIntegerSchema,
  resourceAttributes: nullableStringMapSchema
};
const traceRowSchema: z.ZodType<TraceRow> = z.object(traceRowShape);

const traceEventSchema = z.object({
  timeUnixNano: nullableJavaLongSchema,
  name: nullableStringSchema,
  attributes: nullableJsonMapSchema,
  droppedAttributesCount: nullableNonNegativeIntegerSchema
});

const traceLinkSchema = z.object({
  traceId: nullableStringSchema,
  spanId: nullableStringSchema,
  traceState: nullableStringSchema,
  attributes: nullableJsonMapSchema,
  droppedAttributesCount: nullableNonNegativeIntegerSchema
});

const codeNavigationHintSchema = z.object({
  repositoryUrl: nullableStringSchema,
  provider: nullableStringSchema,
  defaultPath: nullableStringSchema,
  searchQuery: nullableStringSchema,
  label: nullableStringSchema
});

const traceSpanSchema: z.ZodType<TraceSpan> = z.object({
  traceId: nullableStringSchema,
  spanId: nullableStringSchema,
  parentSpanId: nullableStringSchema,
  spanName: nullableStringSchema,
  serviceName: nullableStringSchema,
  status: nullableStringSchema,
  spanKind: nullableStringSchema,
  statusMessage: nullableStringSchema,
  traceState: nullableStringSchema,
  scopeName: nullableStringSchema,
  scopeVersion: nullableStringSchema,
  durationNanos: nullableJavaLongSchema,
  startTime: nullableNonNegativeIntegerSchema,
  highlighted: z.boolean(),
  resourceAttributes: nullableStringMapSchema,
  spanAttributes: nullableStringMapSchema,
  events: z.array(traceEventSchema).nullable(),
  links: z.array(traceLinkSchema).nullable(),
  codeNavigationHint: codeNavigationHintSchema.nullable()
});

const traceDetailSchema: z.ZodType<TraceDetail> = z.object({
  ...traceRowShape,
  spans: z.array(traceSpanSchema).nullable()
});

export function parseTracePage(value: unknown, pageIndex: number, pageSize: number): ExplorePageResult<TraceRow> {
  const page = parseExplorePage(value, pageIndex, pageSize, traceRowSchema);
  requireUnique(page.content.map(row => row.traceId), 'trace page contains duplicate traceId');
  return page;
}

export function parseTraceDetail(value: unknown, expectedTraceId: string): TraceDetail {
  if (value == null) throw new ExploreSignalMissingError();
  const result = traceDetailSchema.safeParse(value);
  if (!result.success) throw new ExploreSignalContractError();
  const detail = result.data;
  if (detail.traceId !== expectedTraceId) {
    throw new ExploreSignalContractError('trace detail identity does not match request');
  }
  const spanIds: string[] = [];
  for (const span of detail.spans ?? []) {
    if (!span.spanId) throw new ExploreSignalContractError('trace spanId is required');
    if (span.traceId !== null && span.traceId !== expectedTraceId) {
      throw new ExploreSignalContractError('span traceId does not match request');
    }
    spanIds.push(span.spanId);
  }
  requireUnique(spanIds, 'trace detail contains duplicate spanId');
  return detail;
}

function requireUnique(values: string[], message: string) {
  if (new Set(values).size !== values.length) throw new ExploreSignalContractError(message);
}
