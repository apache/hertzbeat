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

import {
  AccessTokenGenerationContractError,
  parseAccessTokenGenerationDraft,
  parseGeneratedAccessTokenReceipt
} from '@/shared/access-token/access-token-generation-schema';

import {
  isTokenScope,
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

const tokenMutationWireSchema = z
  .object({
    id: safePositiveIntegerSchema,
    status: z.enum(['deleted', 'missing'])
  })
  .strict();

type TokenWire = z.output<typeof tokenWireSchema>;

export function parseTokenResourceRecords(value: unknown): TokenResourceRecord[] {
  const result = z.array(tokenWireSchema).safeParse(value);
  if (!result.success) throw new TokenApiContractError();
  return result.data.map(mapTokenRecord);
}

export const parseGeneratedTokenReceipt = adaptGenerationContract(parseGeneratedAccessTokenReceipt);

export function parseTokenMutationResponse(value: unknown): TokenMutationResult {
  const result = tokenMutationWireSchema.safeParse(value);
  if (!result.success) throw new TokenApiContractError();
  return result.data;
}

export const parseTokenGenerationDraft = adaptGenerationContract(parseAccessTokenGenerationDraft);

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

function adaptGenerationContract<T>(parser: (value: unknown) => T) {
  return (value: unknown): T => {
    try {
      return parser(value);
    } catch (reason) {
      if (reason instanceof AccessTokenGenerationContractError) throw new TokenApiContractError();
      throw reason;
    }
  };
}
