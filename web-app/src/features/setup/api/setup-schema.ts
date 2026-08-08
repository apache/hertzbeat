/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { z } from 'zod';

import {
  METADATA_DATABASE_KINDS,
  SETUP_ACCESS,
  SETUP_APPLY_MODES,
  SETUP_CONFIG_SOURCES,
  SETUP_ERROR_CODES,
  SETUP_PHASES,
  SETUP_WARNING_CODES,
  type SetupStatus
} from '../model/setup-contract';
import type { SetupErrorResponse } from '../model/setup-responses';
import { parseSetupContract } from './setup-contract-parser';

export { SetupContractError } from './setup-contract-parser';

const instant = z.string().datetime({ offset: true });
const source = z.enum(SETUP_CONFIG_SOURCES);
const errorCode = z.enum(SETUP_ERROR_CODES).nullable();
const warningCode = z.enum(SETUP_WARNING_CODES);
const statusSchema = z
  .object({
    phase: z.enum(SETUP_PHASES),
    observedAt: instant,
    access: z.enum(SETUP_ACCESS),
    applyMode: z.enum(SETUP_APPLY_MODES),
    writableManagedConfig: z.boolean(),
    operationId: z.string().min(1).nullable(),
    errorCode,
    managementDatabase: z
      .object({
        kind: z.enum(METADATA_DATABASE_KINDS).nullable(),
        configured: z.boolean(),
        source,
        restartRequired: z.boolean()
      })
      .strict(),
    telemetryStore: z
      .object({
        kind: z.literal('greptime'),
        configured: z.boolean(),
        source,
        restartRequired: z.boolean()
      })
      .strict(),
    administratorConfigured: z.boolean(),
    optional: z
      .object({
        publicAccessConfigured: z.boolean(),
        serverOtlpHttpConfigured: z.boolean(),
        serverOtlpGrpcConfigured: z.boolean(),
        retentionConfigured: z.boolean(),
        mailConfigured: z.boolean()
      })
      .strict(),
    pendingWarnings: z.array(warningCode)
  })
  .strict();

export function parseSetupStatus(value: unknown): SetupStatus {
  return parseSetupContract(statusSchema, value);
}

export function parseSetupError(value: unknown): SetupErrorResponse {
  return parseSetupContract(z.object({ errorCode: z.enum(SETUP_ERROR_CODES), observedAt: instant }).strict(), value);
}
