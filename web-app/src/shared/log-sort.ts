/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { z } from 'zod';
import { logFacetFieldSchema } from './log-field';
export const logFieldSortSchema = z
  .object({
    version: z.literal(1),
    field: z.string(),
    type: z.enum(['number', 'text']),
    direction: z.enum(['asc', 'desc'])
  })
  .strict()
  .refine(value => {
    const [source, ...parts] = value.field.split(':');
    const key = parts.join(':');
    return source === 'calculated'
      ? /^[A-Za-z][A-Za-z0-9_]{0,63}$/u.test(key)
      : logFacetFieldSchema.safeParse({ id: value.field, source, key }).success &&
          (source !== 'builtin' || value.type === 'text');
  });
export type LogFieldSort = z.infer<typeof logFieldSortSchema>;
