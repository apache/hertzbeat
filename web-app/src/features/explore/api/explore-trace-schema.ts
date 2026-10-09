/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
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

import { traceEvidenceSchema } from '@/shared/trace-evidence';

import { ExploreSignalContractError, type TracePageResult } from '../model/explore-signal-contract';
import { parseExplorePage } from './explore-wire-schema';

const querySchema = z
  .object({
    sort: z.enum(['newest', 'duration_desc']),
    coverage: z.enum(['window', 'bounded']),
    rowLimit: z.number().int().positive().safe().nullable(),
    truncated: z.boolean().nullable()
  })
  .refine(query =>
    query.coverage === 'window' ? query.rowLimit === null && query.truncated === false : query.rowLimit !== null
  );

export function parseTracePage(
  value: unknown,
  pageIndex: number,
  pageSize: number,
  expectedSort?: 'newest' | 'duration_desc'
): TracePageResult {
  const page = parseExplorePage(value, pageIndex, pageSize, traceEvidenceSchema);
  requireUnique(
    page.content.map(row => row.traceId),
    'trace page contains duplicate traceId'
  );
  const parsed = z.object({ query: querySchema.optional() }).safeParse(value);
  if (!parsed.success || (expectedSort && parsed.data.query && parsed.data.query.sort !== expectedSort)) {
    throw new ExploreSignalContractError('Trace query coverage does not match request');
  }
  return parsed.data.query ? { ...page, query: parsed.data.query } : page;
}

function requireUnique(values: string[], message: string) {
  if (new Set(values).size !== values.length) throw new ExploreSignalContractError(message);
}
