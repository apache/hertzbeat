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
  type LogRow
} from '../model/explore-signal-contract';
import {
  jsonValueSchema,
  nullableJavaLongSchema,
  nullableJsonMapSchema,
  nullableNonNegativeIntegerSchema,
  nullableStringSchema,
  parseExplorePage
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

export function parseLogPage(value: unknown, pageIndex: number, pageSize: number): ExplorePageResult<LogRow> {
  return parseExplorePage(value, pageIndex, pageSize, logRowSchema);
}

export function parseLogRow(value: unknown): LogRow {
  const result = logRowSchema.safeParse(value);
  if (!result.success) throw new ExploreSignalContractError();
  return result.data;
}
