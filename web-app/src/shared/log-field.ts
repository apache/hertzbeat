/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { z } from 'zod';
export const logFacetFieldSchema = z
  .object({
    id: z.string().max(266),
    source: z.enum(['builtin', 'resource', 'attribute']),
    scalar: z.boolean().optional(),
    key: z
      .string()
      .min(1)
      .max(256)
      .regex(/^[A-Za-z0-9_.:-]+$/u)
  })
  .strict()
  .refine(
    field =>
      field.id === `${field.source}:${field.key}` &&
      (field.source !== 'builtin' || ['serviceName', 'environment', 'severityCategory'].includes(field.key))
  );
export type LogFacetField = z.infer<typeof logFacetFieldSchema>;
