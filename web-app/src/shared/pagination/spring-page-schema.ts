/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
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
