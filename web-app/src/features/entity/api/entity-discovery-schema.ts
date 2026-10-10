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

import {
  EntityDiscoveryContractError,
  type EntityDiscoveryPage,
  type EntityDiscoveryQuery
} from '../model/entity-discovery-model';

const positiveId = z.number().int().positive().safe();
const nonNegativeInteger = z.number().int().nonnegative().safe();
const text = z.string().trim().min(1);
const monitorSchema = z
  .object({ id: positiveId, name: text, app: text, instance: text, status: z.number().int().safe() })
  .strict();
const candidateSchema = z
  .object({
    resourceId: positiveId,
    resourceName: text,
    resourceType: text,
    match: z.enum(['already_bound', 'direct', 'suggested']),
    matchedKeys: z.array(text)
  })
  .strict();
const discoverySchema = z
  .object({
    schemaVersion: z.literal(1),
    pageIndex: nonNegativeInteger,
    pageSize: z.number().int().min(1).max(50).safe(),
    totalElements: nonNegativeInteger,
    totalPages: nonNegativeInteger,
    content: z.array(z.object({ monitor: monitorSchema, candidates: z.array(candidateSchema).max(8) }).strict())
  })
  .strict();

export function parseEntityDiscoveryPage(value: unknown, query: EntityDiscoveryQuery): EntityDiscoveryPage {
  const result = discoverySchema.safeParse(value);
  if (!result.success) throw new EntityDiscoveryContractError();
  const page = result.data;
  const remaining = Math.max(0, page.totalElements - page.pageIndex * page.pageSize);
  const expectedRows = Math.min(page.pageSize, remaining);
  const monitorIds = new Set(page.content.map(row => row.monitor.id));
  if (
    page.pageIndex !== query.pageIndex ||
    page.pageSize !== query.pageSize ||
    page.totalPages !== Math.ceil(page.totalElements / page.pageSize) ||
    page.content.length !== expectedRows ||
    monitorIds.size !== page.content.length
  ) {
    throw new EntityDiscoveryContractError();
  }
  return page;
}
