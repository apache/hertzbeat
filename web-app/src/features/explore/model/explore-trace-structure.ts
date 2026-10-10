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
