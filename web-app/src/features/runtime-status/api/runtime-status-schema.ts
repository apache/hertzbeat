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

import {
  RUNTIME_STATUS_ERROR_CODES,
  RUNTIME_STATUS_STATES,
  type RuntimeStatusSnapshot
} from '../model/runtime-status-contract';

const instantSchema = z.string().datetime({ offset: true });
const errorCodeSchema = z.enum(RUNTIME_STATUS_ERROR_CODES).nullable();
const statusSchema = z
  .object({
    status: z.enum(RUNTIME_STATUS_STATES),
    errorCode: errorCodeSchema
  })
  .strict()
  .superRefine(requireStatusErrorPair);

const storageSchema = statusSchema.extend({ kind: z.literal('greptime') }).strict();
const collectorsSchema = statusSchema
  .extend({
    total: z.number().int().nonnegative().nullable(),
    online: z.number().int().nonnegative().nullable(),
    runtimeHealthy: z.number().int().nonnegative().nullable(),
    lastReportedAt: instantSchema.nullable()
  })
  .strict()
  .superRefine((collectors, context) => {
    const observed = collectors.status === 'available' || collectors.status === 'degraded';
    if (observed) {
      if (collectors.total === null || collectors.online === null || collectors.runtimeHealthy === null) {
        context.addIssue({ code: 'custom', message: 'Observed Collector status requires counts' });
        return;
      }
      if (collectors.runtimeHealthy > collectors.online || collectors.online > collectors.total) {
        context.addIssue({ code: 'custom', message: 'Collector counts are inconsistent' });
      }
      return;
    }
    if (
      collectors.total !== null ||
      collectors.online !== null ||
      collectors.runtimeHealthy !== null ||
      collectors.lastReportedAt !== null
    ) {
      context.addIssue({ code: 'custom', message: 'Unobserved Collector status cannot expose counts' });
    }
  });

const runtimeStatusSchema = z
  .object({
    schemaVersion: z.literal(1),
    observedAt: instantSchema,
    server: statusSchema,
    storage: storageSchema,
    collectors: collectorsSchema
  })
  .strict()
  .transform(({ observedAt, server, storage, collectors }): RuntimeStatusSnapshot => ({
    observedAt,
    server,
    storage,
    collectors
  }));

export function parseRuntimeStatus(value: unknown): RuntimeStatusSnapshot {
  const result = runtimeStatusSchema.safeParse(value);
  if (!result.success) throw new RuntimeStatusContractError();
  return result.data;
}

export class RuntimeStatusContractError extends Error {
  constructor() {
    super('Runtime status response was invalid');
    this.name = 'RuntimeStatusContractError';
  }
}

function requireStatusErrorPair(
  value: { status: (typeof RUNTIME_STATUS_STATES)[number]; errorCode: unknown },
  context: z.RefinementCtx
) {
  const requiresError = value.status === 'degraded' || value.status === 'unavailable';
  if (requiresError !== (value.errorCode !== null)) {
    context.addIssue({ code: 'custom', message: 'Runtime status and error code do not match' });
  }
}
