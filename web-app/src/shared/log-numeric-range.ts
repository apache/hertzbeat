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
export const logNumericRangeSchema = z
  .object({
    version: z.literal(1),
    field: z.string(),
    min: z.number().finite(),
    max: z.number().finite()
  })
  .strict()
  .refine(value => {
    const split = value.field.indexOf(':');
    const source = value.field.slice(0, split),
      key = value.field.slice(split + 1);
    return (
      source !== 'builtin' &&
      logFacetFieldSchema.safeParse({ id: value.field, source, key }).success &&
      !['hertzbeat_workspace_id', 'workspace_id'].includes(key.replaceAll('.', '_')) &&
      value.min <= value.max
    );
  });
export type LogNumericRange = z.infer<typeof logNumericRangeSchema>;
export function readLogNumericRange(raw: string | undefined): LogNumericRange | undefined {
  if (raw === undefined || raw.length > 2048) return undefined;
  try {
    const result = logNumericRangeSchema.parse(JSON.parse(raw));
    const keys = [...raw.matchAll(/("(?:\\.|[^"\\])*")\s*:/gu)].map(match => JSON.parse(match[1]!) as unknown);
    return keys.length === 4 && new Set(keys).size === 4 ? result : undefined;
  } catch {
    return undefined;
  }
}
export function validLogNumericRange(raw: string | undefined) {
  return raw === undefined || readLogNumericRange(raw) !== undefined;
}
