/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { z } from 'zod';

import {
  createPublicAccessConfigDraft,
  publicAccessConfigDraftValid,
  type PublicAccessConfig
} from '../model/public-access-config-model';

const optionalAddress = z.string().trim().min(1).nullable();
const publicAccessConfigSchema: z.ZodType<PublicAccessConfig> = z
  .object({
    publicBaseUrl: optionalAddress,
    serverOtlpHttpEndpoint: optionalAddress,
    serverOtlpGrpcEndpoint: optionalAddress
  })
  .strict()
  .superRefine((config, context) => {
    if (!publicAccessConfigDraftValid(createPublicAccessConfigDraft(config))) {
      context.addIssue({ code: 'custom', message: 'Invalid public access address' });
    }
  });

export class PublicAccessConfigContractError extends Error {
  constructor() {
    super('Public access configuration response is invalid');
    this.name = 'PublicAccessConfigContractError';
  }
}

export function parsePublicAccessConfig(value: unknown): PublicAccessConfig {
  const result = publicAccessConfigSchema.safeParse(value);
  if (!result.success) throw new PublicAccessConfigContractError();
  return result.data;
}
