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

import { SETUP_ERROR_CODES, SETUP_OPERATION_STATES, SETUP_PHASES } from '../model/setup-contract';
import type { SetupOperation } from '../model/setup-responses';
import { parseSetupContract } from './setup-contract-parser';

const instant = z.string().datetime({ offset: true });
const operationResponseSchema = z
  .object({
    operationId: z.string().min(1),
    state: z.enum(SETUP_OPERATION_STATES),
    phase: z.enum(SETUP_PHASES),
    createdAt: instant,
    startedAt: instant.nullable(),
    completedAt: instant.nullable(),
    errorCode: z.enum(SETUP_ERROR_CODES).nullable(),
    nextPollAfterMillis: z.number().int().nonnegative(),
    exportAvailable: z.boolean()
  })
  .strict();

export type { SetupOperation } from '../model/setup-responses';

export function parseSetupOperation(value: unknown): SetupOperation {
  return parseSetupContract(operationResponseSchema, value);
}
