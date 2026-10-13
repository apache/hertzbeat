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
import { parseEntitySummary, redIdentitySchema, redValuesSchema } from '@/features/entity/queries';
import { serviceSortKeys } from '@/shared/navigation/services-path';
export { serviceSortKeys } from '@/shared/navigation/services-path';
const count = z.number().int().nonnegative().safe();
const rowSchema = z
  .object({
    entity: z.unknown().transform(parseEntitySummary),
    identity: redIdentitySchema.nullable(),
    summary: redValuesSchema.nullable(),
    state: z.enum(['ready', 'empty', 'unresolved'])
  })
  .superRefine((row, ctx) => {
    if (
      row.entity.type !== 'service' ||
      (row.identity && (row.identity.entityId !== String(row.entity.id) || row.identity.entityType !== 'service')) ||
      (row.state === 'unresolved' ? row.identity !== null || row.summary !== null : !row.identity) ||
      (row.state === 'ready' ? !row.summary || row.summary.requestCount <= 0 : row.summary !== null)
    )
      ctx.addIssue({ code: 'custom', message: 'Contradictory service observation' });
  });
export const servicePerformancePageSchema = z
  .object({
    state: z.enum(['ready', 'scope_too_large', 'unavailable']),
    candidateLimit: z.literal(500),
    totalElements: count.nullable(),
    pageIndex: count,
    pageSize: z.literal(10),
    sort: z.enum(serviceSortKeys),
    order: z.enum(['asc', 'desc']),
    window: z.object({ start: count, end: count }),
    population: z.literal('observed_server_spans'),
    source: z.literal('greptime_flow'),
    resolutionSeconds: z.literal(60),
    content: z.array(rowSchema).max(10)
  })
  .superRefine((page, ctx) => {
    const valid =
      page.state === 'ready'
        ? page.totalElements !== null &&
          page.totalElements <= 500 &&
          page.content.length === Math.min(10, Math.max(0, page.totalElements - page.pageIndex * 10))
        : page.content.length === 0 &&
          (page.state === 'unavailable'
            ? page.totalElements === null
            : page.totalElements !== null && page.totalElements > 500);
    if (!valid || new Set(page.content.map(row => row.entity.id)).size !== page.content.length)
      ctx.addIssue({ code: 'custom', message: 'Contradictory performance page' });
  });
export type ServicePerformancePage = z.output<typeof servicePerformancePageSchema>;
export type ServicePerformanceRow = ServicePerformancePage['content'][number];
