/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { z } from 'zod';

import { hasOwnProperties } from '@/shared/validation/own-properties';

import {
  tokenExpirationDefinitions,
  isTokenScope,
  type GeneratedTokenReceipt,
  type TokenDraft,
  type TokenMutationResult,
  type TokenResourceRecord,
  type TokenScope
} from '../model/token-model';

export class TokenApiContractError extends Error {
  constructor() {
    super('Token API contract is invalid');
    this.name = 'TokenApiContractError';
  }
}

const safePositiveIntegerSchema = z
  .number()
  .refine(Number.isSafeInteger)
  .refine(value => value > 0);
const nullableTextSchema = z.string().nullable();
// Spring serializes LocalDateTime as text. Numeric timestamps remain accepted
// only for compatibility with the pre-migration frontend contract.
const nullableTimestampSchema = z
  .union([z.string().refine(value => value.trim() !== '' && Number.isFinite(Date.parse(value))), z.number().finite()])
  .nullable();

const tokenWireSchema = z
  .object({
    id: safePositiveIntegerSchema,
    name: nullableTextSchema,
    tokenMask: z
      .string()
      .regex(/^.{4}\*{4}.{4}$/)
      .nullable(),
    tokenScope: nullableTextSchema,
    workspaceId: nullableTextSchema,
    tokenAudience: nullableTextSchema,
    collectorId: nullableTextSchema,
    allowedSignals: nullableTextSchema,
    status: z.number().int().min(-128).max(127).nullable(),
    creator: nullableTextSchema,
    gmtCreate: nullableTimestampSchema,
    expireTime: nullableTimestampSchema,
    lastUsedTime: nullableTimestampSchema,
    revokedTime: nullableTimestampSchema,
    revokedBy: nullableTextSchema
  })
  .strict();

const generatedTokenWireSchema = z
  .object({
    token: z.string().refine(value => value.trim() !== '')
  })
  .strict();

const tokenMutationWireSchema = z
  .object({
    id: safePositiveIntegerSchema,
    status: z.enum(['deleted', 'missing'])
  })
  .strict();

const tokenDraftInputSchema = z
  .object({
    name: z.string().refine(value => value.trim() !== ''),
    expireSeconds: z
      .number()
      .refine(value => tokenExpirationDefinitions.some(definition => definition.value === value)),
    scope: z.custom<TokenScope>(isTokenScope)
  })
  .strict();

type TokenWire = z.output<typeof tokenWireSchema>;

export function parseTokenResourceRecords(value: unknown): TokenResourceRecord[] {
  const result = z.array(tokenWireSchema).safeParse(value);
  if (!result.success) throw new TokenApiContractError();
  return result.data.map(mapTokenRecord);
}

export function parseGeneratedTokenReceipt(value: unknown): GeneratedTokenReceipt {
  const result = generatedTokenWireSchema.safeParse(value);
  if (!result.success) throw new TokenApiContractError();
  return { id: 'generated', token: result.data.token };
}

export function parseTokenMutationResponse(value: unknown): TokenMutationResult {
  const result = tokenMutationWireSchema.safeParse(value);
  if (!result.success) throw new TokenApiContractError();
  return result.data;
}

export function parseTokenGenerationDraft(value: unknown): TokenDraft {
  if (!hasOwnProperties(value, ['name', 'expireSeconds', 'scope'])) throw new TokenApiContractError();
  const result = tokenDraftInputSchema.safeParse(value);
  if (!result.success) throw new TokenApiContractError();
  return {
    name: result.data.name.trim(),
    expireSeconds: result.data.expireSeconds,
    scope: result.data.scope
  };
}

function mapTokenRecord(wire: TokenWire): TokenResourceRecord {
  return {
    id: wire.id,
    name: wire.name ?? null,
    tokenMask: wire.tokenMask ?? null,
    tokenScope: readKnownScope(wire.tokenScope),
    workspaceId: wire.workspaceId ?? null,
    tokenAudience: wire.tokenAudience,
    collectorId: wire.collectorId,
    allowedSignals: wire.allowedSignals,
    status: wire.status,
    creator: wire.creator ?? null,
    gmtCreate: wire.gmtCreate ?? null,
    expireTime: wire.expireTime ?? null,
    lastUsedTime: wire.lastUsedTime ?? null,
    revokedTime: wire.revokedTime,
    revokedBy: wire.revokedBy
  };
}

function readKnownScope(value: string | null | undefined): TokenScope | null {
  return isTokenScope(value) ? value : null;
}
