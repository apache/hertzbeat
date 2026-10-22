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
import type { RepeatedErrorScope, RepeatedErrors, RepeatedErrorGroup } from '../model/dashboard-repeated-errors';
export type { RepeatedErrorScope, RepeatedErrors, RepeatedErrorGroup } from '../model/dashboard-repeated-errors';
import { apiMessageGet } from '@/core/http/api-message';
import { ExploreSignalContractError } from '@/shared/signal-contract-error';

const count = z.number().int().safe().nonnegative();
const uid = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u);
const groupKey = z.string().regex(/^[a-f0-9]{64}$/u);
const scopeSchema = z
  .object({
    workspaceId: z.string().min(1).max(128),
    start: count,
    end: count,
    serviceName: z.string().max(256),
    environment: z.string().max(256)
  })
  .strict();
const groupSchema = z
  .object({
    groupKey,
    serviceName: z.string().max(256),
    environment: z.string().max(256),
    count: count.min(2),
    lastSeen: count,
    summary: z.string().max(240),
    representativeUid: uid.nullable()
  })
  .strict();
const resultSchema = z
  .object({
    state: z.enum(['ready', 'unsupported', 'over_budget', 'unavailable']),
    scope: scopeSchema,
    coverage: z.literal('window').nullable(),
    matchingEvents: count.max(10000).nullable(),
    groups: z.array(groupSchema).max(3)
  })
  .strict()
  .superRefine((value, context) => {
    const counts = value.groups.map(group => group.count);
    const valid =
      value.state === 'ready'
        ? value.coverage === 'window' &&
          value.matchingEvents !== null &&
          counts.reduce((sum, n) => sum + n, 0) <= value.matchingEvents &&
          counts.every((n, i) => i === 0 || n <= counts[i - 1]!) &&
          new Set(value.groups.map(group => group.groupKey)).size === value.groups.length &&
          value.groups.every(group => group.lastSeen >= value.scope.start && group.lastSeen <= value.scope.end)
        : value.coverage === null && value.matchingEvents === null && !value.groups.length;
    if (!valid) context.addIssue({ code: 'custom', message: 'Contradictory repeated error evidence' });
  });
const recordsSchema = z
  .object({
    state: z.enum(['ready', 'missing', 'unsupported', 'over_budget', 'unavailable']),
    scope: scopeSchema,
    selection: z.object({ groupKey, representativeUid: uid }).strict(),
    records: z.array(z.object({ uid, eventTime: count }).strict()).max(20)
  })
  .strict();

function equalScope(left: RepeatedErrorScope, right: RepeatedErrorScope) {
  return (['workspaceId', 'start', 'end', 'serviceName', 'environment'] as const).every(
    key => left[key] === right[key]
  );
}
export function parseRepeatedErrors(raw: unknown, scope: RepeatedErrorScope): RepeatedErrors {
  const result = resultSchema.safeParse(raw);
  if (!result.success || !equalScope(result.data.scope, scope)) throw new ExploreSignalContractError();
  return result.data;
}
export async function loadRepeatedErrors(scope: RepeatedErrorScope, signal?: AbortSignal) {
  return parseRepeatedErrors(
    await apiMessageGet(`/api/logs/repeated-errors?${scopeParams(scope)}`, { signal: signal ?? null }),
    scope
  );
}
export async function loadRepeatedErrorRecords(
  scope: RepeatedErrorScope,
  group: RepeatedErrorGroup,
  signal?: AbortSignal
) {
  if (!group.representativeUid) throw new ExploreSignalContractError();
  const params = scopeParams(scope);
  params.set('groupKey', group.groupKey);
  params.set('representativeUid', group.representativeUid);
  const parsed = recordsSchema.safeParse(
    await apiMessageGet(`/api/logs/repeated-errors/records?${params}`, { signal: signal ?? null })
  );
  if (
    !parsed.success ||
    !equalScope(parsed.data.scope, scope) ||
    parsed.data.selection.groupKey !== group.groupKey ||
    parsed.data.selection.representativeUid !== group.representativeUid ||
    (parsed.data.state !== 'ready' && parsed.data.records.length > 0) ||
    parsed.data.records.some(row => row.eventTime < scope.start || row.eventTime > scope.end)
  )
    throw new ExploreSignalContractError();
  return parsed.data;
}
function scopeParams(scope: RepeatedErrorScope) {
  const params = new URLSearchParams({ start: String(scope.start), end: String(scope.end) });
  if (scope.serviceName) params.set('serviceName', scope.serviceName);
  if (scope.environment) params.set('environment', scope.environment);
  return params;
}
