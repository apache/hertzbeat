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

import { ExploreSignalContractError, type ExplorePageResult, type JsonValue } from '../model/explore-signal-contract';

export const nullableStringSchema = z.string().nullable();
export const integerSchema = z.number().int().safe();
export const nonNegativeIntegerSchema = integerSchema.nonnegative();
export const nullableIntegerSchema = integerSchema.nullable();
export const nullableNonNegativeIntegerSchema = nonNegativeIntegerSchema.nullable();

// Java Long timestamps exceed JavaScript's safe-integer range in current API
// responses. They must remain finite integers until the backend adopts strings.
export const nullableJavaLongSchema = z
  .number()
  .finite()
  .refine(Number.isInteger)
  .refine(value => value >= 0)
  .nullable();
export const nullableStringMapSchema = z.record(z.string(), z.string()).nullable();

export const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.null(),
    z.boolean(),
    z.number().finite(),
    z.string(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema)
  ])
);
export const nullableJsonMapSchema = z.record(z.string(), jsonValueSchema).nullable();

export function parseExplorePage<T>(
  value: unknown,
  pageIndex: number,
  pageSize: number,
  itemSchema: z.ZodType<T>
): ExplorePageResult<T> {
  const result = z
    .object({
      content: z.array(itemSchema),
      totalElements: nonNegativeIntegerSchema,
      totalPages: nonNegativeIntegerSchema,
      number: nonNegativeIntegerSchema,
      size: integerSchema.positive()
    })
    .safeParse(value);
  if (!result.success) throw new ExploreSignalContractError();

  const page = result.data;
  if (page.number !== pageIndex || page.size !== pageSize) {
    throw new ExploreSignalContractError('Spring page does not match request');
  }
  if (page.totalPages !== Math.ceil(page.totalElements / page.size)) {
    throw new ExploreSignalContractError('Spring page totals are inconsistent');
  }
  const remaining = Math.max(0, page.totalElements - page.number * page.size);
  if (page.content.length > Math.min(page.size, remaining)) {
    throw new ExploreSignalContractError('Spring page content is invalid');
  }
  if (page.number < page.totalPages && page.content.length === 0 && page.totalElements > 0) {
    throw new ExploreSignalContractError('Spring page content is missing');
  }
  return page;
}
