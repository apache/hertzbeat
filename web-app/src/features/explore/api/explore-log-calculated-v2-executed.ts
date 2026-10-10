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
import type { CalculatedPageRequest } from './explore-log-calculated-v2-types';

export const output = z.object({ name: z.string(), type: z.enum(['number', 'string', 'boolean']) }).strict();
const formula = z
  .object({
    id: z.string(),
    kind: z.literal('formula'),
    name: z.string(),
    expression: z.string(),
    outputs: z.array(output)
  })
  .strict();
const extraction = z
  .object({
    id: z.string(),
    kind: z.literal('extraction'),
    engine: z.enum(['regex', 'grok']),
    source: z.string(),
    pattern: z.string(),
    captures: z.array(z.object({ name: z.string() }).strict()),
    outputs: z.array(output)
  })
  .strict();
export const executedField = z.discriminatedUnion('kind', [formula, extraction]);
export const executedDefinitions = z
  .object({ version: z.literal(2), fields: z.array(executedField).min(1).max(8) })
  .strict();
export const scalar = z.union([z.number().finite(), z.string(), z.boolean()]).nullable();
export function sameExecutedDefinitions(
  executed: z.infer<typeof executedField>[],
  requested: CalculatedPageRequest['calculatedFields']['fields']
) {
  const names = executed.flatMap(field => field.outputs);
  return (
    executed.length === requested.length &&
    names.length <= 16 &&
    new Set(names.map(item => item.name)).size === names.length &&
    executed.every((field, index) => sameExecutedField(field, requested[index]!))
  );
}

function sameExecutedField(
  field: z.infer<typeof executedField>,
  requested: CalculatedPageRequest['calculatedFields']['fields'][number]
) {
  if (field.id !== requested.id || field.kind !== requested.kind) return false;
  if (field.kind === 'formula') return sameFormula(field, requested);
  return sameExtraction(field, requested);
}

function sameFormula(
  field: z.infer<typeof formula>,
  requested: CalculatedPageRequest['calculatedFields']['fields'][number]
) {
  return (
    requested.kind === 'formula' &&
    field.name === requested.name &&
    field.expression === requested.expression &&
    field.outputs.length === 1 &&
    field.outputs[0]?.name === field.name
  );
}

function sameExtraction(
  field: z.infer<typeof extraction>,
  requested: CalculatedPageRequest['calculatedFields']['fields'][number]
) {
  return (
    requested.kind === 'extraction' &&
    field.engine === requested.engine &&
    field.source === requested.source &&
    field.pattern === requested.pattern &&
    sameEntries(field.captures, requested.captures) &&
    sameEntries(
      field.outputs.map(item => item.name),
      requested.captures.map(item => item.name)
    )
  );
}

export function validDerived(value: z.infer<typeof scalar> | undefined, type: z.infer<typeof output>['type']) {
  return value === null || (value !== undefined && typeof value === type);
}

export function sameEntries(left: unknown, right: unknown): boolean {
  if (typeof left !== 'object' || left === null || typeof right !== 'object' || right === null) return left === right;
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every(
      (key, index) =>
        key === rightKeys[index] &&
        sameEntries((left as Record<string, unknown>)[key], (right as Record<string, unknown>)[key])
    )
  );
}
