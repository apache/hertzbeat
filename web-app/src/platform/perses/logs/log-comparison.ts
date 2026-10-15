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

import { logTimeShiftSchema } from './log-timeshift';
import { z } from 'zod';
import { parseQueryFormula } from '@/shared/query-context/query-formula';
export const logComparisonDraftSchema = z
  .object({
    version: z.literal(1),
    search: z.string().optional(),
    timeShiftMs: z.number().optional(),
    searchSyntax: z.literal('structured-v1').optional(),
    formula: z.string().optional(),
    hidden: z
      .array(z.enum(['a', 'b', 'formula']))
      .max(3)
      .optional()
  })
  .strict()
  .refine(value => value.search !== undefined || value.formula !== undefined);
export const logComparisonSchema = logComparisonDraftSchema
  .refine(value => value.search !== undefined || (value.timeShiftMs === undefined && value.searchSyntax === undefined))
  .refine(value => value.timeShiftMs === undefined || logTimeShiftSchema.safeParse(value.timeShiftMs).success)
  .refine(value => (value.search?.length ?? 0) <= 8192 && (value.formula?.length ?? 0) <= 256)
  .refine(value => value.searchSyntax !== undefined || (value.search?.length ?? 0) <= 512)
  .refine(value => !value.hidden || new Set(value.hidden).size === value.hidden.length)
  .refine(value => value.search !== undefined || !value.hidden?.includes('b'))
  .refine(value => value.formula !== undefined || !value.hidden?.includes('formula'))
  .refine(value => {
    if (value.formula === undefined) return true;
    try {
      return parseQueryFormula(value.formula).references.every(
        ref => ref === 'a' || (ref === 'b' && value.search !== undefined)
      );
    } catch {
      return false;
    }
  });
export type LogComparison = z.infer<typeof logComparisonSchema>;
