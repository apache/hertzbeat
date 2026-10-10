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
import { logFacetFieldSchema } from './log-field';
const groupSchema = z
  .object({
    field: z
      .string()
      .max(266)
      .refine(field => {
        const separator = field.indexOf(':');
        const key = field.slice(separator + 1);
        return (
          logFacetFieldSchema.safeParse({ id: field, source: field.slice(0, separator), key }).success &&
          !['hertzbeat_workspace_id', 'workspace_id'].includes(key.replaceAll('.', '_'))
        );
      }),
    kind: z.enum(['value', 'missing', 'null', 'non_scalar']),
    value: z.string().max(1024).nullable().optional()
  })
  .strict()
  .refine(group => (group.kind === 'value' ? typeof group.value === 'string' : group.value == null));
export const logGroupSelectionSchema = z
  .object({ version: z.literal(1), groups: z.array(groupSchema).min(1).max(4) })
  .strict()
  .refine(selection => new Set(selection.groups.map(group => group.field)).size === selection.groups.length);
export type LogGroupSelection = z.infer<typeof logGroupSelectionSchema>;
export function readLogGroupSelection(raw: string | undefined): LogGroupSelection | undefined {
  if (raw === undefined || raw.length > 4096) return undefined;
  try {
    const result = logGroupSelectionSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : undefined;
  } catch {
    return undefined;
  }
}
export function validLogGroupSelection(raw: string | undefined) {
  return raw === undefined || readLogGroupSelection(raw) !== undefined;
}
