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
import { logFacetFieldSchema } from '@/shared/log-field';
import type { LogRow } from './explore-signal-contract';

const name = z.string().regex(/^[A-Za-z][A-Za-z0-9_]{0,63}$/u);
const field = z.string().max(266).refine(validCalculatedSource);
const formula = z
  .object({
    version: z.literal(1),
    name,
    kind: z.literal('formula'),
    left: field,
    operator: z.enum(['+', '-', '*', '/']),
    right: field
  })
  .strict();
const extraction = z
  .object({
    version: z.literal(1),
    name,
    kind: z.literal('extract'),
    source: z.union([z.literal('body'), field]),
    before: z.string().max(128),
    after: z.string().max(128)
  })
  .strict()
  .refine(value => Boolean(value.before || value.after));
const logCalculatedSchema = z.discriminatedUnion('kind', [formula, extraction]);
export type LogCalculatedField = z.infer<typeof logCalculatedSchema>;

function validCalculatedSource(value: string) {
  const colon = value.indexOf(':');
  const source = value.slice(0, colon);
  const key = value.slice(colon + 1);
  return (
    (source === 'attribute' || source === 'resource') &&
    logFacetFieldSchema.safeParse({ id: value, source, key }).success
  );
}

export function parseLogCalculated(raw: string | undefined): LogCalculatedField | undefined {
  if (raw === undefined || raw.length > 2048) return undefined;
  try {
    const keys = [...raw.matchAll(/("(?:\\.|[^"\\])*")\s*:/gu)].map(match => JSON.parse(match[1]!) as unknown);
    if (keys.length !== 6 || new Set(keys).size !== 6) return undefined;
    return logCalculatedSchema.parse(JSON.parse(raw));
  } catch {
    return undefined;
  }
}

export function validLogCalculatedMode(mode: string | undefined, raw: string | undefined) {
  return raw === undefined ? mode !== 'calculated' : parseLogCalculated(raw) !== undefined;
}

export function calculateLogField(row: LogRow, field: LogCalculatedField): number | string | null {
  return field.kind === 'extract' ? extractLogField(row, field) : calculateFormula(row, field);
}

function extractLogField(row: LogRow, field: Extract<LogCalculatedField, { kind: 'extract' }>) {
  const input = field.source === 'body' ? row.body : logSourceValue(row, field.source);
  if (typeof input !== 'string') return null;
  const from = field.before ? input.indexOf(field.before) : 0;
  if (from < 0) return null;
  const start = from + field.before.length;
  const end = field.after ? input.indexOf(field.after, start) : input.length;
  if (end < start || end - start > 512) return null;
  return input.slice(start, end) || null;
}

function calculateFormula(row: LogRow, field: Extract<LogCalculatedField, { kind: 'formula' }>) {
  const left = logSourceValue(row, field.left);
  const right = logSourceValue(row, field.right);
  if (typeof left !== 'number' || typeof right !== 'number' || !Number.isFinite(left) || !Number.isFinite(right))
    return null;
  const result = { '+': () => left + right, '-': () => left - right, '*': () => left * right, '/': () => left / right }[
    field.operator
  ]();
  return Number.isFinite(result) ? result : null;
}

export function defaultLogCalculatedDraft() {
  return JSON.stringify({ version: 1, name: 'derived', kind: 'formula', left: '', operator: '-', right: '' });
}

function logSourceValue(row: LogRow, field: string) {
  const colon = field.indexOf(':');
  const source = field.slice(0, colon) === 'attribute' ? row.attributes : row.resource;
  return source?.[field.slice(colon + 1)];
}
