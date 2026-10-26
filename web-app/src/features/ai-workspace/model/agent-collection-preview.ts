/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
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

const printable = (max: number) =>
  z
    .string()
    .min(1)
    .max(max)
    .refine(value =>
      Array.from(value).every(char => char.charCodeAt(0) >= 32 || [10, 13, 9].includes(char.charCodeAt(0)))
    );
export const agentCollectionPreviewSchema = z.strictObject({
  version: z.literal('inline-collection.v1'),
  planId: z.string().regex(/^[a-f0-9-]{36}$/),
  monitorId: z.number().int().positive(),
  sourceRevision: z.string().regex(/^[a-f0-9]{64}$/),
  planHash: z.string().regex(/^[a-f0-9]{64}$/),
  collector: z.literal('main-default-collector'),
  operatingSystem: printable(100),
  account: printable(100),
  directory: printable(4096).refine(value => value.startsWith('/')),
  argv: z.tuple([z.literal('bash'), z.literal('-c'), printable(16384)]),
  oneShot: z.literal(true),
  expiresAt: z.number().int().positive()
});
export type AgentCollectionPreview = z.infer<typeof agentCollectionPreviewSchema>;
export function isAgentCollectionPreview(value: unknown): value is AgentCollectionPreview {
  return agentCollectionPreviewSchema.safeParse(value).success;
}
