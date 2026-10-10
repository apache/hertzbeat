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

import { apiMessagePost } from '@/core/http/api-message';

import type { CollectorDeployInfo } from '../model/collector-deploy-model';
import { collectorEndpoint, normalizeCollectorId } from './collector-management-api';

const collectorDeployInfoSchema = z
  .object({
    identity: z.string(),
    host: z
      .string()
      .refine(value => value.length > 0 && value === value.trim())
      .refine(value => !/\p{Cc}/u.test(value))
  })
  .strict();

export class CollectorDeployContractError extends Error {
  constructor() {
    super('Collector deployment response was invalid');
    this.name = 'CollectorDeployContractError';
  }
}

export async function generateCollectorDeployInfo(
  collector: string,
  signal?: AbortSignal
): Promise<CollectorDeployInfo> {
  const collectorId = normalizeCollectorId(collector);
  const value = await apiMessagePost(
    `${collectorEndpoint}/generate/${encodeURIComponent(collectorId)}`,
    null,
    signal ? { signal } : undefined
  );
  signal?.throwIfAborted();
  const result = collectorDeployInfoSchema.safeParse(value);
  if (!result.success || result.data.identity !== collectorId) throw new CollectorDeployContractError();
  return result.data;
}
