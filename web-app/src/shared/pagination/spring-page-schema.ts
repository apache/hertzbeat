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

const safeIntegerSchema = z.number().refine(Number.isSafeInteger);
const nonNegativeIntegerSchema = safeIntegerSchema.refine(value => value >= 0);
const positiveIntegerSchema = safeIntegerSchema.refine(value => value > 0);

export function createSpringPageSchema<ItemSchema extends z.ZodType>(itemSchema: ItemSchema) {
  return z
    .object({
      content: z.array(itemSchema),
      totalElements: nonNegativeIntegerSchema,
      totalPages: nonNegativeIntegerSchema,
      number: nonNegativeIntegerSchema,
      size: positiveIntegerSchema,
      empty: z.boolean().optional(),
      first: z.boolean().optional(),
      last: z.boolean().optional(),
      numberOfElements: nonNegativeIntegerSchema.optional(),
      pageable: z.unknown().optional(),
      sort: z.unknown().optional()
    })
    .strict()
    .transform(({ content, totalElements, totalPages, number, size }) => ({
      content,
      totalElements,
      totalPages,
      number,
      size
    }));
}
