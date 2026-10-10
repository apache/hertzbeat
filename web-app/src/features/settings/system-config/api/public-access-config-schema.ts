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
