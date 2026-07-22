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

const uniqueRolesSchema = z.array(z.string()).refine(roles => new Set(roles).size === roles.length);
const requiredIdentitySchema = z.string().refine(value => value.trim().length > 0);
const nullableExpirationSchema = z.union([z.string().refine(value => Number.isFinite(Date.parse(value))), z.null()]);

// Session responses are a security boundary. Strict objects reject accidental
// credential or token fields instead of silently stripping them.
const authenticatedSessionSchema = z
  .object({
    authenticated: z.literal(true),
    username: requiredIdentitySchema,
    roles: uniqueRolesSchema,
    workspaceId: requiredIdentitySchema,
    expiresAt: nullableExpirationSchema
  })
  .strict();

const anonymousSessionSchema = z
  .object({
    authenticated: z.literal(false),
    username: z.null(),
    roles: z.tuple([]),
    workspaceId: z.null(),
    expiresAt: z.null()
  })
  .strict();

export type UiSession = {
  authenticated: boolean;
  username: string | null;
  roles: string[];
  workspaceId: string | null;
  expiresAt: string | null;
};

export const uiSessionSchema: z.ZodType<UiSession> = z.discriminatedUnion('authenticated', [
  authenticatedSessionSchema,
  anonymousSessionSchema
]);

export const sessionEnvelopeSchema = z
  .object({
    code: z.number().int(),
    data: z.unknown(),
    msg: z.string().nullable().optional()
  })
  .strict();

export type SessionEnvelope = z.output<typeof sessionEnvelopeSchema>;

export const anonymousSession: UiSession = {
  authenticated: false,
  username: null,
  roles: [],
  workspaceId: null,
  expiresAt: null
};
