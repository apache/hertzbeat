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

import { apiMessagePost } from '@/core/http/api-message';

import type { AccessTokenGenerationDraft } from './access-token-generation-model';
import { parseAccessTokenGenerationDraft, parseGeneratedAccessTokenReceipt } from './access-token-generation-schema';

export const accessTokenGenerateActionUrl = '/api/account/token/generate';

export async function generateAccessToken(value: AccessTokenGenerationDraft) {
  const draft = parseAccessTokenGenerationDraft(value);
  const response = await apiMessagePost(buildAccessTokenGenerationPath(draft), {});
  return parseGeneratedAccessTokenReceipt(response);
}

export function buildAccessTokenGenerationPath(draft: AccessTokenGenerationDraft) {
  const params = new URLSearchParams({
    name: draft.name.trim(),
    expireSeconds: String(draft.expireSeconds),
    scope: draft.scope
  });
  return `${accessTokenGenerateActionUrl}?${params.toString()}`;
}
