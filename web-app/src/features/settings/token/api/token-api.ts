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

import type { TokenDraft } from '../model/token-model';
import {
  parseGeneratedTokenReceipt,
  parseTokenGenerationDraft,
  parseTokenResourceRecords,
  TokenApiContractError
} from './token-schema';

export const tokenApiUrl = '/api/account/token';
export const tokenGenerateActionUrl = `${tokenApiUrl}/generate`;

export async function loadTokens() {
  const response = await apiMessageGet(tokenApiUrl);
  return parseTokenResourceRecords(response);
}

export async function generateToken(draft: TokenDraft) {
  const response = await apiMessagePost(buildGenerateTokenPath(draft), {});
  return parseGeneratedTokenReceipt(response);
}

export function revokeToken(id: number) {
  return apiMessageDelete(tokenRevokeActionUrl(id));
}

export function buildGenerateTokenPath(draft: TokenDraft) {
  const params = new URLSearchParams({
    name: draft.name.trim(),
    expireSeconds: String(draft.expireSeconds),
    scope: draft.scope
  });
  return `${tokenGenerateActionUrl}?${params.toString()}`;
}

export function tokenRevokeActionUrl(id: number) {
  return `${tokenApiUrl}/${id}`;
}

export function parseTokenRevokeActionUrl(value: string) {
  const match = /^\/api\/account\/token\/([1-9]\d*)$/.exec(value);
  if (!match?.[1]) return null;
  const id = Number(match[1]);
  return Number.isSafeInteger(id) ? id : null;
}

export { parseTokenGenerationDraft, TokenApiContractError };
