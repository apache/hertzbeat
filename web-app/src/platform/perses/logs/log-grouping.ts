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
import { logAnalysisFieldIdSchema } from './log-measure';
export const logGroupingSchema = z
  .object({
    version: z.literal(1),
    dimensions: z
      .array(z.object({ field: logAnalysisFieldIdSchema, limit: z.number().int().min(1).max(100) }).strict())
      .min(1)
      .max(4)
  })
  .strict()
  .refine(
    value =>
      new Set(value.dimensions.map(item => item.field)).size === value.dimensions.length && groupingLimit(value) <= 100
  );
export type LogGrouping = z.infer<typeof logGroupingSchema>;
export const logGroupKeySchema = z
  .object({
    field: logAnalysisFieldIdSchema,
    kind: z.enum(['value', 'missing', 'null', 'non_scalar']),
    value: z.string().nullable()
  })
  .strict()
  .refine(key => (key.kind === 'value') === (key.value !== null));
export type LogGroupKey = z.infer<typeof logGroupKeySchema>;
export function groupingLimit(value: { dimensions: { limit: number }[] }) {
  return value.dimensions.reduce((product, item) => product * item.limit, 1);
}
export function validGroupingControls(value: {
  grouping?: LogGrouping | undefined;
  field?: unknown;
  limit: number;
  representation?: string;
}) {
  return (
    !value.grouping ||
    (value.field == null &&
      value.limit === groupingLimit(value.grouping) &&
      !(value.representation === 'toplist' && value.grouping.dimensions.length > 1))
  );
}
export function groupIdentity(group: { keys?: LogGroupKey[] | undefined; kind: string | null; value: string | null }) {
  return JSON.stringify(group.keys ?? [group.kind, group.value]);
}
export function validGroupingKeys(grouping: LogGrouping | undefined, keys: LogGroupKey[] | undefined) {
  return grouping
    ? keys !== undefined &&
        keys.length === grouping.dimensions.length &&
        keys.every((key, index) => key.field === grouping.dimensions[index]!.field)
    : keys === undefined;
}

export function sameLogGrouping(a: LogGrouping | undefined, b: LogGrouping | undefined) {
  return (
    a?.dimensions.length === b?.dimensions.length &&
    (a?.dimensions.every(
      (item, index) => item.field === b?.dimensions[index]?.field && item.limit === b.dimensions[index]?.limit
    ) ??
      true)
  );
}
