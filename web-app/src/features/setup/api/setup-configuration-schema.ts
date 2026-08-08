/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { z } from 'zod';

import { SETUP_ERROR_CODES, SETUP_OPERATION_STATES, SETUP_PHASES, SETUP_WARNING_CODES } from '../model/setup-contract';
import type { SetupConfigurationAcknowledgement, SetupValidationResult } from '../model/setup-responses';
import { parseSetupContract } from './setup-contract-parser';

const validationResponseSchema = z
  .object({
    valid: z.boolean(),
    observedAt: z.string().datetime({ offset: true }),
    errorCode: z.enum(SETUP_ERROR_CODES).nullable(),
    warnings: z.array(z.enum(SETUP_WARNING_CODES))
  })
  .strict();
const configurationResponseSchema = z
  .object({
    operationId: z.string().min(1),
    state: z.enum(SETUP_OPERATION_STATES),
    phase: z.enum(SETUP_PHASES),
    nextPollAfterMillis: z.number().int().nonnegative(),
    exportAvailable: z.boolean()
  })
  .strict();

export type { SetupConfigurationAcknowledgement, SetupValidationResult } from '../model/setup-responses';

export function parseValidationResponse(value: unknown): SetupValidationResult {
  return parseSetupContract(validationResponseSchema, value);
}

export function parseConfigurationResponse(value: unknown): SetupConfigurationAcknowledgement {
  return parseSetupContract(configurationResponseSchema, value);
}
