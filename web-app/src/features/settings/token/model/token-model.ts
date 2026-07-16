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

export const tokenResourceName = 'tokens';
export const tokenApiUrl = '/api/account/token';
export const tokenGenerateActionUrl = `${tokenApiUrl}/generate`;
export const tokenRevokeActionUrl = (id: number) => `${tokenApiUrl}/${id}`;

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

export type TokenListState =
  | { kind: 'loading' }
  | { kind: 'unavailable' }
  | { kind: 'error' }
  | { kind: 'empty' }
  | { kind: 'ready'; records: TokenResourceRecord[] };

export class TokenResourceContractError extends Error {
  constructor() {
    super('Token resource response is invalid');
    this.name = 'TokenResourceContractError';
  }
}

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

export function isTokenExpired(token: Pick<AuthToken, 'expireTime'>, now = Date.now()) {
  if (token.expireTime == null || token.expireTime === '') return false;
  const timestamp = typeof token.expireTime === 'number' ? token.expireTime : Date.parse(token.expireTime);
  return Number.isFinite(timestamp) && timestamp < now;
}

export function createTokenResourceRecords(value: unknown): TokenResourceRecord[] {
  if (!Array.isArray(value)) throw new TokenResourceContractError();
  return value.map(createTokenResourceRecord);
}

export function createGeneratedTokenReceipt(value: unknown): GeneratedTokenReceipt {
  if (typeof value !== 'string' || value.trim() === '') throw new TokenResourceContractError();
  return { id: 'generated', token: value };
}

export function createTokenGenerationDraft(value: unknown): TokenDraft {
  const source = readObject(value);
  const name = source.name;
  const expireSeconds = source.expireSeconds;
  const scope = source.scope;
  if (typeof name !== 'string' || name.trim() === '') throw new TokenResourceContractError();
  if (typeof expireSeconds !== 'number' || !tokenExpirationDefinitions.some(item => item.value === expireSeconds)) {
    throw new TokenResourceContractError();
  }
  if (typeof scope !== 'string' || !tokenScopeDefinitions.some(item => item.value === scope)) {
    throw new TokenResourceContractError();
  }
  return { name: name.trim(), expireSeconds, scope } as TokenDraft;
}

function createTokenResourceRecord(value: unknown): TokenResourceRecord {
  const source = readObject(value);
  const id = source.id;
  if (typeof id !== 'number' || !Number.isSafeInteger(id) || id <= 0) {
    throw new TokenResourceContractError();
  }
  return {
    id,
    name: readNullableString(source.name),
    tokenMask: readNullableTokenMask(source.tokenMask),
    tokenScope: readWireTokenScope(source.tokenScope),
    workspaceId: readNullableString(source.workspaceId),
    creator: readNullableString(source.creator),
    gmtCreate: readNullableTime(source.gmtCreate),
    expireTime: readNullableTime(source.expireTime),
    lastUsedTime: readNullableTime(source.lastUsedTime)
  };
}

function readObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TokenResourceContractError();
  return value as Record<string, unknown>;
}

function readNullableString(value: unknown) {
  if (value == null) return null;
  if (typeof value !== 'string') throw new TokenResourceContractError();
  return value;
}

function readNullableTime(value: unknown): TokenTimeValue {
  if (value == null) return null;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Date.parse(value))) return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  throw new TokenResourceContractError();
}

function readNullableTokenMask(value: unknown) {
  const mask = readNullableString(value);
  if (mask !== null && !/^.{4}\*{4}.{4}$/.test(mask)) throw new TokenResourceContractError();
  return mask;
}

function readWireTokenScope(value: unknown): TokenScope | null {
  if (value == null) return null;
  if (typeof value !== 'string') throw new TokenResourceContractError();
  return tokenScopeDefinitions.some(item => item.value === value) ? value as TokenScope : null;
}
