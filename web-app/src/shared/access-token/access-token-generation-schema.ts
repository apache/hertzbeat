/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { z } from 'zod';

import { hasOwnProperties } from '@/shared/validation/own-properties';

import {
  accessTokenExpirationDefinitions,
  isAccessTokenScope,
  type AccessTokenGenerationDraft,
  type AccessTokenScope,
  type GeneratedAccessTokenReceipt
} from './access-token-generation-model';

export class AccessTokenGenerationContractError extends Error {
  constructor() {
    super('Access token generation contract is invalid');
    this.name = 'AccessTokenGenerationContractError';
  }
}

const generatedTokenSchema = z.object({ token: z.string().refine(value => value.trim() !== '') }).strict();
const generationDraftSchema = z
  .object({
    name: z.string().refine(value => value.trim() !== ''),
    expireSeconds: z
      .number()
      .refine(value => accessTokenExpirationDefinitions.some(definition => definition.value === value)),
    scope: z.custom<AccessTokenScope>(isAccessTokenScope)
  })
  .strict();

export function parseGeneratedAccessTokenReceipt(value: unknown): GeneratedAccessTokenReceipt {
  const result = generatedTokenSchema.safeParse(value);
  if (!result.success) throw new AccessTokenGenerationContractError();
  return { id: 'generated', token: result.data.token };
}

export function parseAccessTokenGenerationDraft(value: unknown): AccessTokenGenerationDraft {
  if (!hasOwnProperties(value, ['name', 'expireSeconds', 'scope'])) throw new AccessTokenGenerationContractError();
  const result = generationDraftSchema.safeParse(value);
  if (!result.success) throw new AccessTokenGenerationContractError();
  return {
    name: result.data.name.trim(),
    expireSeconds: result.data.expireSeconds,
    scope: result.data.scope
  };
}
