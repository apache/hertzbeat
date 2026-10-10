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
import type { LogTransactionsResult, LogTransactionDetailResult } from '../model/explore-log-transactions-result';
import { logFacetFieldSchema } from '@/shared/log-field';
import { logRowSchema } from './explore-log-schema';
import { validTransactionField } from '../model/explore-log-transactions';
const count = z.number().int().nonnegative().safe();
const windowSchema = z
  .object({ start: count.positive(), end: count.positive() })
  .strict()
  .refine(w => w.end > w.start && w.end - w.start <= 86_400_000);
export const transactionIdentitySchema = z
  .string()
  .min(1)
  .max(1024)
  .refine(value => !/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(value));
const nanos = z
  .string()
  .regex(/^(0|[1-9]\d{0,18})$/u)
  .refine(v => BigInt(v) <= 9223372036854775807n);
const field = logFacetFieldSchema.refine(value => validTransactionField(value.id));
const item = z
  .object({
    identity: transactionIdentitySchema,
    seedCount: count.positive(),
    relatedCount: count.positive(),
    firstTimeUnixNano: nanos,
    lastTimeUnixNano: nanos,
    durationNanos: nanos,
    maximumSeverity: z.enum(['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL']).nullable()
  })
  .strict()
  .refine(
    v =>
      v.relatedCount >= v.seedCount &&
      BigInt(v.lastTimeUnixNano) >= BigInt(v.firstTimeUnixNano) &&
      BigInt(v.lastTimeUnixNano) - BigInt(v.firstTimeUnixNano) === BigInt(v.durationNanos)
  );
const transactionsShape = z
  .object({
    window: windowSchema,
    request: z
      .object({ version: z.literal(1), field, limit: count.min(1).max(100), order: z.literal('related-count-desc') })
      .strict(),
    seedLogCount: count,
    usableSeedLogCount: count,
    oversizedSeedLogCount: count,
    otherExcludedSeedLogCount: count,
    transactionCount: count,
    relatedLogCount: count,
    truncated: z.boolean(),
    items: z.array(item).max(100)
  })
  .strict();
export const logTransactionsResultSchema: z.ZodType<LogTransactionsResult> =
  transactionsShape.refine(validTransactions);

function validTransactions(v: LogTransactionsResult): boolean {
  const seed = v.items.reduce((sum, row) => sum + row.seedCount, 0),
    related = v.items.reduce((sum, row) => sum + row.relatedCount, 0);
  return (
    v.seedLogCount === v.usableSeedLogCount + v.oversizedSeedLogCount + v.otherExcludedSeedLogCount &&
    v.relatedLogCount >= v.usableSeedLogCount &&
    v.transactionCount <= v.usableSeedLogCount &&
    v.items.length === Math.min(v.transactionCount, v.request.limit) &&
    v.truncated === v.transactionCount > v.request.limit &&
    new Set(v.items.map(row => row.identity)).size === v.items.length &&
    seed <= v.usableSeedLogCount &&
    related <= v.relatedLogCount &&
    (v.truncated || (seed === v.usableSeedLogCount && related === v.relatedLogCount)) &&
    v.items.every(
      (row, index) =>
        BigInt(row.firstTimeUnixNano) >= BigInt(v.window.start) * 1_000_000n &&
        BigInt(row.lastTimeUnixNano) <= BigInt(v.window.end) * 1_000_000n &&
        (index === 0 || v.items[index - 1]!.relatedCount >= row.relatedCount)
    )
  );
}
const detailShape = z
  .object({
    window: windowSchema,
    field,
    identity: transactionIdentitySchema,
    qualified: z.boolean(),
    total: count.nullable(),
    rows: z.array(logRowSchema).max(100),
    offset: count.max(2147483647),
    limit: count.min(1).max(100),
    sort: z.enum(['oldest', 'newest'])
  })
  .strict()
  .refine(v =>
    v.qualified
      ? v.total !== null && v.rows.length === Math.min(v.limit, Math.max(0, v.total - v.offset))
      : v.total === null && v.rows.length === 0
  );
export const logTransactionDetailSchema: z.ZodType<LogTransactionDetailResult> = detailShape.refine(validDetailRows);

function validDetailRows(result: LogTransactionDetailResult): boolean {
  return result.rows.every((row, index) => {
    const attributes = result.field.source === 'resource' ? row.resource : row.attributes;
    if (attributes?.[result.field.key] !== result.identity || !row.timeUnixNano) return false;
    const time = BigInt(row.timeUnixNano);
    if (time < BigInt(result.window.start) * 1_000_000n || time > BigInt(result.window.end) * 1_000_000n) return false;
    const previous = result.rows[index - 1]?.timeUnixNano;
    return !previous || (result.sort === 'oldest' ? BigInt(previous) <= time : BigInt(previous) >= time);
  });
}
