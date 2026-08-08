/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { z } from 'zod';

import type { SetupAdministratorResponse } from '../model/setup-responses';
import { parseSetupContract } from './setup-contract-parser';

const administratorResponseSchema = z
  .object({ username: z.string().min(1), phase: z.literal('optional_configuration') })
  .strict();

export function parseAdministratorResponse(value: unknown): SetupAdministratorResponse {
  return parseSetupContract(administratorResponseSchema, value);
}
