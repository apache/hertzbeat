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

import type { AuthToken, TokenDraft, TokenScope } from '../api/token-api';

export { buildGenerateTokenPath } from '../api/token-api';
export type { AuthToken, TokenDraft, TokenScope };

export const tokenScopeDefinitions = [
  { value: 'api-admin', labelKey: 'token.scope.apiAdmin' },
  { value: 'otlp-ingest', labelKey: 'token.scope.otlpIngest' },
  { value: 'readonly-query', labelKey: 'token.scope.readonlyQuery' }
] as const satisfies readonly { value: TokenScope; labelKey: string }[];

export const tokenExpirationDefinitions = [
  { value: -1, labelKey: 'token.expiration.never' },
  { value: 604_800, labelKey: 'token.expiration.days7' },
  { value: 2_592_000, labelKey: 'token.expiration.days30' },
  { value: 7_776_000, labelKey: 'token.expiration.days90' },
  { value: 15_552_000, labelKey: 'token.expiration.days180' },
  { value: 31_536_000, labelKey: 'token.expiration.days365' }
] as const;

function normalizeTokenScope(scope?: string | null): TokenScope {
  const normalized = scope?.trim().toLowerCase();
  return tokenScopeDefinitions.some(definition => definition.value === normalized)
    ? normalized as TokenScope
    : 'api-admin';
}

export function createTokenDraft(scope?: string | null): TokenDraft {
  return { name: '', expireSeconds: -1, scope: normalizeTokenScope(scope) };
}

export function validateTokenDraft(draft: TokenDraft) {
  return draft.name.trim() ? [] : ['name'];
}

export function isTokenExpired(token: Pick<AuthToken, 'expireTime'>, now = Date.now()) {
  if (token.expireTime == null || token.expireTime === '') return false;
  const timestamp = typeof token.expireTime === 'number' ? token.expireTime : Date.parse(token.expireTime);
  return Number.isFinite(timestamp) && timestamp < now;
}
