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

import { apiMessageDelete, apiMessageGet, apiMessagePost } from '@/core/http/api-message';

export type TokenScope = 'api-admin' | 'otlp-ingest' | 'readonly-query';

export type AuthToken = {
  id: number;
  name?: string | null;
  tokenMask?: string | null;
  tokenScope?: string | null;
  creator?: string | null;
  gmtCreate?: string | number | null;
  expireTime?: string | number | null;
  lastUsedTime?: string | number | null;
};

export type TokenDraft = {
  name: string;
  expireSeconds: number;
  scope: TokenScope;
};

export function loadTokens() {
  return apiMessageGet<AuthToken[]>('/api/account/token');
}

export async function generateToken(draft: TokenDraft) {
  const result = await apiMessagePost<{ token?: string }>(buildGenerateTokenPath(draft), {});
  return result.token ?? '';
}

export function revokeToken(id: number) {
  return apiMessageDelete<unknown>(`/api/account/token/${id}`);
}

export function buildGenerateTokenPath(draft: TokenDraft) {
  const params = new URLSearchParams({
    name: draft.name.trim(),
    expireSeconds: String(draft.expireSeconds),
    scope: draft.scope
  });
  return `/api/account/token/generate?${params.toString()}`;
}
