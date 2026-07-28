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
import type { TokenFailureKind } from './token-failure';
import {
  accessTokenExpirationDefinitions,
  accessTokenScopeDefinitions,
  createAccessTokenGenerationDraft,
  isAccessTokenScope,
  validateAccessTokenGenerationDraft,
  type AccessTokenGenerationDraft,
  type AccessTokenScope,
  type GeneratedAccessTokenReceipt
} from '@/shared/access-token/access-token-generation-model';

export const tokenResourceName = 'tokens';

export type TokenScope = AccessTokenScope;
export type TokenDraft = AccessTokenGenerationDraft;

type TokenTimeValue = string | null;

export type TokenResourceRecord = {
  id: number;
  name: string | null;
  tokenMask: string | null;
  tokenScope: TokenScope | null;
  workspaceId: string | null;
  tokenAudience: string | null;
  collectorId: string | null;
  allowedSignals: string | null;
  status: number | null;
  creator: string | null;
  gmtCreate: TokenTimeValue;
  expireTime: TokenTimeValue;
  lastUsedTime: TokenTimeValue;
  revokedTime: TokenTimeValue;
  revokedBy: string | null;
};

export type GeneratedTokenReceipt = GeneratedAccessTokenReceipt;

export type TokenMutationResult = {
  id: number;
  status: 'deleted' | 'missing' | 'already-revoked';
};

export type TokenGenerationRecovery = {
  phase: 'commit-uncertain';
  draft: TokenDraft;
};

export type TokenRevocationRecovery = {
  phase: 'proof';
  id: number;
};

type TokenListRemoteFailure = Exclude<TokenFailureKind, 'permission'>;
export type TokenListState =
  RemoteCollectionState<TokenResourceRecord, TokenListRemoteFailure> | { kind: 'permission' };

export const tokenScopeDefinitions = accessTokenScopeDefinitions;
export const tokenExpirationDefinitions = accessTokenExpirationDefinitions;

export function isTokenScope(value: unknown): value is TokenScope {
  return isAccessTokenScope(value);
}

export function tokenScopeLabelKey(scope: TokenScope | null | undefined) {
  if (scope === 'api-admin') return 'token.scope.apiAdmin';
  if (scope === 'otlp-ingest') return 'token.scope.otlpIngest';
  if (scope === 'readonly-query') return 'token.scope.readonlyQuery';
  return null;
}

export function createTokenDraft(scope?: string | null): TokenDraft {
  return createAccessTokenGenerationDraft(scope);
}

export function validateTokenDraft(draft: TokenDraft) {
  return validateAccessTokenGenerationDraft(draft);
}

export function isTokenExpired(token: Pick<TokenResourceRecord, 'expireTime'>, now = Date.now()) {
  if (token.expireTime == null || token.expireTime === '') return false;
  const timestamp = Date.parse(token.expireTime);
  return Number.isFinite(timestamp) && timestamp < now;
}
