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

export type AccessTokenScope = 'api-admin' | 'otlp-ingest' | 'readonly-query';

export type AccessTokenGenerationDraft = {
  name: string;
  expireSeconds: number;
  scope: AccessTokenScope;
};

export type GeneratedAccessTokenReceipt = {
  id: 'generated';
  token: string;
};

export const accessTokenScopeDefinitions = [
  { value: 'api-admin', labelKey: 'token.scope.apiAdmin' },
  { value: 'otlp-ingest', labelKey: 'token.scope.otlpIngest' },
  { value: 'readonly-query', labelKey: 'token.scope.readonlyQuery' }
] as const satisfies readonly { value: AccessTokenScope; labelKey: string }[];

export const accessTokenExpirationDefinitions = [
  { value: -1, labelKey: 'token.expiration.never' },
  { value: 604_800, labelKey: 'token.expiration.days7' },
  { value: 2_592_000, labelKey: 'token.expiration.days30' },
  { value: 7_776_000, labelKey: 'token.expiration.days90' },
  { value: 15_552_000, labelKey: 'token.expiration.days180' },
  { value: 31_536_000, labelKey: 'token.expiration.days365' }
] as const;

export function isAccessTokenScope(value: unknown): value is AccessTokenScope {
  return accessTokenScopeDefinitions.some(definition => definition.value === value);
}

export function createAccessTokenGenerationDraft(scope?: string | null): AccessTokenGenerationDraft {
  return { name: '', expireSeconds: -1, scope: normalizeScope(scope) };
}

export function validateAccessTokenGenerationDraft(draft: AccessTokenGenerationDraft) {
  return draft.name.trim() ? [] : ['name'];
}

function normalizeScope(scope?: string | null): AccessTokenScope {
  const normalized = scope?.trim().toLowerCase();
  return isAccessTokenScope(normalized) ? normalized : 'api-admin';
}
