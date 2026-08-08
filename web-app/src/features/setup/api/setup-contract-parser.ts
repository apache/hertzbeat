/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type { z } from 'zod';

export class SetupContractError extends Error {
  constructor() {
    super('Setup response was invalid');
    this.name = 'SetupContractError';
  }
}

export function parseSetupContract<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new SetupContractError();
  return result.data;
}
