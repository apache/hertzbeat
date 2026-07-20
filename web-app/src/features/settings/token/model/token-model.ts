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

import type { RemoteCollectionState } from '@/shared/remote-state';

export const tokenResourceName = 'tokens';

export type TokenScope = 'api-admin' | 'otlp-ingest' | 'readonly-query';

export type TokenDraft = {
  name: string;
  expireSeconds: number;
  scope: TokenScope;
};

type TokenTimeValue = string | number | null;

export type TokenResourceRecord = {
  id: number;
  name: string | null;
  tokenMask: string | null;
  tokenScope: TokenScope | null;
  workspaceId: string | null;
  creator: string | null;
  gmtCreate: TokenTimeValue;
  expireTime: TokenTimeValue;
  lastUsedTime: TokenTimeValue;
};

export type GeneratedTokenReceipt = {
  id: 'generated';
  token: string;
};

export type TokenGenerationRecovery = {
  phase: 'commit-uncertain';
  draft: TokenDraft;
};

export type TokenRevocationRecovery = {
  phase: 'proof';
  id: number;
};

export type TokenListState = RemoteCollectionState<TokenResourceRecord, 'unavailable' | 'error'>;

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
    ? (normalized as TokenScope)
    : 'api-admin';
}

export function tokenScopeLabelKey(scope: TokenScope | null | undefined) {
  if (scope === 'api-admin') return 'token.scope.apiAdmin';
  if (scope === 'otlp-ingest') return 'token.scope.otlpIngest';
  if (scope === 'readonly-query') return 'token.scope.readonlyQuery';
  return null;
}

export function createTokenDraft(scope?: string | null): TokenDraft {
  return { name: '', expireSeconds: -1, scope: normalizeTokenScope(scope) };
}

export function validateTokenDraft(draft: TokenDraft) {
  return draft.name.trim() ? [] : ['name'];
}

export function isTokenExpired(token: Pick<TokenResourceRecord, 'expireTime'>, now = Date.now()) {
  if (token.expireTime == null || token.expireTime === '') return false;
  const timestamp = typeof token.expireTime === 'number' ? token.expireTime : Date.parse(token.expireTime);
  return Number.isFinite(timestamp) && timestamp < now;
}
