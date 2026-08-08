/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { z } from 'zod';

import type { SetupUnlockResponse } from '../model/setup-responses';
import { parseSetupContract } from './setup-contract-parser';

const unlockResponseSchema = z
  .object({
    access: z.literal('unlocked'),
    expiresAt: z.string().datetime({ offset: true })
  })
  .strict();

export type { SetupUnlockResponse } from '../model/setup-responses';

export function parseSetupUnlockResponse(value: unknown): SetupUnlockResponse {
  return parseSetupContract(unlockResponseSchema, value);
}
