/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { z } from 'zod';

import { loginPath } from '@/core/auth/navigation';

import { type SetupCompleteResponse, type SetupOptionsResponse } from '../model/setup-optional';
import { parseSetupContract } from './setup-contract-parser';

const optionsResponseSchema = z
  .object({
    publicBaseUrlConfigured: z.boolean(),
    serverOtlpHttpConfigured: z.boolean(),
    serverOtlpGrpcConfigured: z.boolean(),
    retentionConfigured: z.boolean(),
    mailConfigured: z.boolean(),
    phase: z.literal('optional_configuration')
  })
  .strict();
const completeResponseSchema = z
  .object({
    phase: z.literal('complete'),
    completedAt: z.string().datetime({ offset: true }),
    loginPath: z.literal(loginPath),
    username: z.string().min(1)
  })
  .strict();

export function parseSetupOptionsResponse(value: unknown): SetupOptionsResponse {
  return parseSetupContract(optionsResponseSchema, value);
}

export function parseSetupCompleteResponse(value: unknown): SetupCompleteResponse {
  return parseSetupContract(completeResponseSchema, value);
}
