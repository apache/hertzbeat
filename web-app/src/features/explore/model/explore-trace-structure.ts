/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { z } from 'zod';

const exactText = z
  .string()
  .min(1)
  .max(128)
  .refine(value => value.trim() === value && !/[\p{Cc}]/u.test(value));
const draftClauseSchema = z
  .object({
    serviceName: z.string().max(128).nullable(),
    operationName: z.string().max(128).nullable(),
    status: z.enum(['ERROR', 'OK', 'UNSET']).nullable()
  })
  .strict();
const clauseSchema = draftClauseSchema
  .extend({ serviceName: exactText.nullable(), operationName: exactText.nullable() })
  .strict()
  .refine(value => value.serviceName !== null || value.operationName !== null || value.status !== null);
const draftStructureSchema = z
  .object({
    version: z.literal(1),
    a: draftClauseSchema,
    b: draftClauseSchema,
    relation: z.enum(['both', 'either', 'direct', 'upstream'])
  })
  .strict();
const structureSchema = z
  .object({
    version: z.literal(1),
    a: clauseSchema,
    b: clauseSchema,
    relation: z.enum(['both', 'either', 'direct', 'upstream'])
  })
  .strict();

export type TraceStructure = z.infer<typeof structureSchema>;
export type TraceStructureDraft = z.infer<typeof draftStructureSchema>;
export const EMPTY_TRACE_STRUCTURE_DRAFT: TraceStructureDraft = {
  version: 1,
  a: { serviceName: null, operationName: null, status: null },
  b: { serviceName: null, operationName: null, status: null },
  relation: 'both'
};

export function readTraceStructureDraft(raw: string | undefined): TraceStructureDraft | undefined {
  if (raw === undefined || raw.length > 2048) return undefined;
  try {
    return draftStructureSchema.parse(JSON.parse(raw));
  } catch {
    return undefined;
  }
}

export function parseTraceStructure(raw: string | undefined): TraceStructure | undefined {
  if (raw === undefined || raw.length > 2048) return undefined;
  try {
    return structureSchema.parse(JSON.parse(raw));
  } catch {
    return undefined;
  }
}
