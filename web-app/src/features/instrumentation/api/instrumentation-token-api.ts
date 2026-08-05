/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { z } from 'zod';

import { apiMessagePost } from '@/core/http/api-message';
import { accessTokenExpirationDefinitions } from '@/shared/access-token/access-token-generation-model';
import {
  AccessTokenGenerationContractError,
  parseGeneratedAccessTokenReceipt
} from '@/shared/access-token/access-token-generation-schema';

const collectorIntakeTokenRequestSchema = z
  .object({
    collectorId: z.string().trim().min(1),
    workspaceId: z.string().trim().min(1),
    expireSeconds: z
      .number()
      .refine(value => accessTokenExpirationDefinitions.some(definition => definition.value === value))
  })
  .strict();

export type CollectorIntakeTokenRequest = z.infer<typeof collectorIntakeTokenRequestSchema>;

const collectorIntakeTokenGenerateActionUrl = '/api/account/token/collector-intake/generate';

/** Generates a managed intake token whose Collector identity is bound by the server. */
export async function generateCollectorIntakeAccessToken(value: CollectorIntakeTokenRequest) {
  const response = await apiMessagePost(buildCollectorIntakeTokenGenerationPath(value), {});
  return parseGeneratedAccessTokenReceipt(response);
}

export function buildCollectorIntakeTokenGenerationPath(value: CollectorIntakeTokenRequest) {
  const result = collectorIntakeTokenRequestSchema.safeParse(value);
  if (!result.success) throw new AccessTokenGenerationContractError();
  const params = new URLSearchParams({
    collectorId: result.data.collectorId,
    workspaceId: result.data.workspaceId,
    expireSeconds: String(result.data.expireSeconds)
  });
  return `${collectorIntakeTokenGenerateActionUrl}?${params.toString()}`;
}
