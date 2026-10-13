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
import { apiMessagePost } from '@/core/http/api-message';
import type { AgentProviderInput, AgentProviderModelCatalog } from '../model/agent-provider-contract';

const agentProviderModelsPath = '/api/agent/model-providers/models';
const catalog = z
  .object({
    status: z.enum([
      'ready',
      'unsupported',
      'authentication-failed',
      'unavailable',
      'invalid-input',
      'invalid-response'
    ]),
    models: z.array(z.object({ id: z.string().min(1), name: z.string() }).strict()),
    truncated: z.boolean()
  })
  .strict();

export async function discoverAgentProviderModels(
  input: AgentProviderInput,
  signal: AbortSignal
): Promise<AgentProviderModelCatalog> {
  return catalog.parse(await apiMessagePost(agentProviderModelsPath, input, { signal }));
}
