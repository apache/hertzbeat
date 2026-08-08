/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

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
