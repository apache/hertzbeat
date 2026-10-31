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

import { apiMessageDelete, apiMessagePost } from '@/core/http/api-message';

import type { ProviderTestResult } from '../model/agent-provider-test-contract';
import type { AgentProviderInput } from '../model/agent-workspace-contract';

const path = '/api/agent/model-providers/connection-tests';
const resultSchema = z
  .object({
    protocol: z.string().nullable(),
    model: z.string().nullable(),
    elapsedMs: z.number().nonnegative(),
    category: z.enum([
      'OK',
      'CONFIGURATION',
      'CREDENTIAL_REQUIRED',
      'AUTHENTICATION',
      'ADDRESS_PATH',
      'MODEL',
      'PROTOCOL',
      'TIMEOUT',
      'CANCELLED',
      'BUSY',
      'RATE_LIMIT',
      'UPSTREAM',
      'TLS',
      'NETWORK'
    ]),
    httpStatus: z.number().int().nullable()
  })
  .strict();

export async function testAgentProvider(
  requestId: string,
  config: AgentProviderInput,
  signal: AbortSignal
): Promise<ProviderTestResult> {
  return resultSchema.parse(await apiMessagePost(path, { requestId, config }, { signal }));
}

export async function cancelAgentProviderTest(requestId: string): Promise<void> {
  await apiMessageDelete(`${path}/${encodeURIComponent(requestId)}`, { signal: AbortSignal.timeout(3000) });
}
